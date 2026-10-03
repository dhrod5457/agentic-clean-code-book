import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { tmp } from './helpers.ts';

const HOOK = path.resolve(import.meta.dirname, '../config/cc/record.mjs');

function hook(out: string, phase: string, input: unknown) {
  return spawnSync('node', [HOOK, phase], { input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8', env: { ...process.env, RECORD_OUT_DIR: out } });
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

  const pre = hook(out, 'pre', call);
  writeFileSync(path.join(results, 'TEST-New.xml'), '<new/>');
  mkdirSync(path.join(cwd, 'frontend/reports'), { recursive: true });
  writeFileSync(path.join(cwd, 'frontend/reports/junit-vitest.xml'), '<v/>');
  writeFileSync(path.join(cwd, 'frontend/reports/coverage.html'), '<html/>');
  const post = hook(out, 'post', { ...call, tool_response: { exit_code: 0 } });

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

test('시험이 아닌 명령은 결과 파일을 복사하지 않는다', () => {
  const out = tmp('hook-');
  const cwd = tmp('ws-');
  mkdirSync(path.join(cwd, 'backend/build/test-results'), { recursive: true });
  const call = { tool_name: 'Bash', tool_use_id: 'toolu_2', cwd, tool_input: { command: 'ls backend' } };
  hook(out, 'pre', call);
  writeFileSync(path.join(cwd, 'backend/build/test-results/TEST-X.xml'), '<x/>');
  hook(out, 'post', call);
  assert.equal(existsSync(path.join(out, 'artifacts')), false);
});

test('입력이 잘못돼도 표준 출력 없이 exit 0 으로 끝나고 오류만 따로 남긴다', () => {
  const out = tmp('hook-');
  const r = hook(out, 'pre', 'not json');
  assert.equal(r.status, 0);
  assert.equal(r.stdout, '');
  assert.match(readFileSync(path.join(out, 'hook-errors.log'), 'utf8'), /JSON/);
});
