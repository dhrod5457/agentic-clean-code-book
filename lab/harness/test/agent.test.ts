import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyAgent, summarizeStream, type ContainerExit } from '../src/agent.ts';
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

test('구독 사용 한도 도달 문구(result 또는 stderr)는 usage_limit 이다', () => {
  for (const kind of ['session', 'weekly', 'Opus', 'Sonnet']) {
    const r = stream({ subtype: 'success', is_error: true, result: `You've hit your ${kind} limit · resets 3:45pm` });
    assert.deepEqual(classifyAgent(exited(1), r, ''), { state: 'agent_failed', error_kind: 'usage_limit' }, kind);
  }
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'error', is_error: true }), "You've hit your weekly limit · resets Mon 12:00am\n"), { state: 'agent_failed', error_kind: 'usage_limit' });
  // 오류가 아닌 result 의 문장은 보지 않는다
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'success', is_error: false, result: "You've hit your session limit 라는 문구를 README 에 적었다" }), ''), { state: 'agent_failed', error_kind: 'other' });
});

test('Agent 실행 파일을 시작하지 못하면 harness_failed(agent_start) 다', () => {
  assert.deepEqual(classifyAgent({ ...exited(0), exit_code: null, spawn_error: 'spawn x ENOENT' }, stream({}), ''), { state: 'harness_failed', stage: 'agent_start', reason: 'Agent 를 시작하지 못했다: spawn x ENOENT' });
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

// docker inspect 로 얻은 컨테이너 종료 상태. 기본값은 정상 시작 · 종료한 컨테이너
const container = (over: Partial<ContainerExit> = {}): ContainerExit => ({
  found: true, started: true, exit_code: 1, oom_killed: false, error: '', running_after_client: false, inspect_error: null, ...over,
});

test('시작 스크립트가 실패해(exit 90, stdout 없음) Agent 를 실행하지 못한 컨테이너는 harness_failed(agent_start) 다', () => {
  const cls = classifyAgent(exited(90), summarizeStream(''), '', container({ exit_code: 90 }));
  assert.equal(cls.state, 'harness_failed');
  assert.equal(cls.state === 'harness_failed' && cls.stage, 'agent_start');
});

test('컨테이너 OOM 기록이 있어도 사용 한도 · API 오류로 끝난 실행은 그 원인으로 분류한다', () => {
  const oom = container({ oom_killed: true });
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'success', is_error: true, result: "You've hit your session limit · resets 3:45pm" }), '', oom), { state: 'agent_failed', error_kind: 'usage_limit' });
  assert.deepEqual(classifyAgent(exited(1), stream({ subtype: 'success', is_error: true, api_error_status: 529 }), '', oom), { state: 'agent_failed', error_kind: 'api_error' });
  // 구조화된 오류가 없으면 OOM 이다
  assert.deepEqual(classifyAgent(exited(137), summarizeStream(''), '', container({ exit_code: 137, oom_killed: true })), { state: 'agent_failed', error_kind: 'oom' });
});

test('시간 초과가 아닌데 docker client 가 끝난 뒤 컨테이너가 실행 중이었으면 외부 원인으로 harness_failed(agent) 다', () => {
  const cls = classifyAgent(exited(137), summarizeStream(''), '', container({ exit_code: 137, running_after_client: true }));
  assert.equal(cls.state === 'harness_failed' && cls.stage, 'agent');
  // 시간 초과로 harness 가 끝낸 경우는 timed_out 이다
  assert.deepEqual(classifyAgent({ ...exited(137), timed_out: true }, summarizeStream(''), '', container({ exit_code: 137, running_after_client: true })), { state: 'timed_out', error_kind: null });
});

test('docker inspect 가 응답하지 않으면 harness_failed(agent), 컨테이너 생성 오류(State.Error)는 harness_failed(agent_start) 다', () => {
  const ok = stream({ subtype: 'success', is_error: false });
  const unknown = classifyAgent(exited(0), ok, '', container({ found: false, started: false, exit_code: null, inspect_error: 'Cannot connect to the Docker daemon' }));
  assert.equal(unknown.state === 'harness_failed' && unknown.stage, 'agent');
  const createFailed = classifyAgent(exited(127), summarizeStream(''), '', container({ started: false, exit_code: 127, error: 'OCI runtime create failed' }));
  assert.equal(createFailed.state === 'harness_failed' && createFailed.stage, 'agent_start');
});
