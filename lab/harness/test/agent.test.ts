import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAgent, summarizeStream } from '../src/agent.ts';
import type { ProcessResult } from '../src/process.ts';
import { needsNewAttempt } from '../src/run.ts';

const exited = (exit_code: number): ProcessResult => ({
  exit_code, signal: null, timed_out: false, spawn_error: null,
  started_at: '2026-10-03T00:00:00.000Z', ended_at: '2026-10-03T00:00:01.000Z', wall_ms: 1000, mono_ms: 1000, suspended: false,
});
const stream = (result: Record<string, unknown>) => summarizeStream(`${JSON.stringify({ type: 'result', ...result })}\n`);

test('API 오류는 오류 result 의 구조화된 필드와 stderr 의 API Error 줄로만 판정한다', () => {
  assert.equal(classifyAgent(exited(1), stream({ subtype: 'error', is_error: true, error: 'API Error: 529 overloaded' }), '').state, 'agent_failed');
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'error', is_error: true }), 'API Error: 500 Internal server error\n'), { state: 'agent_failed', error_kind: 'api_error' });
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'error', is_error: true, error: 'API Error: 529 overloaded' }), ''), { state: 'agent_failed', error_kind: 'api_error' });
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'error_max_budget_usd', is_error: true }), ''), { state: 'agent_failed', error_kind: 'budget_exceeded' });
});

test('CLI 2.1.287 형식의 API 오류(is_error 와 api_error_status)를 API 오류로 판정한다', () => {
  const r = stream({ subtype: 'success', is_error: true, api_error_status: 529, result: 'API Error: 529 {"type":"error","error":{"type":"overloaded_error"}}' });
  assert.deepEqual(classifyAgent(exited(1), r, ''), { state: 'agent_failed', error_kind: 'api_error' });
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'success', is_error: true, api_error_status: 429 }), ''), { state: 'agent_failed', error_kind: 'api_error' });
  // 요청 자체가 틀린 400 은 API 장애가 아니다
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'success', is_error: true, api_error_status: 400 }), ''), { state: 'agent_failed', error_kind: 'other' });
});

test('Agent 단계에서 잠자기가 감지되면 Agent 결과와 관계없이 harness_failed(agent) 다', () => {
  assert.deepEqual(classifyAgent({ ...exited(0), suspended: true }, stream({ subtype: 'success' }), ''), { state: 'harness_failed', stage: 'agent', reason: 'host 잠자기 감지(wall 1000ms, monotonic 1000ms)' });
});

test('Agent 가 쓴 문장이나 stack trace 의 숫자는 API 오류로 보지 않는다', () => {
  const sentence = stream({ subtype: 'success', is_error: true, result: '결제 금액 500,000원 이상 주문 API 를 추가했다. rate limit 정책도 확인했다' });
  assert.deepEqual(classifyAgent(exited(1), sentence, ''), { state: 'agent_failed', error_kind: 'other' });
  const crash = stream({ subtype: 'error', is_error: true });
  assert.deepEqual(classifyAgent(exited(1), crash, 'TypeError: x\n    at run (file:///opt/cc/cli.js:512:17)\n'), { state: 'agent_failed', error_kind: 'other' });
});

test('stream 에 객체가 아닌 줄이 있어도 요약을 만든다', () => {
  const s = summarizeStream('null\n[1]\nnot json\n{"type":"result","subtype":"success","total_cost_usd":1}\n');
  assert.equal(s.unparsed_lines, 3);
  assert.equal(s.result?.total_cost_usd, 1);
});

test('재실행 판단: API 오류를 먼저 보고, 비종료 상태는 마지막 상태로 단계를 정한다', () => {
  const view = (over: Partial<Parameters<typeof needsNewAttempt>[0]>) => ({ state: 'completed' as const, terminal: true, harness_failure: null, agent: null, ...over });
  assert.equal(needsNewAttempt(view({ state: 'harness_failed', harness_failure: { stage: 'after_agent' }, agent: { outcome: 'agent_failed', error_kind: 'api_error' } })), true);
  assert.equal(needsNewAttempt(view({ state: 'harness_failed', harness_failure: { stage: 'after_agent' }, agent: { outcome: 'agent_succeeded', error_kind: null } })), false);
  assert.equal(needsNewAttempt(view({ state: 'running', terminal: false })), true);
  // running 에 남았어도 Agent 종료 기록이 있으면 Agent 관찰은 끝났다
  assert.equal(needsNewAttempt(view({ state: 'running', terminal: false, agent: { outcome: 'agent_succeeded', error_kind: null } })), false);
  // Agent 종료 기록이 잠자기 같은 harness 원인으로 분류됐으면 Agent 관찰이 아니다
  assert.equal(needsNewAttempt(view({ state: 'running', terminal: false, agent: { outcome: 'harness_failed', error_kind: null } })), true);
  assert.equal(needsNewAttempt(view({ state: 'grading_succeeded', terminal: false })), false);
  assert.equal(needsNewAttempt(view({ agent: { outcome: 'agent_failed', error_kind: 'budget_exceeded' } })), false);
});
