import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseJunit, suiteFileName, suiteStatus } from '../src/grader.ts';
import { JUNIT_FAIL, JUNIT_PASS } from './helpers.ts';

test('Playwright JUnit 에서 시험 수와 실패한 시험 이름을 읽는다', () => {
  assert.deepEqual(parseJunit(JUNIT_PASS), { tests: 2, failures: 0, errors: 0, skipped: 0, failed_tests: [] });
  assert.deepEqual(parseJunit(JUNIT_FAIL)?.failed_tests, ['버튼 & 표']);
  assert.equal(parseJunit('<html>not junit</html>'), null);
});

test('묶음 판정: 실패 시험이 있으면 failed, 결과 없이 끝나면 error, 시험 0개도 error', () => {
  const pass = parseJunit(JUNIT_PASS);
  const fail = parseJunit(JUNIT_FAIL);
  const empty = parseJunit('<testsuites tests="0" failures="0" errors="0" skipped="0"></testsuites>');
  assert.equal(suiteStatus(0, false, pass), 'passed');
  assert.equal(suiteStatus(1, false, fail), 'failed');
  assert.equal(suiteStatus(0, false, fail), 'failed');
  assert.equal(suiteStatus(1, false, null), 'error');
  assert.equal(suiteStatus(0, false, null), 'error');
  assert.equal(suiteStatus(0, false, empty), 'error');
  assert.equal(suiteStatus(1, false, empty), 'error');
  // 시험은 통과했지만 run.sh 가 실패로 끝난 경우(애플리케이션 종료 실패 등)는 통과로 보지 않는다
  assert.equal(suiteStatus(1, false, pass), 'error');
  assert.equal(suiteStatus(null, true, pass), 'timed_out');
});

test('묶음 이름은 run.sh 와 같은 규칙으로 파일 이름이 된다', () => {
  assert.equal(suiteFileName('exp2/T2-M1'), 'exp2-T2-M1');
  assert.equal(suiteFileName('diag-exp3-1024'), 'diag-exp3-1024');
});
