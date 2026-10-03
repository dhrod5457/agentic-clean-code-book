import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { tmp } from './helpers.ts';

const HOOK = path.resolve(import.meta.dirname, '../config/cc/record.mjs');

function hook(out: string, phase: string, input: unknown, workspace = '/nonexistent') {
  return spawnSync('node', [HOOK, phase], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', env: { ...process.env, RECORD_OUT_DIR: out, RECORD_WORKSPACE: workspace } });
}

// settings.json 이 hook 이벤트에 등록한 명령의 인자. 등록이 없으면 null
function registered(event: string): string[] | null {
  const settings = JSON.parse(readFileSync(path.join(path.dirname(HOOK), 'settings.json'), 'utf8')) as { hooks: Record<string, { hooks: { command: string }[] }[]> };
  const command = settings.hooks[event]?.[0]?.hooks[0]?.command;
  return command === undefined ? null : command.split(' ').slice(2);
}

test('시험 명령이 끝나면 그 명령 시작 이후 바뀐 시험 결과만 복사하고, 기록에 시각을 붙인다', async () => {
  const out = tmp('hook-');
  const cwd = tmp('ws-');
  const results = path.join(cwd, 'backend/build/test-results/test');
  mkdirSync(results, { recursive: true });
  const old = path.join(results, 'TEST-Old.xml');
  writeFileSync(old, '<old/>');
  const past = new Date(Date.now() - 60_000);
  utimesSync(old, past, past);
  const call = { tool_name: 'Bash', tool_use_id: 'toolu_1', cwd, tool_input: { command: "./gradlew test --tests '*FeeTest'" } };

  const pre = hook(out, 'pre', call, cwd);
  writeFileSync(path.join(results, 'TEST-New.xml'), '<new/>');
  mkdirSync(path.join(cwd, 'frontend/reports'), { recursive: true });
  writeFileSync(path.join(cwd, 'frontend/reports/junit-vitest.xml'), '<v/>');
  writeFileSync(path.join(cwd, 'frontend/reports/coverage.html'), '<html/>');
  const post = hook(out, 'post', { ...call, tool_response: { exit_code: 0 } }, cwd);

  for (const r of [pre, post]) {
    assert.equal(r.status, 0);
    assert.equal(r.stdout, '');
  }
  const lines = readFileSync(path.join(out, 'hooks.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual(lines.map((l) => [l.phase, l.tool_use_id]), [['pre', 'toolu_1'], ['post', 'toolu_1']]);
  assert.ok(lines.every((l) => !Number.isNaN(Date.parse(l.at))));
  assert.equal(lines[1].copied_test_results, 'artifacts/test-001');
  const copied = path.join(out, 'artifacts/test-001');
  assert.equal(existsSync(path.join(copied, 'backend/build/test-results/test/TEST-New.xml')), true);
  assert.equal(existsSync(path.join(copied, 'backend/build/test-results/test/TEST-Old.xml')), false);
  assert.equal(existsSync(path.join(copied, 'frontend/reports/junit-vitest.xml')), true);
  assert.equal(existsSync(path.join(copied, 'frontend/reports/coverage.html')), false);
});

test('실패한 시험 명령(PostToolUseFailure)도 시험 결과를 복사한다', () => {
  const out = tmp('hook-');
  const ws = tmp('ws-');
  const results = path.join(ws, 'backend/build/test-results/test');
  mkdirSync(results, { recursive: true });
  const call = { tool_name: 'Bash', tool_use_id: 'toolu_f', cwd: ws, tool_input: { command: './gradlew test' } };
  const pre = registered('PreToolUse');
  const failure = registered('PostToolUseFailure');
  assert.notEqual(pre, null);
  assert.notEqual(failure, null, 'PostToolUseFailure 에 hook 이 등록돼 있지 않다');
  hook(out, pre![0], call, ws);
  writeFileSync(path.join(results, 'TEST-Fail.xml'), '<failed/>');
  hook(out, failure![0], { ...call, hook_event_name: 'PostToolUseFailure', error: 'exit code 1' }, ws);
  assert.equal(existsSync(path.join(out, 'artifacts/test-001/backend/build/test-results/test/TEST-Fail.xml')), true);
});

test('시험 결과는 Agent 의 현재 디렉터리와 관계없이 작업 디렉터리 기준으로 찾고, 규약의 시험 명령을 모두 시험 명령으로 본다', () => {
  const commands = ['./gradlew test', './scripts/verify-all.sh', 'pnpm run test', 'pnpm -C frontend test', 'pnpm --dir frontend e2e', './gradlew build', 'pnpm --filter frontend test'];
  for (const [i, command] of commands.entries()) {
    const out = tmp('hook-');
    const ws = tmp('ws-');
    const results = path.join(ws, 'frontend/reports');
    mkdirSync(results, { recursive: true });
    // Agent 가 cd 로 옮긴 뒤의 cwd
    const call = { tool_name: 'Bash', tool_use_id: `toolu_c${i}`, cwd: path.join(ws, 'backend'), tool_input: { command } };
    hook(out, 'pre', call, ws);
    writeFileSync(path.join(results, 'junit-vitest.xml'), '<v/>');
    hook(out, 'post', call, ws);
    assert.equal(existsSync(path.join(out, 'artifacts/test-001/frontend/reports/junit-vitest.xml')), true, command);
  }
});

test('파일 시각이 명령 시작보다 이르게 기록돼도 명령 중에 새로 생기거나 바뀐 결과 파일은 복사한다', () => {
  const out = tmp('hook-');
  const ws = tmp('ws-');
  const results = path.join(ws, 'backend/build/test-results/test');
  mkdirSync(results, { recursive: true });
  const kept = path.join(results, 'TEST-Kept.xml');
  const changed = path.join(results, 'TEST-Changed.xml');
  writeFileSync(kept, '<kept/>');
  writeFileSync(changed, '<old/>');
  const past = new Date(Date.now() - 60_000);
  for (const f of [kept, changed]) utimesSync(f, past, past);
  const call = { tool_name: 'Bash', tool_use_id: 'toolu_clock', cwd: ws, tool_input: { command: './gradlew test' } };
  hook(out, 'pre', call, ws);
  // 파일 시스템 시각 정밀도나 시계 차이로 명령 시작보다 이른 시각이 기록된 경우
  const earlier = new Date(Date.now() - 2_000);
  writeFileSync(path.join(results, 'TEST-New.xml'), '<new/>');
  writeFileSync(changed, '<changed-longer/>');
  for (const f of [path.join(results, 'TEST-New.xml'), changed]) utimesSync(f, earlier, earlier);
  hook(out, 'post', call, ws);
  const copied = path.join(out, 'artifacts/test-001/backend/build/test-results/test');
  assert.deepEqual(['TEST-Changed.xml', 'TEST-Kept.xml', 'TEST-New.xml'].map((n) => existsSync(path.join(copied, n))), [true, false, true]);
});

test('명령 실행 중 바뀐 시험 결과 파일이 없으면 복사하지 않는다', () => {
  const out = tmp('hook-');
  const cwd = tmp('ws-');
  const results = path.join(cwd, 'backend/build/test-results');
  mkdirSync(results, { recursive: true });
  const old = path.join(results, 'TEST-X.xml');
  writeFileSync(old, '<x/>');
  const past = new Date(Date.now() - 60_000);
  utimesSync(old, past, past);
  const call = { tool_name: 'Bash', tool_use_id: 'toolu_2', cwd, tool_input: { command: 'ls backend' } };
  hook(out, 'pre', call, cwd);
  hook(out, 'post', call, cwd);
  assert.equal(existsSync(path.join(out, 'artifacts')), false);
  const lines = readFileSync(path.join(out, 'hooks.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines[1].copied_test_results, null);
});

test('입력이 잘못돼도 표준 출력 없이 exit 0 으로 끝나고 오류만 따로 남긴다', () => {
  const out = tmp('hook-');
  const r = hook(out, 'pre', 'not json');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.match(readFileSync(path.join(out, 'hook-errors.log'), 'utf8'), /JSON/);
});
