// 실행 상태와 전이. 기준은 _design/experiment-execution-contract-v0.1.md §6

export const STATES = [
  'prepared',
  'running',
  'agent_succeeded',
  'agent_failed',
  'timed_out',
  'grading_succeeded',
  'grading_failed',
  'completed',
  'harness_failed',
] as const;

export type RunState = (typeof STATES)[number];

// harness_failed 의 실패 단계. diff · 채점 · 정리는 after_agent 다
export type Stage = 'prepare' | 'agent_start' | 'agent' | 'after_agent';

const AFTER_AGENT: RunState[] = ['grading_succeeded', 'grading_failed', 'completed', 'harness_failed'];

const NEXT: Record<RunState | 'none', RunState[]> = {
  none: ['prepared', 'harness_failed'],
  prepared: ['running', 'harness_failed'],
  running: ['agent_succeeded', 'agent_failed', 'timed_out', 'harness_failed'],
  // 판정 채점 묶음이 없는 과제는 Agent 상태에서 바로 completed 로 간다
  agent_succeeded: AFTER_AGENT,
  agent_failed: AFTER_AGENT,
  timed_out: AFTER_AGENT,
  grading_succeeded: ['completed', 'harness_failed'],
  grading_failed: ['completed', 'harness_failed'],
  completed: [],
  harness_failed: [],
};

export function canTransition(from: RunState | null, to: RunState): boolean {
  return NEXT[from ?? 'none'].includes(to);
}

export function isTerminal(state: RunState | null): boolean {
  return state === 'completed' || state === 'harness_failed';
}

// harness 가 강제 종료돼 비종료 상태로 남은 실행의 실패 단계(§6.2)
export function stageOfAbandoned(last: RunState | null): Stage {
  if (last === null || last === 'prepared') return 'prepare';
  if (last === 'running') return 'agent';
  return 'after_agent';
}
