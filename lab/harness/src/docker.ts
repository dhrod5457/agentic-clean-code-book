import { execFile } from 'node:child_process';
import type { ExecConfig } from './config.ts';
import type { Probe } from './fingerprint.ts';

// 컨테이너 실행 인자. 연결 경로와 환경 변수는 실행 계약 §3, §4.3 이 기준이다

export const CONTAINER = {
  workspace: '/work/shop-admin',
  claudeConfig: '/home/agent/.claude',
  hooksOut: '/home/agent/hooks-out',
  cc: '/opt/cc',
  grading: '/opt/grading',
  gradingLog: '/opt/grading-log',
} as const;

// 컨테이너 안에서 settings 파일 경로. lab/harness/config/cc 가 /opt/cc 로 연결된다
export function containerSettingsPath(config: ExecConfig): string | null {
  if (config.agent.settings_file === null) return null;
  return `${CONTAINER.cc}/${config.agent.settings_file.split('/').at(-1)}`;
}

// 값은 docker client 의 환경 변수로 넘기고 인자에는 이름만 둔다. token 이 process 목록과 실행 기록에 남지 않게 한다
export function envFlags(env: Record<string, string>): string[] {
  return Object.keys(env).sort().flatMap((k) => ['-e', k]);
}

export function resourceFlags(config: ExecConfig): string[] {
  return ['--cpus', String(config.environment.cpus), '--memory', config.environment.memory, '--memory-swap', config.environment.memory];
}

export function agentRunArgs(o: {
  config: ExecConfig;
  name: string;
  workspace: string;
  claudeConfigDir: string;
  hooksOutDir: string;
  ccDir: string;
  env: Record<string, string>;
  command: string[];
}): string[] {
  return [
    'run', '--name', o.name, '--hostname', o.name,
    // start.sh 가 egress 를 제한한 뒤 권한을 버리고 agent 로 실행한다
    '--cap-add', 'NET_ADMIN', '--cap-add', 'NET_RAW',
    ...resourceFlags(o.config),
    '-w', CONTAINER.workspace,
    '-v', `${o.workspace}:${CONTAINER.workspace}`,
    '-v', `${o.claudeConfigDir}:${CONTAINER.claudeConfig}`,
    '-v', `${o.hooksOutDir}:${CONTAINER.hooksOut}`,
    '-v', `${o.ccDir}:${CONTAINER.cc}:ro`,
    ...envFlags(o.env),
    o.config.environment.image!,
    ...o.command,
  ];
}

// 채점은 같은 이미지에서 agent 사용자로 실행한다. 의존성 cache 층이 생기기 전(체크리스트 7단계)에는 네트워크를 연다
export function gradingRunArgs(o: {
  config: ExecConfig;
  name: string;
  workspace: string;
  gradingDir: string;
  logDir: string;
  env: Record<string, string>;
  port: number;
  suite: string;
}): string[] {
  return [
    'run', '--name', o.name, '--entrypoint', '', '--user', 'agent',
    ...resourceFlags(o.config),
    '-v', `${o.workspace}:${CONTAINER.workspace}`,
    '-v', `${o.gradingDir}:${CONTAINER.grading}:ro`,
    '-v', `${o.logDir}:${CONTAINER.gradingLog}`,
    ...envFlags(o.env),
    o.config.environment.image!,
    `${CONTAINER.grading}/run.sh`, CONTAINER.workspace, String(o.port), o.suite,
  ];
}

function docker(args: string[], timeoutMs = 60_000): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile('docker', args, { timeout: timeoutMs }, (e, stdout, stderr) => {
      resolve({ code: e === null ? 0 : typeof e.code === 'number' ? e.code : null, stdout, stderr });
    });
  });
}

export interface ContainerState {
  found: boolean;
  running: boolean;
  exit_code: number | null;
  oom_killed: boolean;
  error: string;
}

export async function inspectContainer(name: string): Promise<ContainerState> {
  const r = await docker(['inspect', name, '--format', '{{json .State}}']);
  if (r.code !== 0) return { found: false, running: false, exit_code: null, oom_killed: false, error: r.stderr.trim() };
  const s = JSON.parse(r.stdout) as { Running: boolean; ExitCode: number; OOMKilled: boolean; Error: string };
  return { found: true, running: s.Running, exit_code: s.ExitCode, oom_killed: s.OOMKilled, error: s.Error };
}

export async function removeContainer(name: string): Promise<void> {
  await docker(['rm', '-f', name]);
}

// 이미지 안에서 도구 버전을 읽는다. 네트워크 제한 · 권한 낮춤 없이 agent 사용자로 실행한다
export function imageProbe(image: string): Probe {
  return async (argv) => {
    const r = await docker(['run', '--rm', '--network', 'none', '--entrypoint', '', '--user', 'agent', image, ...argv]);
    return { exit_code: r.code, output: `${r.stdout}${r.stderr}`, error: r.code === null ? 'docker 실행 실패' : null };
  };
}
