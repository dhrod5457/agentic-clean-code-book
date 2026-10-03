import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { classifyAgent, summarizeStream } from './agent.ts';
import type { ExecConfig } from './config.ts';
import { extractVersion, TOOLS, type RawFingerprint } from './fingerprint.ts';
import { junitPath, parseJunit, type SuiteKind, type SuiteStatus } from './grader.ts';
import type { ProcessResult } from './process.ts';
import { isTerminal, type RunState } from './state.ts';

// run.json, raw/, artifacts/ 만 읽어 result.json 을 만든다. 같은 입력이면 같은 바이트를 낸다(실행 계약 §8.4)

export const RAW = {
  events: 'raw/events.jsonl',
  fingerprint: 'raw/fingerprint.json',
  harnessDiff: 'raw/harness-lab.diff',
  prepare: 'raw/prepare',
  diffLog: 'raw/diff',
  agentInvocation: 'raw/agent/invocation.json',
  agentStdout: 'raw/agent/stdout.jsonl',
  agentRecv: 'raw/agent/stdout.recv.jsonl',
  agentStderr: 'raw/agent/stderr.log',
  agentConfig: 'raw/agent/claude-config',
  agentHooks: 'raw/agent/hooks',
  grading: 'raw/grading',
} as const;

export const ARTIFACTS = {
  patch: 'artifacts/final.patch',
  numstat: 'artifacts/diff-numstat.txt',
  nameStatus: 'artifacts/diff-name-status.txt',
} as const;

export const WORKSPACE = 'workspace/shop-admin';
// 채점용 복사본. 재채점 회차(round)마다 따로 만든다. 첫 채점은 0
export const gradingWorkspace = (round: number) => `grading-workspace/${round}/shop-admin`;
// harness 소유 git 저장소와 임시 index. Agent 작업 디렉터리 밖에 둔다
export const HARNESS_GIT = 'harness/source.git';
export const HARNESS_INDEX = 'harness/index';
export const HARNESS_HOME = 'harness/home';

type GradingProcess = { type: 'grading_process'; kind: SuiteKind; suite: string; round: number; try: number; log_dir: string; skip_build: boolean; env: Record<string, string> } & ProcessResult;

export type HarnessEvent =
  | { type: 'run_started'; at: string }
  | { type: 'state'; at: string; from: RunState | null; to: RunState; stage?: string; reason?: string }
  | ({ type: 'agent_process' } & ProcessResult)
  | GradingProcess
  // harness 가 묶음의 최종 판정을 정한 기록. 이 기록이 없는 묶음은 결과가 없는 것이다
  | { type: 'suite_result'; at: string; kind: SuiteKind; suite: string; round: number; status: SuiteStatus }
  | { type: 'grading_error'; at: string; kind: SuiteKind; suite: string; round: number; message: string }
  | { type: 'container_exit'; at: string; role: 'agent'; name: string; found: boolean; exit_code: number | null; oom_killed: boolean; error: string }
  | { type: 'regrade'; at: string; round: number; suites: string[] }
  | { type: 'harness_code'; at: string; when: 'start' | 'before_grading'; head: string | null; lab_changes: string | null }
  | { type: 'note'; at: string; message: string };

export interface RunJson {
  schema: string;
  run_id: string;
  session_id: string;
  identity: { experiment: string; task: string; variant: string; repetition: number; attempt: number; retry_of: string | null };
  source: { repo: string; commit: string };
  task: { id: string; experiment: string; prompt_path: string; prompt_sha256: string; grading: { normative: string[]; diagnostic: string[] } };
  execution_config: ExecConfig;
  condition_hash: string;
  input_hash: string;
  resources: { port: number };
}

function readText(runDir: string, rel: string): string | null {
  try {
    return readFileSync(path.join(runDir, rel), 'utf8');
  } catch {
    return null;
  }
}

export function readEvents(runDir: string): HarnessEvent[] {
  const events: HarnessEvent[] = [];
  for (const line of (readText(runDir, RAW.events) ?? '').split('\n')) {
    if (line === '') continue;
    try {
      events.push(JSON.parse(line) as HarnessEvent);
    } catch {
      // 강제 종료로 마지막 줄이 잘린 경우
    }
  }
  return events;
}

function diffSummary(nameStatus: string | null, numstat: string | null) {
  if (nameStatus === null || numstat === null) return null;
  const files = { added: 0, modified: 0, deleted: 0, renamed: 0, other: 0, total: 0 };
  for (const line of nameStatus.split('\n').filter((l) => l !== '')) {
    const code = line[0];
    if (code === 'A') files.added++;
    else if (code === 'M') files.modified++;
    else if (code === 'D') files.deleted++;
    else if (code === 'R') files.renamed++;
    else files.other++;
    files.total++;
  }
  const lines = { added: 0, deleted: 0, binary_files: 0 };
  for (const line of numstat.split('\n').filter((l) => l !== '')) {
    const [a, d] = line.split('\t');
    if (a === '-') lines.binary_files++;
    else {
      lines.added += Number(a);
      lines.deleted += Number(d);
    }
  }
  return { files, lines };
}

function gradingSummary(runDir: string, events: HarnessEvent[], kind: SuiteKind) {
  const suites: string[] = [];
  const tries = new Map<string, GradingProcess[]>();
  const results = new Map<string, { status: SuiteStatus; round: number }>();
  const errors = new Map<string, string>();
  for (const e of events) {
    if ((e.type === 'grading_process' || e.type === 'suite_result' || e.type === 'grading_error') && e.kind === kind) {
      if (!suites.includes(e.suite)) suites.push(e.suite);
      if (e.type === 'grading_process') tries.set(e.suite, [...(tries.get(e.suite) ?? []), e]);
      else if (e.type === 'suite_result') results.set(e.suite, { status: e.status, round: e.round });
      else errors.set(e.suite, e.message);
    }
  }
  return suites.map((suite) => {
    const t = tries.get(suite) ?? [];
    const last = t.at(-1);
    const junitText = last ? readText(runDir, path.relative(runDir, junitPath(path.join(runDir, last.log_dir), suite))) : null;
    const junit = junitText === null ? null : parseJunit(junitText);
    return {
      suite,
      // 판정이 기록되지 않은 묶음(harness 실패로 끝난 시도)은 null
      status: results.get(suite)?.status ?? null,
      decided_round: results.get(suite)?.round ?? null,
      tries: t.length,
      exit_code: last?.exit_code ?? null,
      timed_out: last?.timed_out ?? false,
      spawn_error: last?.spawn_error ?? null,
      harness_error: errors.get(suite) ?? null,
      tests: junit?.tests ?? null,
      failures: junit?.failures ?? null,
      errors: junit?.errors ?? null,
      skipped: junit?.skipped ?? null,
      failed_tests: junit?.failed_tests ?? [],
      wall_ms: t.reduce((n, x) => n + x.wall_ms, 0),
      log_dirs: t.map((x) => x.log_dir),
    };
  });
}

function environment(raw: RawFingerprint | null, run: RunJson) {
  const versions = Object.fromEntries(TOOLS.map((t) => [t, raw ? extractVersion(t, raw.agent_env[t].output) : null]));
  return {
    host: raw?.host ?? null,
    harness_commit: raw?.harness.commit ?? null,
    harness_lab_dirty: raw?.harness.lab_dirty ?? null,
    source_commit: run.source.commit,
    agent_env: { java: versions.java, node: versions.node, pnpm: versions.pnpm, claude_code: versions.claude },
    model: run.execution_config.agent.model,
    effort: run.execution_config.agent.effort,
  };
}

function agentSummary(runDir: string, events: HarnessEvent[], run: RunJson, reachedRunning: boolean) {
  const p = events.find((e): e is Extract<HarnessEvent, { type: 'agent_process' }> => e.type === 'agent_process') ?? null;
  const stdout = readText(runDir, RAW.agentStdout);
  // Agent 실행 중 harness 가 강제 종료되면 종료 기록은 없지만 stdout 은 남는다. 사용량은 stdout 에서 읽는다
  if (p === null && (!reachedRunning || stdout === null)) return null;
  const stream = summarizeStream(stdout ?? '');
  const ce = events.find((e): e is Extract<HarnessEvent, { type: 'container_exit' }> => e.type === 'container_exit') ?? null;
  const container = ce === null ? null : { found: ce.found, exit_code: ce.exit_code, oom_killed: ce.oom_killed, error: ce.error };
  const cls = p === null ? null : classifyAgent(p, stream, readText(runDir, RAW.agentStderr) ?? '', container);
  const r = stream.result;
  const usage = (r?.usage ?? null) as Record<string, unknown> | null;
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  const observed = [...new Set([stream.init_model, ...Object.keys((r?.modelUsage ?? {}) as object)].filter((m): m is string => typeof m === 'string'))].sort();
  const toolNames = Object.keys(stream.tool_calls).sort();
  return {
    outcome: cls?.state ?? null,
    error_kind: cls === null || cls.state === 'harness_failed' ? null : cls.error_kind,
    started_at: p?.started_at ?? null,
    ended_at: p?.ended_at ?? null,
    wall_ms: p?.wall_ms ?? null,
    mono_ms: p?.mono_ms ?? null,
    exit_code: p?.exit_code ?? null,
    signal: p?.signal ?? null,
    timed_out: p?.timed_out ?? null,
    suspended: p?.suspended ?? null,
    container: container,
    result_missing: r === null,
    result_subtype: typeof r?.subtype === 'string' ? r.subtype : null,
    usage: {
      input_tokens: num(usage?.input_tokens),
      output_tokens: num(usage?.output_tokens),
      cache_creation_input_tokens: num(usage?.cache_creation_input_tokens),
      cache_read_input_tokens: num(usage?.cache_read_input_tokens),
    },
    total_cost_usd: num(r?.total_cost_usd),
    num_turns: num(r?.num_turns),
    duration_ms: num(r?.duration_ms),
    models: {
      configured: run.execution_config.agent.model,
      observed,
      other_than_configured: observed.filter((m) => m !== run.execution_config.agent.model),
    },
    tool_calls: {
      total: toolNames.reduce((n, k) => n + stream.tool_calls[k], 0),
      by_name: Object.fromEntries(toolNames.map((k) => [k, stream.tool_calls[k]])),
    },
    last_bash_command: stream.last_bash_command,
    api_retries: stream.api_retries,
    unparsed_stream_lines: stream.unparsed_lines,
  };
}

export function buildResult(runDir: string): string {
  const run = JSON.parse(readFileSync(path.join(runDir, 'run.json'), 'utf8')) as RunJson;
  const events = readEvents(runDir);
  const states = events.filter((e): e is Extract<HarnessEvent, { type: 'state' }> => e.type === 'state');
  const last = states.at(-1) ?? null;
  const state = last?.to ?? null;
  const fpText = readText(runDir, RAW.fingerprint);
  const normative = gradingSummary(runDir, events, 'normative');
  const diagnostic = gradingSummary(runDir, events, 'diagnostic');
  const startedAt = events.find((e) => e.type === 'run_started')?.at ?? states[0]?.at ?? null;
  const endedAt = isTerminal(state) ? last!.at : null;
  const exists = (rel: string) => existsSync(path.join(runDir, rel));
  const pick = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([, rel]) => exists(rel)));
  const expected = run.task.grading.normative;
  const decided = normative.filter((s) => s.status !== null);

  const result = {
    schema: 'lab.run-result/v1',
    run_id: run.run_id,
    identity: run.identity,
    task: run.task.id,
    variant: run.identity.variant,
    source_commit: run.source.commit,
    state,
    terminal: isTerminal(state),
    harness_failure: state === 'harness_failed' ? { stage: last!.stage ?? null, reason: last!.reason ?? null } : null,
    // 재채점 회차 수. 재채점 판정은 grading 의 decided_round 로 구분한다
    regrade_rounds: events.filter((e) => e.type === 'regrade').length,
    state_history: states.map((s) => ({ state: s.to, at: s.at })),
    started_at: startedAt,
    ended_at: endedAt,
    wall_ms: startedAt !== null && endedAt !== null ? Date.parse(endedAt) - Date.parse(startedAt) : null,
    agent: agentSummary(runDir, events, run, states.some((s) => s.to === 'running')),
    diff: diffSummary(readText(runDir, ARTIFACTS.nameStatus), readText(runDir, ARTIFACTS.numstat)),
    grading: {
      // 판정 묶음이 모두 판정을 받았을 때만 정한다. 하나라도 결과가 없으면 null(채점 결측)
      outcome: expected.length === 0 || decided.length !== expected.length ? null : decided.every((s) => s.status === 'passed') ? 'passed' : 'failed',
      normative,
      diagnostic,
    },
    environment: environment(fpText === null ? null : (JSON.parse(fpText) as RawFingerprint), run),
    paths: {
      run_json: 'run.json',
      raw: pick({ ...RAW }),
      artifacts: pick({ ...ARTIFACTS }),
      workspace: WORKSPACE,
      grading_workspace: gradingWorkspace(0),
    },
  };
  return `${JSON.stringify(result, null, 2)}\n`;
}

export function writeResult(runDir: string): void {
  const tmp = path.join(runDir, 'result.json.tmp');
  writeFileSync(tmp, buildResult(runDir));
  renameSync(tmp, path.join(runDir, 'result.json'));
}
