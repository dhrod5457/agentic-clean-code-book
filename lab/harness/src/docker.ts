import { execFile, spawn } from 'node:child_process';
import { closeSync, openSync, readFileSync } from 'node:fs';
import type { ExecConfig } from './config.ts';
import type { Probe } from './fingerprint.ts';

// 컨테이너 실행 인자. 연결 경로와 환경 변수는 실행 계약 §3, §4.3 이 기준이다

export const CONTAINER = {
  workspace: '/work/shop-admin',
  claudeConfig: '/home/agent/.claude',
  hooksOut: '/opt/cc-out',
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

// 채점은 같은 이미지에서 agent 사용자로 실행한다. 네트워크는 실행 설정의 environment.grading_network 다
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
    'run', '--name', o.name, '--entrypoint', '', '--user', 'agent', '--network', o.config.environment.grading_network,
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

// 시작 스크립트(image/start.sh)가 외부 통신 제한을 설정하지 못하고 끝난 종료 코드
export const START_FAILED_EXIT = 90;

export interface ContainerState {
  found: boolean;
  running: boolean;
  // 컨테이너 process 가 시작됐는지(StartedAt 이 0 시각이 아님). 생성만 되고 시작하지 못한 컨테이너는 false
  started: boolean;
  exit_code: number | null;
  oom_killed: boolean;
  error: string;
  // Docker 가 "없는 컨테이너" 가 아닌 이유로 inspect 에 답하지 못한 경우의 오류. 답했으면 null
  inspect_error: string | null;
}

// "없는 컨테이너" 는 found:false 다. 그 밖의 실패(daemon 무응답 등)는 3번 시도한 뒤 inspect_error 로 돌려준다
export async function inspectContainer(name: string): Promise<ContainerState> {
  let stderr = '';
  for (let i = 0; i < 3; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 2000));
    const r = await docker(['inspect', name, '--format', '{{json .State}}']);
    if (r.code === 0) {
      const s = JSON.parse(r.stdout) as { Running: boolean; ExitCode: number; OOMKilled: boolean; Error: string; StartedAt: string };
      return { found: true, running: s.Running, started: !s.StartedAt.startsWith('0001-'), exit_code: s.ExitCode, oom_killed: s.OOMKilled, error: s.Error, inspect_error: null };
    }
    stderr = r.stderr.trim();
    if (/No such (object|container)/i.test(stderr)) return { found: false, running: false, started: false, exit_code: null, oom_killed: false, error: '', inspect_error: null };
  }
  return { found: false, running: false, started: false, exit_code: null, oom_killed: false, error: '', inspect_error: stderr || 'docker inspect 실패' };
}

export interface SettledContainer extends Omit<ContainerState, 'running'> {
  // docker client 가 끝난 뒤에도 컨테이너가 실행 중이었는지. harness 시간 초과가 아니면 외부 원인이다
  running_after_client: boolean;
  // 컨테이너 실행 전후로 Docker VM 의 boot id 가 바뀌었는지(VM 재시작). 어느 쪽이든 읽지 못하면 null
  vm_restarted: boolean | null;
}

// Docker VM 의 boot id. VM 이 다시 시작되면 바뀐다. 읽지 못하면 null
async function vmBootId(image: string): Promise<string | null> {
  const r = await docker(['run', '--rm', '--network', 'none', '--entrypoint', '', image, 'cat', '/proc/sys/kernel/random/boot_id']);
  return r.code === 0 ? r.stdout.trim() : null;
}

export interface ContainerWatch {
  image: string;
  bootId: string | null;
  eventsPath: string;
  stop: () => void;
}

// 컨테이너를 실행하기 전에 부른다. VM boot id 를 읽고, 그 컨테이너의 docker events 를 받기 시작한다.
// 끝난 뒤 --since 로 조회하면 daemon 이 보관하는 최근 기록(256건)에서 잘리므로 실행 내내 받는다
export async function watchContainer(name: string, image: string, eventsPath: string): Promise<ContainerWatch> {
  const bootId = await vmBootId(image);
  const fd = openSync(eventsPath, 'a');
  const p = spawn('docker', ['events', '--filter', `container=${name}`, '--format', '{{json .}}'], { stdio: ['ignore', fd, fd] });
  closeSync(fd);
  // 예외로 stop 을 부르지 못해도 harness process 가 끝날 수 있게 한다
  p.unref();
  // docker events 가 구독을 시작하기 전에 생긴 기록은 받지 못한다
  await new Promise((r) => setTimeout(r, 500));
  return { image, bootId, eventsPath, stop: () => p.kill() };
}

// docker client 가 끝난 뒤 컨테이너를 정리한다. 실행 중이면 끝내고 종료 코드를 기다린 뒤 상태를 읽고, 컨테이너를 지운다.
// 지운 기록(destroy)이 events 에 들어오면(최대 3초) 받기를 멈추고 VM boot id 를 다시 읽는다
export async function settleContainer(name: string, watch: ContainerWatch): Promise<SettledContainer> {
  let s = await inspectContainer(name);
  const runningAfterClient = s.running;
  if (runningAfterClient) {
    await docker(['kill', name]);
    await docker(['wait', name]);
    s = await inspectContainer(name);
  }
  await removeContainer(name);
  for (let i = 0; i < 30 && s.found && !readFileSync(watch.eventsPath, 'utf8').includes('"Action":"destroy"'); i++) await new Promise((r) => setTimeout(r, 100));
  watch.stop();
  const bootAfter = await vmBootId(watch.image);
  const { running: _, ...rest } = s;
  return { ...rest, running_after_client: runningAfterClient, vm_restarted: watch.bootId === null || bootAfter === null ? null : watch.bootId !== bootAfter };
}

// 실행 ID 가 이름에 들어 있는 컨테이너(Agent r-<run_id>, 채점 g-<run_id>-…). 재채점 전에 남은 것이 없는지 본다
export async function containersOf(runId: string): Promise<string[]> {
  const r = await docker(['ps', '-a', '--filter', `name=${runId}`, '--format', '{{.Names}}']);
  if (r.code !== 0) throw new Error(`docker ps 실패: ${r.stderr.trim()}`);
  return r.stdout.split('\n').filter((n) => n !== '');
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
