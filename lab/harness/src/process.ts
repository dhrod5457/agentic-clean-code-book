import { spawn } from 'node:child_process';
import { closeSync, mkdirSync, openSync, writeSync } from 'node:fs';
import path from 'node:path';

// process 하나를 실행하고 표준 출력 · 오류를 바이트 그대로 파일에 쓴다.
// 시간 제한을 넘으면 process group 에 SIGTERM, 유예 뒤 SIGKILL 을 보낸다. 끝난 뒤 group 에 남은 process 도 종료한다.

export interface Clock {
  wall(): number;
  mono(): number;
}

export const systemClock: Clock = { wall: () => Date.now(), mono: () => performance.now() };

// wall 시각 경과가 monotonic 경과보다 이만큼 길면 host 가 잠들었던 것으로 본다(실행 계약 §6.3)
export const SUSPEND_THRESHOLD_MS = 60_000;

export function isSuspended(wallMs: number, monoMs: number): boolean {
  return wallMs - monoMs > SUSPEND_THRESHOLD_MS;
}

export interface ProcessResult {
  exit_code: number | null;
  signal: string | null;
  timed_out: boolean;
  spawn_error: string | null;
  started_at: string;
  ended_at: string;
  wall_ms: number;
  mono_ms: number;
  suspended: boolean;
}

export interface ProcessOptions {
  cmd: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
  stdoutPath: string;
  stderrPath: string;
  // 지정하면 stdout 줄마다 { line, at } 을 이 파일에 쓴다. 원본 stdout 은 바꾸지 않는다
  recvPath?: string;
  timeoutMs: number;
  graceMs: number;
  clock?: Clock;
}

export function runProcess(o: ProcessOptions): Promise<ProcessResult> {
  const clock = o.clock ?? systemClock;
  for (const p of [o.stdoutPath, o.stderrPath, o.recvPath]) if (p) mkdirSync(path.dirname(p), { recursive: true });
  const out = openSync(o.stdoutPath, 'w');
  const err = openSync(o.stderrPath, 'w');
  const recv = o.recvPath ? openSync(o.recvPath, 'w') : null;
  const wall0 = clock.wall();
  const mono0 = clock.mono();

  return new Promise((resolve) => {
    let exitCode: number | null = null;
    let signal: string | null = null;
    let timedOut = false;
    let spawnError: string | null = null;
    let lines = 0;
    let pendingLine = false;
    let graceTimer: NodeJS.Timeout | undefined;
    let drainTimer: NodeJS.Timeout | undefined;
    let done = false;

    const child = spawn(o.cmd, o.args, { cwd: o.cwd, env: o.env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });

    const killGroup = (sig: NodeJS.Signals) => {
      if (child.pid === undefined) return;
      try {
        process.kill(-child.pid, sig);
      } catch {
        // group 이 이미 없다
      }
    };

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(killTimer);
      clearTimeout(graceTimer);
      clearTimeout(drainTimer);
      if (recv !== null && pendingLine) writeSync(recv, `${JSON.stringify({ line: ++lines, at: new Date(clock.wall()).toISOString() })}\n`);
      for (const fd of [out, err, recv]) if (fd !== null) closeSync(fd);
      const wall1 = clock.wall();
      const mono1 = clock.mono();
      const wallMs = wall1 - wall0;
      const monoMs = Math.round(mono1 - mono0);
      resolve({
        exit_code: exitCode,
        signal,
        timed_out: timedOut,
        spawn_error: spawnError,
        started_at: new Date(wall0).toISOString(),
        ended_at: new Date(wall1).toISOString(),
        wall_ms: wallMs,
        mono_ms: monoMs,
        suspended: isSuspended(wallMs, monoMs),
      });
    };

    let exited = false;
    const killTimer = setTimeout(() => {
      // 판정을 다음 check 단계로 미룬다. 그사이 poll 단계에서 이미 끝난 process 의 exit 이 처리되면 시간 초과로 보지 않는다.
      // 같은 시각에 끝난 경우를 모두 없애지는 못한다(실행 계약 §10)
      setImmediate(() => {
        if (exited) return;
        timedOut = true;
        killGroup('SIGTERM');
        graceTimer = setTimeout(() => killGroup('SIGKILL'), o.graceMs);
      });
    }, o.timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      writeSync(out, chunk);
      if (recv === null) return;
      const at = new Date(clock.wall()).toISOString();
      for (const b of chunk) if (b === 10) writeSync(recv, `${JSON.stringify({ line: ++lines, at })}\n`);
      pendingLine = chunk[chunk.length - 1] !== 10;
    });
    child.stderr.on('data', (chunk: Buffer) => writeSync(err, chunk));

    child.on('error', (e) => {
      spawnError = e.message;
      // 시작하지 못한 process 는 close 를 보내지 않을 수 있다
      if (child.pid === undefined) finish();
    });
    child.on('exit', (code, sig) => {
      exited = true;
      exitCode = code;
      signal = sig;
      clearTimeout(killTimer);
      clearTimeout(graceTimer);
      // 끝난 process 가 남긴 자식이 stdout 을 붙잡고 있으면 close 가 오지 않는다
      killGroup('SIGKILL');
      // group 밖으로 나간 자식(setsid)은 위 signal 이 닿지 않는다. 유예 뒤에는 stream 을 닫고 끝낸다
      drainTimer = setTimeout(() => {
        child.stdout.destroy();
        child.stderr.destroy();
        finish();
      }, o.graceMs);
    });
    child.on('close', finish);
  });
}
