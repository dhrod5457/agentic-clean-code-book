import path from 'node:path';
import type { ExecConfig } from './config.ts';
import type { ProcessResult } from './process.ts';
import type { Stage } from './state.ts';

// Claude Code 실행 인자 · 환경 변수와 Agent 종료 분류. 기준은 실행 계약 §3, §6.3

export const EMPTY_MCP_CONFIG = '{"mcpServers":{}}';

// 인자는 실행 설정과 실행마다 다른 값(과제 문구, 세션 ID)으로만 만든다. Variant 를 받지 않는다
export function claudeArgs(config: ExecConfig, labRoot: string, prompt: string, sessionId: string): string[] {
  const a = config.agent;
  const args = [
    // 과제 문구를 -p 바로 뒤에 둔다. 여러 값을 받는 옵션 뒤에 두면 그 옵션의 값으로 들어간다
    '-p', prompt,
    '--model', a.model,
    '--effort', a.effort,
    '--max-budget-usd', String(a.max_budget_usd),
    '--session-id', sessionId,
    '--output-format', 'stream-json',
    '--verbose',
    '--include-hook-events',
    '--dangerously-skip-permissions',
    '--strict-mcp-config',
    '--mcp-config', EMPTY_MCP_CONFIG,
  ];
  if (a.settings_file !== null) args.push('--settings', path.resolve(labRoot, a.settings_file));
  args.push('--disallowedTools', ...a.disallowed_tools);
  return args;
}

// 허용 목록만 넘긴다. 실행자 환경의 ANTHROPIC_MODEL, CLAUDE_CODE_EFFORT_LEVEL 같은 값은 들어가지 않는다.
// PATH · HOME 은 3단계 host 골격에서만 실행자 값을 쓴다. 컨테이너에서는 이미지 값을 쓴다(실행 계약 §3)
export function agentEnv(config: ExecConfig, configDir: string, host: NodeJS.ProcessEnv): Record<string, string> {
  const env: Record<string, string> = {
    TZ: 'Asia/Seoul',
    LANG: 'ko_KR.UTF-8',
    DISABLE_AUTOUPDATER: '1',
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
    CLAUDE_CODE_SUBAGENT_MODEL: config.agent.subagent_model,
    CLAUDE_CODE_SUBAGENT_MODEL_FORCE: '1',
    CLAUDE_CONFIG_DIR: configDir,
  };
  // 구독 인증 token 만 넘긴다. ANTHROPIC_API_KEY 를 넘기면 API 과금 인증으로 바뀔 수 있다(실행 계약 §4.4)
  // CLAUDE_CODE_OAUTH_TOKEN 보다 우선하는 인증 수단(ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, CLAUDE_CODE_USE_*)은 허용 목록에 넣지 않는다
  for (const name of ['PATH', 'HOME', 'CLAUDE_CODE_OAUTH_TOKEN']) {
    const v = host[name];
    if (v !== undefined) env[name] = v;
  }
  return env;
}

export interface StreamSummary {
  init_model: string | null;
  result: Record<string, unknown> | null;
  tool_calls: Record<string, number>;
  last_bash_command: string | null;
  api_retries: number;
  unparsed_lines: number;
}

// stream-json 원본에서 필요한 값만 읽는다. 형식은 공식 문서 기준이며 실제 출력으로 확인하지 않았다(실행 계약 §10)
export function summarizeStream(text: string): StreamSummary {
  const s: StreamSummary = { init_model: null, result: null, tool_calls: {}, last_bash_command: null, api_retries: 0, unparsed_lines: 0 };
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(line) as Record<string, unknown>;
    } catch {
      s.unparsed_lines++;
      continue;
    }
    if (m === null || typeof m !== 'object' || Array.isArray(m)) {
      s.unparsed_lines++;
      continue;
    }
    if (m.type === 'system' && m.subtype === 'init' && typeof m.model === 'string') s.init_model = m.model;
    if (m.type === 'api_retry' || (m.type === 'system' && m.subtype === 'api_retry')) s.api_retries++;
    if (m.type === 'result') s.result = m;
    if (m.type === 'assistant') {
      const content = (m.message as { content?: unknown } | undefined)?.content;
      if (Array.isArray(content)) {
        for (const block of content as ({ type?: string; name?: string; input?: { command?: unknown } } | null)[]) {
          if (block?.type === 'tool_use' && typeof block.name === 'string') {
            s.tool_calls[block.name] = (s.tool_calls[block.name] ?? 0) + 1;
            if (block.name === 'Bash' && typeof block.input?.command === 'string') s.last_bash_command = block.input.command;
          }
        }
      }
    }
  }
  return s;
}

export type ErrorKind = 'budget_exceeded' | 'api_error' | 'usage_limit' | 'signal' | 'other';

export type AgentClass =
  | { state: 'agent_succeeded'; error_kind: null }
  | { state: 'agent_failed'; error_kind: ErrorKind }
  | { state: 'timed_out'; error_kind: null }
  | { state: 'harness_failed'; stage: Stage; reason: string };

// 구조화된 필드만 본다. CLI 2.1.287 은 API 오류를 is_error 와 api_error_status(HTTP 상태 숫자)로 낸다(설치된 CLI 의 result schema 로 확인).
// 보조로 오류 result 의 subtype · error · errors, `API Error:` 로 시작하는 result 문구와 stderr 줄을 본다.
// Agent 가 쓴 문장과 그 밖의 stderr 는 보지 않는다. 문장 속 숫자(500,000원)나 stack trace 줄 번호가 API 오류로 읽히기 때문이다
// 구독 사용 한도 도달 문구. 공식 문서 https://code.claude.com/docs/en/errors 의 "You've hit your session limit · resets 3:45pm" 형식
const USAGE_LIMIT = /^You've hit your [A-Za-z]+ limit\b/;

function errorKind(result: Record<string, unknown> | null, stderr: string): ErrorKind {
  const resultText = result !== null && result.is_error === true && typeof result.result === 'string' ? result.result.trim() : '';
  if (USAGE_LIMIT.test(resultText) || stderr.split('\n').some((l) => USAGE_LIMIT.test(l.trim()))) return 'usage_limit';
  if (result !== null && result.is_error === true && typeof result.api_error_status === 'number') {
    const status = result.api_error_status;
    if (status === 429 || status >= 500) return 'api_error';
  }
  const fields: string[] = [];
  if (result !== null) {
    if (typeof result.subtype === 'string') fields.push(result.subtype);
    if (typeof result.error === 'string') fields.push(result.error);
    if (Array.isArray(result.errors)) fields.push(...result.errors.filter((e): e is string => typeof e === 'string'));
    if (result.is_error === true && typeof result.result === 'string' && result.result.startsWith('API Error:')) fields.push(result.result);
  }
  const apiLines = stderr.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('API Error:'));
  if (fields.some((f) => /budget/i.test(f))) return 'budget_exceeded';
  const api = /^API Error: (429|5\d\d)\b|overloaded|rate[ _-]?limit|ECONNRESET|ETIMEDOUT/i;
  if ([...fields, ...apiLines].some((f) => api.test(f))) return 'api_error';
  return 'other';
}

// Agent process 의 종료를 실행 계약 §6.3 의 상태로 나눈다. 외부 원인 근거로 쓰는 것은 잠자기 감지뿐이다.
// 컨테이너 단계에서 OOM · Docker daemon 재시작 근거를 더한다
export function classifyAgent(p: ProcessResult, stream: StreamSummary, stderr: string): AgentClass {
  if (p.spawn_error !== null) return { state: 'harness_failed', stage: 'agent_start', reason: `Agent 를 시작하지 못했다: ${p.spawn_error}` };
  if (p.suspended) return { state: 'harness_failed', stage: 'agent', reason: `host 잠자기 감지(wall ${p.wall_ms}ms, monotonic ${p.mono_ms}ms)` };
  if (p.timed_out) return { state: 'timed_out', error_kind: null };
  if (p.signal !== null) return { state: 'agent_failed', error_kind: 'signal' };
  const resultError = stream.result !== null && (stream.result.is_error === true || (typeof stream.result.subtype === 'string' && stream.result.subtype !== 'success'));
  if (p.exit_code === 0 && !resultError) return { state: 'agent_succeeded', error_kind: null };
  return { state: 'agent_failed', error_kind: errorKind(stream.result, stderr) };
}
