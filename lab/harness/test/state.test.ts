import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canTransition, isTerminal, stageOfAbandoned, type RunState } from '../src/state.ts';

test('정상 경로의 전이는 허용되고 종료 상태에서는 더 나갈 수 없다', () => {
  const path = [null, 'prepared', 'running', 'agent_succeeded', 'grading_succeeded', 'completed'] as const;
  for (let i = 1; i < path.length; i++) assert.equal(canTransition(path[i - 1], path[i] as RunState), true, `${path[i - 1]} → ${path[i]}`);
  assert.equal(canTransition('completed', 'harness_failed'), false);
  assert.equal(canTransition('harness_failed', 'completed'), false);
  assert.equal(isTerminal('completed'), true);
  assert.equal(isTerminal('grading_failed'), false);
});

test('단계를 건너뛰는 전이는 거부한다', () => {
  assert.equal(canTransition(null, 'running'), false);
  assert.equal(canTransition('prepared', 'agent_succeeded'), false);
  assert.equal(canTransition('running', 'grading_succeeded'), false);
  assert.equal(canTransition('running', 'completed'), false);
  assert.equal(canTransition('grading_succeeded', 'grading_failed'), false);
});

test('Agent 종료 상태에서만 채점 · 완료로 가고, 어느 비종료 상태에서든 harness_failed 로 갈 수 있다', () => {
  for (const s of ['agent_succeeded', 'agent_failed', 'timed_out'] as const) {
    assert.equal(canTransition(s, 'grading_failed'), true);
    assert.equal(canTransition(s, 'completed'), true);
  }
  for (const s of [null, 'prepared', 'running', 'agent_failed', 'timed_out', 'grading_failed'] as const) {
    assert.equal(canTransition(s, 'harness_failed'), true, String(s));
  }
});

test('강제 종료로 남은 실행의 실패 단계: running 은 agent, Agent 이후 상태는 after_agent', () => {
  assert.equal(stageOfAbandoned(null), 'prepare');
  assert.equal(stageOfAbandoned('prepared'), 'prepare');
  assert.equal(stageOfAbandoned('running'), 'agent');
  for (const s of ['agent_succeeded', 'agent_failed', 'timed_out', 'grading_succeeded', 'grading_failed'] as const) {
    assert.equal(stageOfAbandoned(s), 'after_agent', s);
  }
});
