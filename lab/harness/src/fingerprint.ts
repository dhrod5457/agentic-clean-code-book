import { execFile, execFileSync } from 'node:child_process';
import { hostname, loadavg, release, type as osType, arch } from 'node:os';
import { sha256 } from './config.ts';

// environment fingerprint. 기준은 실행 계약 §9.1.
// docker 실행에서는 probe 가 Agent 와 같은 이미지의 별도 컨테이너에서 명령을 실행한다. local 실행은 harness 기계에서 실행한다

export interface ProbeResult {
  exit_code: number | null;
  output: string;
  error: string | null;
}

export type Probe = (argv: string[]) => Promise<ProbeResult>;

export const localProbe: Probe = (argv) =>
  new Promise((resolve) => {
    execFile(argv[0], argv.slice(1), { timeout: 20_000 }, (e, stdout, stderr) => {
      const code = e === null ? 0 : typeof e.code === 'number' ? e.code : null;
      resolve({ exit_code: code, output: `${stdout}${stderr}`, error: e === null || typeof e.code === 'number' ? null : e.message });
    });
  });

export const TOOLS = ['java', 'node', 'pnpm', 'claude'] as const;
export type Tool = (typeof TOOLS)[number];

export function toolArgv(tool: Tool, claudeExecutable: string): string[] {
  if (tool === 'java') return ['java', '-version'];
  if (tool === 'claude') return [claudeExecutable, '--version'];
  return [tool, '--version'];
}

export function extractVersion(tool: Tool, output: string): string | null {
  const m = tool === 'java' ? /version "([^"]+)"/.exec(output) : /(\d+\.\d+\.\d+)/.exec(output);
  return m ? m[1] : null;
}

export function git(labRoot: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', labRoot, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

// harness · 채점 · 과제 코드(lab/)의 미commit 변경. 없으면 빈 문자열, 확인할 수 없으면 null
export function labChanges(labRoot: string): string | null {
  return git(labRoot, ['status', '--porcelain', '--', 'lab']);
}

// host 는 harness 를 실행한 기계, agent_env 는 Agent 가 실행되는 환경(컨테이너 단계에서는 컨테이너 안)의 값이다
export interface RawFingerprint {
  host: {
    os_type: string;
    os_release: string;
    arch: string;
    machine_id: string;
    load_avg_1m: number;
    node_version: string;
    // docker 실행일 때 Docker Engine · Desktop 버전과 VM 의 kernel · CPU · 메모리. 읽지 못하면 오류 문구
    docker: { desktop: string | null; engine: string; kernel: string; os: string; cpus: number; memory_bytes: number } | { error: string } | null;
  };
  harness: { commit: string | null; lab_dirty: boolean | null };
  agent_env: Record<Tool, ProbeResult & { argv: string[] }>;
}

function dockerHost(): RawFingerprint['host']['docker'] {
  try {
    const run = (args: string[]) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000 });
    const info = JSON.parse(run(['info', '--format', '{{json .}}'])) as { ServerVersion: string; KernelVersion: string; OperatingSystem: string; NCPU: number; MemTotal: number };
    const platform = JSON.parse(run(['version', '--format', '{{json .Server.Platform}}'])) as { Name?: string } | null;
    return { desktop: platform?.Name ?? null, engine: info.ServerVersion, kernel: info.KernelVersion, os: info.OperatingSystem, cpus: info.NCPU, memory_bytes: info.MemTotal };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function collectFingerprint(probe: Probe, claudeExecutable: string, labRoot: string, docker = false): Promise<RawFingerprint> {
  const tools = {} as RawFingerprint['agent_env'];
  for (const tool of TOOLS) {
    const argv = toolArgv(tool, claudeExecutable);
    tools[tool] = { argv, ...(await probe(argv)) };
  }
  const changes = labChanges(labRoot);
  return {
    host: {
      os_type: osType(),
      os_release: release(),
      arch: arch(),
      machine_id: sha256(hostname()).slice(0, 12),
      load_avg_1m: Math.round(loadavg()[0] * 100) / 100,
      node_version: process.version,
      docker: docker ? dockerHost() : null,
    },
    harness: { commit: git(labRoot, ['rev-parse', 'HEAD']), lab_dirty: changes === null ? null : changes !== '' },
    agent_env: tools,
  };
}
