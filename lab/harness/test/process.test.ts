import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { runProcess, type Clock } from '../src/process.ts';
import { tmp, writeScript } from './helpers.ts';

function opts(dir: string, script: string, timeoutMs: number) {
  return {
    cmd: script, args: [], cwd: dir, env: { PATH: process.env.PATH ?? '' },
    stdoutPath: path.join(dir, 'out'), stderrPath: path.join(dir, 'err'), recvPath: path.join(dir, 'recv'),
    timeoutMs, graceMs: 300,
  };
}

// 종료됐지만 아직 회수되지 않은 zombie 는 죽은 것으로 본다. init 없이 node 가 PID 1 인 컨테이너에서는 zombie 가 회수되지 않고 남는다
function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
  } catch {
    return false;
  }
  const state = existsSync(`/proc/${pid}/stat`)
    ? readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').at(-1)?.[0]
    : spawnSync('ps', ['-o', 'stat=', '-p', String(pid)], { encoding: 'utf8' }).stdout.trim()[0];
  return state !== 'Z';
}

test('stdout 은 바이트 그대로 저장하고 수신 시각은 줄마다 별도 파일에 쓴다', async () => {
  const dir = tmp();
  const script = writeScript(path.join(dir, 'p'), "printf 'a\\n{\"b\":1}\\nno-newline'; echo oops >&2; exit 3");
  const r = await runProcess(opts(dir, script, 5000));
  assert.equal(r.exit_code, 3);
  assert.equal(r.timed_out, false);
  assert.equal(readFileSync(path.join(dir, 'out'), 'utf8'), 'a\n{"b":1}\nno-newline');
  assert.equal(readFileSync(path.join(dir, 'err'), 'utf8'), 'oops\n');
  const recv = readFileSync(path.join(dir, 'recv'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { line: number });
  assert.deepEqual(recv.map((r) => r.line), [1, 2, 3]);
});

test('시간 제한을 넘으면 SIGTERM 을 무시하는 process 와 그 자식까지 종료한다', async () => {
  const dir = tmp();
  const pidFile = path.join(dir, 'child.pid');
  const script = writeScript(path.join(dir, 'p'), `trap '' TERM; (trap '' TERM; sleep 30) & echo $! > "${pidFile}"; sleep 30`);
  const started = Date.now();
  const r = await runProcess(opts(dir, script, 500));
  assert.equal(r.timed_out, true);
  assert.equal(r.signal, 'SIGKILL');
  assert.ok(Date.now() - started < 5000, '유예 뒤 SIGKILL 로 끝나야 한다');
  assert.equal(alive(Number(readFileSync(pidFile, 'utf8'))), false, '자식 process 가 남으면 안 된다');
});

test('정상 종료한 process 가 남긴 백그라운드 자식도 종료한다', async () => {
  const dir = tmp();
  const pidFile = path.join(dir, 'child.pid');
  const script = writeScript(path.join(dir, 'p'), `sleep 30 & echo $! > "${pidFile}"; exit 0`);
  const r = await runProcess(opts(dir, script, 5000));
  assert.equal(r.exit_code, 0);
  assert.equal(r.timed_out, false);
  assert.equal(alive(Number(readFileSync(pidFile, 'utf8'))), false);
});

test('실행 파일이 없으면 spawn_error 로 끝난다', async () => {
  const dir = tmp();
  const r = await runProcess(opts(dir, path.join(dir, 'missing'), 5000));
  assert.match(r.spawn_error ?? '', /ENOENT/);
  assert.equal(r.exit_code, null);
});

test('wall 시각이 monotonic 시각보다 60초 넘게 앞서면 잠자기로 표시한다', async () => {
  const dir = tmp();
  const script = writeScript(path.join(dir, 'p'), 'exit 0');
  let calls = 0;
  const jumping: Clock = { wall: () => Date.now() + calls++ * 61_000, mono: () => performance.now() };
  const steady: Clock = { wall: () => Date.now(), mono: () => performance.now() };
  assert.equal((await runProcess({ ...opts(dir, script, 5000), clock: jumping })).suspended, true);
  assert.equal((await runProcess({ ...opts(dir, script, 5000), clock: steady })).suspended, false);
});

test('process group 밖으로 나간 자식이 stdout 을 붙잡고 있어도 종료 뒤 유예 시간 안에 끝난다', async () => {
  const dir = tmp();
  const pidFile = path.join(dir, 'child.pid');
  const script = writeScript(path.join(dir, 'p'), `python3 -c 'import os,time; os.setsid(); open("${pidFile}","w").write(str(os.getpid())); time.sleep(30)' & sleep 0.3; exit 0`);
  const started = Date.now();
  const r = await runProcess(opts(dir, script, 10_000));
  try {
    assert.equal(r.exit_code, 0);
    assert.equal(r.timed_out, false);
    assert.ok(Date.now() - started < 3000, `${Date.now() - started}ms`);
  } finally {
    // 남은 손자 정리. 이미 끝났으면 무시한다
    try {
      process.kill(Number(readFileSync(pidFile, 'utf8')), 'SIGKILL');
    } catch {
      // 이미 종료됨
    }
  }
});
