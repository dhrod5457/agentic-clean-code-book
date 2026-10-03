import { execFileSync } from 'node:child_process';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { ExecConfig, RunSpec, TaskDef } from '../src/config.ts';
import type { Probe } from '../src/fingerprint.ts';
import type { RunOptions } from '../src/run.ts';

// 가짜 Agent · 가짜 채점 스크립트와 임시 저장소. 실제 Claude 와 Variant 애플리케이션 없이 orchestration 만 시험한다

const created: string[] = [];
// 시험의 가짜 Agent 는 구독 token 이 있어야 준비 단계 인증 확인을 통과한다.
// 실행자 shell 의 실제 token 이 가짜 Agent 기록에 남지 않게 시험 값으로 덮어쓰고, 끝나면 되돌린다
const hostToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
process.env.CLAUDE_CODE_OAUTH_TOKEN = 'oauth-test';
process.on('exit', () => {
  if (hostToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  else process.env.CLAUDE_CODE_OAUTH_TOKEN = hostToken;
});
// 시험 process 가 끝나면 이 파일이 만든 임시 디렉터리를 지운다
process.on('exit', () => {
  for (const dir of created) rmSync(dir, { recursive: true, force: true });
});

export function tmp(prefix = 'harness-'): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

export function writeScript(file: string, body: string): string {
  writeFileSync(file, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(file, 0o755);
  return file;
}

export function sourceRepo(): { repo: string; commit: string } {
  const repo = path.join(tmp('source-'), 'shop-admin');
  execFileSync('mkdir', ['-p', repo]);
  const git = (...args: string[]) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
  git('init', '--quiet', '-b', 'main');
  writeFileSync(path.join(repo, 'README.md'), 'shop admin\n');
  writeFileSync(path.join(repo, '.gitignore'), 'build/\n');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'Initial commit', '--', 'README.md', '.gitignore');
  return { repo, commit: git('rev-parse', 'HEAD') };
}

export const STREAM_OK = [
  { type: 'system', subtype: 'init', model: 'claude-opus-5-5', session_id: 's' },
  { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: {} }, { type: 'tool_use', name: 'Edit', input: {} }] } },
  { type: 'system', subtype: 'api_retry', retry_number: 1 },
  { type: 'assistant', message: { content: [{ type: 'text', text: 'ok' }, { type: 'tool_use', name: 'Bash', input: {} }] } },
  {
    type: 'result', subtype: 'success', is_error: false, duration_ms: 1234, num_turns: 3, total_cost_usd: 0.42,
    usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 2000 },
    modelUsage: { 'claude-opus-5-5': {}, 'claude-haiku-4-5': {} },
  },
].map((m) => JSON.stringify(m)).join('\n') + '\n';

export const JUNIT_PASS = '<testsuites id="" name="" tests="2" failures="0" skipped="0" errors="0" time="1.0"><testsuite name="s" tests="2"><testcase name="t1" classname="s"></testcase><testcase name="t2" classname="s"></testcase></testsuite></testsuites>';
export const JUNIT_FAIL = '<testsuites id="" name="" tests="2" failures="1" skipped="0" errors="0" time="1.0"><testsuite name="s" tests="2"><testcase name="t1" classname="s"></testcase><testcase name="버튼 &amp; 표" classname="s"><failure message="x">x</failure></testcase></testsuite></testsuites>';

// harness 저장소 대신 쓰는 깨끗한 임시 저장소. lab/ 미commit 변경 검사가 실제 작업 트리 상태에 의존하지 않게 한다
export function labRepo(): string {
  const root = tmp('lab-');
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
  git('init', '--quiet', '-b', 'main');
  execFileSync('mkdir', ['-p', path.join(root, 'lab')]);
  writeFileSync(path.join(root, 'lab', 'README.md'), 'lab\n');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'lab', '--', 'lab/README.md');
  return root;
}

export interface Fixture {
  dir: string;
  labRoot: string;
  resultsRoot: string;
  source: { repo: string; commit: string };
  argvFile: string;
  envFile: string;
  gradingCalls: string;
  config: ExecConfig;
  tasks: Record<string, TaskDef>;
  opts: RunOptions;
  spec: (over?: Partial<RunSpec>) => RunSpec;
  prompt: string;
}

let nextPort = 21000 + Math.floor(Math.random() * 2000);

// agentBody: 가짜 Agent 의 셸 본문. 작업 디렉터리에서 실행되고 $STREAM 으로 정상 stream 파일 경로를 받는다
// graderBody: 가짜 run.sh 본문. $GRADING_LOG_DIR, $suite, $name 을 쓴다
export function fixture(agentBody: string, graderBody = 'pass'): Fixture {
  const dir = tmp();
  const resultsRoot = path.join(dir, 'results');
  const argvFile = path.join(dir, 'agent.argv');
  const envFile = path.join(dir, 'agent.env');
  const gradingCalls = path.join(dir, 'grading.calls');
  const stream = path.join(dir, 'stream.jsonl');
  writeFileSync(stream, STREAM_OK);
  writeFileSync(path.join(dir, 'pass.xml'), JUNIT_PASS);
  writeFileSync(path.join(dir, 'fail.xml'), JUNIT_FAIL);
  const prompt = path.join(dir, 'prompt.md');
  writeFileSync(prompt, '다음 요청을 처리해 줘.\n\nVIP 회원 무료배송 기준을 바꿔 줘.\n');

  const agent = writeScript(path.join(dir, 'fake-claude'), [
    'if [ "$1" = "--version" ]; then echo "2.1.287 (Claude Code)"; exit 0; fi',
    // claude auth status --json 흉내: 구독 token 이 있고 API key 가 없을 때만 oauth_token
    'if [ "$1" = "auth" ]; then if [ -n "$ANTHROPIC_API_KEY" ]; then m=api_key; elif [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then m=oauth_token; else m=none; fi; echo "{\\"loggedIn\\":true,\\"authMethod\\":\\"$m\\"}"; exit 0; fi',
    `printf '%s\\0' "$@" > "${argvFile}"`,
    `env > "${envFile}"`,
    `STREAM="${stream}"`,
    agentBody,
  ].join('\n'));
  const graderBodies: Record<string, string> = {
    pass: `cp "${dir}/pass.xml" "$GRADING_LOG_DIR/junit-$name.xml"`,
    fail: `cp "${dir}/fail.xml" "$GRADING_LOG_DIR/junit-$name.xml"; exit 1`,
    error: 'echo "jar 가 없다" >&2; exit 1',
  };
  const grader = writeScript(path.join(dir, 'fake-run.sh'), [
    'suite="$3"; name="${suite//\\//-}"',
    `echo "$1|$2|$3|\${GRADING_SKIP_BUILD:-0}" >> "${gradingCalls}"`,
    graderBodies[graderBody] ?? graderBody,
  ].join('\n'));

  const config: ExecConfig = {
    id: 'exec-test',
    agent: {
      executable: agent, version: '2.1.287', model: 'claude-opus-5-5', subagent_model: 'claude-opus-5-5',
      effort: 'medium', max_budget_usd: 15, disallowed_tools: ['WebSearch', 'WebFetch'], settings_file: null, hook_files: [],
    },
    timeouts_ms: { prepare: 30_000, agent: 10_000, grace: 300, grading_normative: 10_000, grading_diagnostic: 10_000 },
    retry: { max_attempts: 3 },
    grading: { run_script: grader },
    environment: { runtime: 'local', image: null, platform: 'linux/arm64', cpus: 4, memory: '8g', grading_network: 'bridge' },
  };
  const tasks: Record<string, TaskDef> = {
    exp1: { experiment: 'exp1', prompt, grading: { normative: ['exp1'], diagnostic: [] } },
    exp3: { experiment: 'exp3', prompt, grading: { normative: ['exp3'], diagnostic: ['diag-exp3-1024'] } },
  };
  const probe: Probe = async (argv) => {
    const out: Record<string, string> = {
      java: 'openjdk version "25.0.4" 2026-07-15 LTS\n',
      node: 'v24.21.0\n',
      pnpm: '10.34.6\n',
    };
    if (argv[0] === agent) return { exit_code: 0, output: '2.1.287 (Claude Code)\n', error: null };
    return { exit_code: 0, output: out[argv[0]] ?? '', error: null };
  };
  const source = sourceRepo();
  const port = nextPort++;
  const labRoot = labRepo();
  return {
    dir, labRoot, resultsRoot, source, argvFile, envFile, gradingCalls, config, tasks, prompt,
    opts: { resultsRoot, config, tasks, probe, labRoot },
    spec: (over = {}) => ({ experiment: 'exp1', task: 'exp1', variant: 'a', repetition: 1, source, port, ...over }),
  };
}

// 작업 디렉터리를 바꾸고 정상 stream 을 내는 Agent
export const AGENT_OK = 'echo "changed" >> README.md; echo "new" > added.txt; cat "$STREAM"';

export function readArgv(file: string): string[] {
  return readFileSync(file, 'utf8').split('\0').slice(0, -1);
}

export function readEnv(file: string): Record<string, string> {
  return Object.fromEntries(readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
}
