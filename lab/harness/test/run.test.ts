import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { SpecError } from '../src/config.ts';
import { buildResult, RAW } from '../src/normalize.ts';
import { executeRun, executeWithRetry } from '../src/run.ts';
import type { Clock } from '../src/process.ts';
import { AGENT_OK, fixture, readArgv, readEnv, STREAM_OK, tmp } from './helpers.ts';

const API_ERROR = `echo '{"type":"result","subtype":"error","is_error":true,"error":"API Error: 529 overloaded","usage":{}}'; exit 1`;

function states(result: { state_history: { state: string }[] }): string[] {
  return result.state_history.map((s) => s.state);
}

test('정상 실행: 상태 이력, run.json 과 result.json, 사용량 · diff · 채점 결과를 남긴다', async () => {
  const f = fixture(AGENT_OK);
  const { runDir, result } = await executeRun(f.spec(), f.opts);

  assert.deepEqual(states(result), ['prepared', 'running', 'agent_succeeded', 'grading_succeeded', 'completed']);
  assert.deepEqual(result.identity, { experiment: 'exp1', task: 'exp1', variant: 'a', repetition: 1, attempt: 1, retry_of: null });
  assert.equal(result.source_commit, f.source.commit);
  assert.equal(result.agent.exit_code, 0);
  assert.deepEqual(result.agent.usage, { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 10, cache_read_input_tokens: 2000 });
  assert.equal(result.agent.total_cost_usd, 0.42);
  assert.deepEqual(result.agent.tool_calls, { total: 3, by_name: { Bash: 1, Edit: 1, Read: 1 } });
  assert.equal(result.agent.api_retries, 1);
  assert.deepEqual(result.agent.models.other_than_configured, ['claude-haiku-4-5']);
  assert.deepEqual(result.diff, { files: { added: 1, modified: 1, deleted: 0, renamed: 0, other: 0, total: 2 }, lines: { added: 2, deleted: 0, binary_files: 0 } });
  assert.equal(result.grading.outcome, 'passed');
  assert.deepEqual(result.grading.normative.map((s: { suite: string; status: string; tests: number }) => [s.suite, s.status, s.tests]), [['exp1', 'passed', 2]]);
  assert.deepEqual(result.environment.agent_env, { java: '25.0.4', node: '24.21.0', pnpm: '10.34.6', claude_code: '2.1.287' });
  assert.equal(result.environment.effort, 'medium');
  assert.equal(result.environment.host.node_version, process.version);
  assert.equal(result.environment.harness_lab_dirty, false);
  // 시작 시각은 준비 단계 전, 실행 디렉터리를 만든 시각이다
  assert.ok(Date.parse(result.started_at) <= Date.parse(result.state_history[0].at));

  const run = JSON.parse(readFileSync(path.join(runDir, 'run.json'), 'utf8'));
  assert.equal(run.identity.variant, 'a');
  assert.equal(run.task.prompt_sha256.length, 64);
  assert.equal(run.execution_config.agent.model, 'claude-opus-5-5');
  assert.match(run.condition_hash, /^[0-9a-f]{64}$/);
  // 실행 ID 에는 실험 · Variant 이름이 없다
  assert.match(result.run_id, /^\d{8}T\d{6}Z-[0-9a-f]{6}$/);
});

test('원본 stdout 은 Agent 가 쓴 바이트 그대로이고, result.json 은 원본에서 같은 바이트로 다시 만들어진다', async () => {
  const f = fixture(AGENT_OK);
  const { runDir } = await executeRun(f.spec(), f.opts);
  assert.equal(readFileSync(path.join(runDir, RAW.agentStdout), 'utf8'), STREAM_OK);
  assert.equal(readFileSync(path.join(runDir, RAW.agentRecv), 'utf8').trim().split('\n').length, STREAM_OK.trim().split('\n').length);
  const written = readFileSync(path.join(runDir, 'result.json'), 'utf8');
  rmSync(path.join(runDir, 'result.json'));
  assert.equal(buildResult(runDir), written);
  // 정규화 결과는 원본 디렉터리 밖(실행 디렉터리 최상위)에 있다
  assert.equal(existsSync(path.join(runDir, 'raw', 'result.json')), false);
});

test('작업 디렉터리는 source commit 이고 origin 이 없으며, 채점은 final.patch 를 적용한 별도 복사본으로 한다', async () => {
  const f = fixture(AGENT_OK);
  const { runDir } = await executeRun(f.spec(), f.opts);
  const ws = path.join(runDir, 'workspace/shop-admin');
  assert.equal(execFileSync('git', ['-C', ws, 'remote'], { encoding: 'utf8' }), '');
  const gws = path.join(runDir, 'grading-workspace/0/shop-admin');
  assert.equal(readFileSync(path.join(gws, 'README.md'), 'utf8'), 'shop admin\nchanged\n');
  assert.equal(readFileSync(path.join(gws, 'added.txt'), 'utf8'), 'new\n');
  const calls = readFileSync(f.gradingCalls, 'utf8').trim().split('\n');
  assert.deepEqual(calls, [`${gws}|${f.spec().port}|exp1|0`]);
});

test('Variant a 와 b 의 Agent 실행 인자 · 환경 변수는 세션 ID 와 설정 디렉터리 경로 외에 같다', async () => {
  process.env.ANTHROPIC_MODEL = 'claude-haiku-4-5';
  process.env.CLAUDE_CODE_EFFORT_LEVEL = 'max';
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
  try {
    const seen: { argv: string[]; env: Record<string, string> }[] = [];
    for (const variant of ['a', 'b']) {
      const f = fixture(AGENT_OK);
      await executeRun(f.spec({ variant }), f.opts);
      seen.push({ argv: readArgv(f.argvFile), env: readEnv(f.envFile) });
    }
    const mask = (argv: string[]) => argv.map((v, i) => (argv[i - 1] === '--session-id' ? '<id>' : v));
    assert.deepEqual(mask(seen[0].argv), mask(seen[1].argv));
    const argv = seen[0].argv;
    assert.equal(argv[0], '-p');
    assert.equal(argv[1], '다음 요청을 처리해 줘.\n\nVIP 회원 무료배송 기준을 바꿔 줘.\n');
    assert.deepEqual(argv.slice(argv.indexOf('--model'), argv.indexOf('--model') + 4), ['--model', 'claude-opus-5-5', '--effort', 'medium']);
    assert.deepEqual(argv.slice(-3), ['--disallowedTools', 'WebSearch', 'WebFetch']);
    for (const { env } of seen) {
      assert.equal(env.ANTHROPIC_MODEL, undefined);
      assert.equal(env.CLAUDE_CODE_EFFORT_LEVEL, undefined);
      // 구독 token 만 넘기고 API key 는 넘기지 않는다
      assert.equal(env.ANTHROPIC_API_KEY, undefined);
      assert.equal(env.CLAUDE_CODE_OAUTH_TOKEN, 'oauth-test');
      assert.equal(env.CLAUDE_CODE_SUBAGENT_MODEL, 'claude-opus-5-5');
      assert.equal(env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE, '1');
    }
    const keys = (e: Record<string, string>) => Object.keys(e).filter((k) => !['PWD', 'SHLVL', '_', 'OLDPWD'].includes(k)).sort();
    assert.deepEqual(keys(seen[0].env), keys(seen[1].env));
  } finally {
    delete process.env.ANTHROPIC_MODEL;
    delete process.env.CLAUDE_CODE_EFFORT_LEVEL;
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('Agent 가 오류로 끝나도 채점은 실행하고, 관찰 결과라 다시 실행하지 않는다', async () => {
  const f = fixture(`${AGENT_OK}; echo '{"type":"result","subtype":"error","is_error":true,"error":"tool failed"}'; exit 1`);
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  const { result } = runs[0];
  assert.deepEqual(states(result), ['prepared', 'running', 'agent_failed', 'grading_succeeded', 'completed']);
  assert.equal(result.agent.error_kind, 'other');
  assert.equal(result.agent.exit_code, 1);
});

test('Agent 가 스스로 받은 signal 로 끝나면 agent_failed(signal) 이고 다시 실행하지 않는다', async () => {
  const f = fixture(`${AGENT_OK}; echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"npm test"}}]}}'; kill -KILL $$`);
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].result.agent.outcome, 'agent_failed');
  assert.equal(runs[0].result.agent.error_kind, 'signal');
  assert.equal(runs[0].result.agent.signal, 'SIGKILL');
  assert.equal(runs[0].result.agent.last_bash_command, 'npm test');
});

test('API 오류로 끝난 실행은 새 attempt 로 다시 실행하고, 끝까지 API 오류면 결측으로 표시한다', async () => {
  const f = fixture(API_ERROR);
  const { runs, missing } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 3);
  assert.equal(missing, true);
  assert.deepEqual(runs.map((r) => r.result.identity.attempt), [1, 2, 3]);
  assert.deepEqual(runs.map((r) => r.result.identity.retry_of), [null, runs[0].runId, runs[1].runId]);
  assert.ok(runs.every((r) => r.result.agent.error_kind === 'api_error'));
  assert.equal(new Set(runs.map((r) => r.runDir)).size, 3);
});

test('시간 제한을 넘은 Agent 는 timed_out 이고 남은 변경을 채점한다', async () => {
  const f = fixture(`echo "partial" >> README.md; trap '' TERM; sleep 30`);
  f.config.timeouts_ms.agent = 500;
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  const { result } = runs[0];
  assert.deepEqual(states(result), ['prepared', 'running', 'timed_out', 'grading_succeeded', 'completed']);
  assert.equal(result.agent.timed_out, true);
  assert.equal(result.diff.files.modified, 1);
});

test('판정 채점의 실패 시험은 grading_failed 와 실패 시험 이름으로 남는다', async () => {
  const f = fixture(AGENT_OK, 'fail');
  const { result } = await executeRun(f.spec(), f.opts);
  assert.equal(result.state, 'completed');
  assert.ok(states(result).includes('grading_failed'));
  assert.equal(result.grading.outcome, 'failed');
  assert.deepEqual(result.grading.normative[0].failed_tests, ['버튼 & 표']);
});

test('채점이 결과 없이 실패하면(build 실패 등) 묶음 error 로 grading_failed 다', async () => {
  const f = fixture(AGENT_OK, 'error');
  const { result } = await executeRun(f.spec(), f.opts);
  assert.ok(states(result).includes('grading_failed'));
  assert.equal(result.grading.normative[0].status, 'error');
});

test('판정 채점 시간 초과는 1회 다시 실행하고, 또 넘으면 timed_out 으로 grading_failed 다', async () => {
  const f = fixture(AGENT_OK, 'sleep 30');
  f.config.timeouts_ms.grading_normative = 400;
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  const s = runs[0].result.grading.normative[0];
  assert.equal(s.status, 'timed_out');
  assert.equal(s.tries, 2);
  assert.ok(states(runs[0].result).includes('grading_failed'));
  // 시간 초과 뒤 다시 실행할 때는 build 를 건너뛰지 않는다
  assert.deepEqual(readFileSync(f.gradingCalls, 'utf8').trim().split('\n').map((l) => l.split('|')[3]), ['0', '0']);
});

test('진단 묶음의 실패와 시간 초과는 기록만 하고 판정 · 상태에 영향이 없다', async () => {
  const f = fixture(AGENT_OK, `if [ "$suite" = "diag-exp3-1024" ]; then sleep 30; fi; cp "${'$'}(dirname "$0")/pass.xml" "$GRADING_LOG_DIR/junit-$name.xml"`);
  f.config.timeouts_ms.grading_diagnostic = 400;
  const { result } = await executeRun(f.spec({ experiment: 'exp3', task: 'exp3' }), f.opts);
  assert.deepEqual(states(result), ['prepared', 'running', 'agent_succeeded', 'grading_succeeded', 'completed']);
  assert.equal(result.grading.outcome, 'passed');
  assert.deepEqual(result.grading.diagnostic.map((s: { suite: string; status: string }) => [s.suite, s.status]), [['diag-exp3-1024', 'timed_out']]);
  assert.deepEqual(result.grading.normative.map((s: { suite: string }) => s.suite), ['exp3']);
  // 진단 묶음은 판정 묶음 뒤에 build 없이 실행된다
  assert.deepEqual(readFileSync(f.gradingCalls, 'utf8').trim().split('\n').map((l) => [l.split('|')[2], l.split('|')[3]]), [['exp3', '0'], ['diag-exp3-1024', '1']]);
});

test('진단 묶음 결과가 실패여도 판정 결과는 통과로 남는다', async () => {
  const f = fixture(AGENT_OK, `if [ "$suite" = "diag-exp3-1024" ]; then cp "${'$'}(dirname "$0")/fail.xml" "$GRADING_LOG_DIR/junit-$name.xml"; exit 1; fi; cp "${'$'}(dirname "$0")/pass.xml" "$GRADING_LOG_DIR/junit-$name.xml"`);
  const { runs } = await executeWithRetry(f.spec({ experiment: 'exp3', task: 'exp3' }), f.opts);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].result.grading.outcome, 'passed');
  assert.equal(runs[0].result.grading.diagnostic[0].status, 'failed');
});

test('Agent 종료 뒤 채점을 시작하지 못하면 harness_failed(after_agent) 이고, Agent 는 다시 실행하지 않으며 원본과 diff 는 남는다', async () => {
  const f = fixture(AGENT_OK);
  f.config.grading.run_script = path.join(f.dir, 'missing-run.sh');
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  const { runDir, result } = runs[0];
  assert.equal(result.state, 'harness_failed');
  assert.equal(result.harness_failure.stage, 'after_agent');
  assert.match(result.harness_failure.reason, /run\.sh 를 시작하지 못했다/);
  // 판정을 내지 못한 채점은 채점 실패로 기록하지 않는다(채점 결측)
  assert.equal(result.grading.outcome, null);
  assert.equal(result.grading.normative[0].status, null);
  assert.equal(result.agent.outcome, 'agent_succeeded');
  for (const rel of ['artifacts/final.patch', RAW.agentStdout, RAW.events]) assert.ok(existsSync(path.join(runDir, rel)), rel);
  assert.equal(result.paths.artifacts.patch, 'artifacts/final.patch');
  assert.match(readFileSync(path.join(runDir, 'artifacts/final.patch'), 'utf8'), /\+changed/);
});

test('채점 port 를 다른 process 가 쓰고 있으면 harness_failed(after_agent) 다', async () => {
  const f = fixture(AGENT_OK);
  const { createServer } = await import('node:net');
  const server = createServer();
  await new Promise<void>((r) => server.listen(f.spec().port, r));
  try {
    const { result } = await executeRun(f.spec(), f.opts);
    assert.equal(result.state, 'harness_failed');
    assert.equal(result.harness_failure.stage, 'after_agent');
  } finally {
    server.close();
  }
});

test('Agent 실행 파일이 없으면 준비 단계(인증 확인)에서 harness_failed(prepare) 이고 새 attempt 로 다시 실행한다', async () => {
  const f = fixture(AGENT_OK);
  f.config.retry.max_attempts = 2;
  f.opts.probe = async () => ({ exit_code: 0, output: '2.1.287 (Claude Code)\nopenjdk version "25.0.4"\n', error: null });
  f.config.agent.executable = path.join(f.dir, 'missing-claude');
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 2);
  assert.ok(runs.every((r) => r.result.state === 'harness_failed' && r.result.harness_failure.stage === 'prepare'));
});

test('Claude Code 버전이 실행 설정과 다르면 Agent 를 실행하지 않고 harness_failed(prepare) 다', async () => {
  const f = fixture(AGENT_OK);
  f.opts.probe = async (argv) => ({ exit_code: 0, output: argv[0] === f.config.agent.executable ? '2.1.300 (Claude Code)\n' : '1.0.0\n', error: null });
  const { result } = await executeRun(f.spec(), f.opts);
  assert.deepEqual(states(result), ['harness_failed']);
  assert.equal(result.harness_failure.stage, 'prepare');
  assert.match(result.harness_failure.reason, /2\.1\.300/);
  assert.equal(existsSync(f.argvFile), false, 'Agent 가 실행되면 안 된다');
});

test('없는 source commit 이면 준비 단계에서 harness_failed(prepare) 다', async () => {
  const f = fixture(AGENT_OK);
  const { result } = await executeRun(f.spec({ source: { repo: f.source.repo, commit: 'f'.repeat(40) } }), f.opts);
  assert.equal(result.state, 'harness_failed');
  assert.equal(result.harness_failure.stage, 'prepare');
  assert.equal(existsSync(f.argvFile), false);
});

test('준비 중 host 잠자기가 감지되면 harness_failed(prepare) 이고 새 attempt 대상이다', async () => {
  const f = fixture(AGENT_OK);
  let calls = 0;
  const clock: Clock = { wall: () => Date.now() + calls++ * 61_000, mono: () => performance.now() };
  f.config.retry.max_attempts = 2;
  const { runs } = await executeWithRetry(f.spec(), { ...f.opts, clock });
  assert.equal(runs.length, 2);
  assert.equal(runs[0].result.harness_failure.stage, 'prepare');
  assert.match(runs[0].result.harness_failure.reason, /잠자기/);
});

test('같은 입력의 실행을 동시에 시작해도 실행 디렉터리와 작업 디렉터리가 따로 생긴다', async () => {
  const f = fixture(`echo "$$" > pid.txt; ${AGENT_OK}`);
  const [r1, r2] = await Promise.all([
    executeRun(f.spec(), f.opts),
    executeRun(f.spec({ port: f.spec().port + 1000 }), f.opts),
  ]);
  assert.notEqual(r1.runDir, r2.runDir);
  assert.equal(r1.result.state, 'completed');
  assert.equal(r2.result.state, 'completed');
  const pid = (r: { runDir: string }) => readFileSync(path.join(r.runDir, 'workspace/shop-admin/pid.txt'), 'utf8');
  assert.notEqual(pid(r1), pid(r2));
  assert.equal(readdirSync(path.join(f.resultsRoot, 'runs')).length, 2);
});

test('이미 있는 실행 ID 로 시작하면 거부하고 기존 실행 디렉터리를 바꾸지 않는다', async () => {
  const f = fixture(AGENT_OK);
  const opts = { ...f.opts, newRunId: () => '20261003T000000Z-aaaaaa' };
  const first = await executeRun(f.spec(), opts);
  const before = readFileSync(path.join(first.runDir, 'result.json'), 'utf8');
  await assert.rejects(executeRun(f.spec({ repetition: 2 }), opts), /EEXIST/);
  assert.equal(readFileSync(path.join(first.runDir, 'result.json'), 'utf8'), before);
  assert.equal(JSON.parse(readFileSync(path.join(first.runDir, 'run.json'), 'utf8')).identity.repetition, 1);
});

test('같은 실험 ID 에서 실행 조건이 바뀌면 실행 디렉터리를 만들기 전에 거부한다', async () => {
  const f = fixture(AGENT_OK);
  await executeRun(f.spec(), f.opts);
  const changed = { ...f.config, agent: { ...f.config.agent, effort: 'high' } };
  await assert.rejects(executeRun(f.spec({ repetition: 2 }), { ...f.opts, config: changed }), SpecError);
  assert.equal(readdirSync(path.join(f.resultsRoot, 'runs')).length, 1);
  // 재시작 ID 로는 새 조건을 쓸 수 있다
  const { result } = await executeRun(f.spec({ experiment: 'exp1.r2' }), { ...f.opts, config: changed });
  assert.equal(result.environment.effort, 'high');
});

test('결과 root 가 Git 작업 트리 안이면 시작하지 않는다', async () => {
  const f = fixture(AGENT_OK);
  const repo = tmp('repo-');
  execFileSync('git', ['init', '--quiet', repo]);
  const inside = path.join(repo, 'results');
  mkdirSync(inside);
  await assert.rejects(executeRun(f.spec(), { ...f.opts, resultsRoot: inside }), SpecError);
  assert.equal(existsSync(path.join(inside, 'runs')), false);
});

test('과제와 실험이 맞지 않는 입력은 실행을 시작하지 않는다', async () => {
  const f = fixture(AGENT_OK);
  await assert.rejects(executeRun(f.spec({ experiment: 'exp2' }), f.opts), /exp1 의 과제/);
  await assert.rejects(executeRun(f.spec({ variant: 'c' }), f.opts), SpecError);
  assert.equal(existsSync(path.join(f.resultsRoot, 'runs')), false);
});

test('작업 디렉터리의 .git 에 원본 저장소 경로와 host 사용자 정보가 남지 않는다', async () => {
  const f = fixture(AGENT_OK);
  const { runDir } = await executeRun(f.spec(), f.opts);
  const gitDir = path.join(runDir, 'workspace/shop-admin/.git');
  // grep 은 일치가 없으면 exit 1 이다
  const r = spawnSync('grep', ['-rlF', '-e', f.source.repo, '-e', os.userInfo().username, gitDir], { encoding: 'utf8' });
  assert.equal(r.status, 1, r.stdout);
});

test('host 전역 git 설정(excludesfile)은 최종 diff 에 영향을 주지 않는다', async () => {
  const f = fixture(`echo '{}' > package-lock.json; ${AGENT_OK}`);
  const globalConfig = path.join(f.dir, 'gitconfig');
  const excludes = path.join(f.dir, 'gitignore_global');
  writeFileSync(excludes, 'package-lock.json\n');
  writeFileSync(globalConfig, `[core]\n\texcludesFile = ${excludes}\n`);
  process.env.GIT_CONFIG_GLOBAL = globalConfig;
  try {
    const { runDir } = await executeRun(f.spec(), f.opts);
    assert.match(readFileSync(path.join(runDir, 'artifacts/diff-name-status.txt'), 'utf8'), /^A\tpackage-lock\.json$/m);
  } finally {
    delete process.env.GIT_CONFIG_GLOBAL;
  }
});

test('Agent 가 작업 디렉터리의 .git 을 지우거나 잠가도 최종 diff 를 만들고 채점한다', async () => {
  for (const body of ['rm -rf .git', 'touch .git/index.lock']) {
    const f = fixture(`${AGENT_OK}; ${body}`);
    const { result } = await executeRun(f.spec(), f.opts);
    assert.equal(result.state, 'completed', body);
    assert.equal(result.diff.files.total, 2, body);
    assert.equal(result.grading.outcome, 'passed', body);
  }
});

test('run.sh 가 harness 시간 초과가 아닌 중단(exit 130)으로 끝나면 harness_failed(after_agent) 이고 채점 결측이다', async () => {
  const f = fixture(AGENT_OK, 'exit 130');
  const { runs } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].result.state, 'harness_failed');
  assert.equal(runs[0].result.harness_failure.stage, 'after_agent');
  assert.equal(runs[0].result.grading.outcome, null);
});

test('실행자 환경의 GRADING_SKIP_BUILD 는 채점에 넘어가지 않고 첫 호출은 build 한다', async () => {
  const f = fixture(AGENT_OK);
  process.env.GRADING_SKIP_BUILD = '1';
  try {
    await executeRun(f.spec(), f.opts);
  } finally {
    delete process.env.GRADING_SKIP_BUILD;
  }
  assert.equal(readFileSync(f.gradingCalls, 'utf8').trim().split('|')[3], '0');
});

test('준비에 실패한 실행에도 환경 기록과 실행 시작 시각이 남는다', async () => {
  const f = fixture(AGENT_OK);
  const { result } = await executeRun(f.spec({ source: { repo: f.source.repo, commit: 'f'.repeat(40) } }), f.opts);
  assert.equal(result.state, 'harness_failed');
  assert.equal(result.environment.host.node_version, process.version);
  assert.equal(result.environment.agent_env.claude_code, '2.1.287');
  // 준비 단계(fingerprint, clone) 시간이 경과 시간에 들어간다. 시작 시각을 첫 상태 시각으로 잡으면 0 이 된다
  assert.ok(result.wall_ms > 0, `wall_ms ${result.wall_ms}`);
  // 원인 문구의 경로는 실행 디렉터리 기준이다
  assert.doesNotMatch(result.harness_failure.reason, new RegExp(f.resultsRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('lab/ 에 미commit 변경이 있으면 집계 실험은 시작하지 않고, pilot 은 변경 내용을 원본에 남기고 실행한다', async () => {
  const f = fixture(AGENT_OK);
  writeFileSync(path.join(f.labRoot, 'lab', 'README.md'), 'changed\n');
  await assert.rejects(executeRun(f.spec(), f.opts), /미commit 변경/);
  const { runDir, result } = await executeRun(f.spec({ experiment: 'pilot-1' }), f.opts);
  assert.equal(result.environment.harness_lab_dirty, true);
  assert.match(readFileSync(path.join(runDir, 'raw/harness-lab.diff'), 'utf8'), /\+changed/);
});

test('같은 실험에서 과제 문구나 Variant 의 source commit 이 바뀌면 시작하지 않는다', async () => {
  const f = fixture(AGENT_OK);
  await executeRun(f.spec(), f.opts);
  const repo = f.source.repo;
  writeFileSync(path.join(repo, 'x.txt'), 'x\n');
  execFileSync('git', ['-C', repo, 'add', 'x.txt']);
  execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'x', '--', 'x.txt']);
  const commit = execFileSync('git', ['-C', repo, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await assert.rejects(executeRun(f.spec({ repetition: 2, source: { repo, commit } }), f.opts), /Variant a 의 source commit/);
  writeFileSync(f.prompt, '바뀐 문구\n');
  await assert.rejects(executeRun(f.spec({ repetition: 2 }), f.opts), /과제 exp1 의 문구/);
  assert.equal(readdirSync(path.join(f.resultsRoot, 'runs')).length, 1);
});

test('run.sh 의 build 자식이 signal 로 죽어 137 로 끝나면 외부 중단이 아니라 묶음 error 로 grading_failed 다', async () => {
  const f = fixture(AGENT_OK, 'exit 137');
  const { result } = await executeRun(f.spec(), f.opts);
  assert.equal(result.state, 'completed');
  assert.equal(result.grading.normative[0].status, 'error');
  assert.equal(result.grading.outcome, 'failed');
});

test('Agent 실행 중에 harness 저장소의 lab/ 가 바뀌면 채점하지 않고 harness_failed(after_agent) 다', async () => {
  const f = fixture(AGENT_OK);
  const g = fixture(`echo changed >> "${f.labRoot}/lab/README.md"; ${AGENT_OK}`);
  const { result } = await executeRun(g.spec(), { ...g.opts, labRoot: f.labRoot });
  assert.equal(result.state, 'harness_failed');
  assert.equal(result.harness_failure.stage, 'after_agent');
  assert.equal(result.grading.outcome, null);
  assert.equal(existsSync(g.gradingCalls), false, '채점을 실행하면 안 된다');
});

test('같은 실험에서 commit 된 채점 코드(lab/grading)가 바뀌면 시작하지 않는다', async () => {
  const f = fixture(AGENT_OK);
  await executeRun(f.spec(), f.opts);
  mkdirSync(path.join(f.labRoot, 'lab', 'grading'));
  writeFileSync(path.join(f.labRoot, 'lab', 'grading', 'run.sh'), 'echo\n');
  execFileSync('git', ['-C', f.labRoot, 'add', 'lab/grading/run.sh']);
  execFileSync('git', ['-C', f.labRoot, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'g', '--', 'lab/grading/run.sh']);
  await assert.rejects(executeRun(f.spec({ repetition: 2 }), f.opts), /채점 · 과제 코드/);
});

test('pilot 에서 이미 수정된 lab 파일이 Agent 실행 중에 더 바뀌어도 채점하지 않는다', async () => {
  const f = fixture(AGENT_OK);
  writeFileSync(path.join(f.labRoot, 'lab', 'README.md'), 'before\n');
  const g = fixture(`echo more >> "${f.labRoot}/lab/README.md"; ${AGENT_OK}`);
  const { result } = await executeRun(g.spec({ experiment: 'pilot-1' }), { ...g.opts, labRoot: f.labRoot });
  assert.equal(result.state, 'harness_failed');
  assert.equal(result.harness_failure.stage, 'after_agent');
});

test('Agent 실행 중 lab/ 밖의 commit 은 채점을 막지 않는다', async () => {
  const f = fixture(AGENT_OK);
  const add = `echo doc > "${f.labRoot}/doc.md"; git -C "${f.labRoot}" add doc.md; git -C "${f.labRoot}" -c user.name=t -c user.email=t@example.com commit --quiet -m d -- doc.md`;
  const g = fixture(`${add}; ${AGENT_OK}`);
  const { result } = await executeRun(g.spec(), { ...g.opts, labRoot: f.labRoot });
  assert.equal(result.state, 'completed');
  assert.equal(result.grading.outcome, 'passed');
});

test('구독 token 이 없으면 Agent 를 실행하지 않고 harness_failed(prepare) 다', async () => {
  const f = fixture(AGENT_OK);
  const saved = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  try {
    const { result } = await executeRun(f.spec(), f.opts);
    assert.equal(result.state, 'harness_failed');
    assert.equal(result.harness_failure.stage, 'prepare');
    assert.match(result.harness_failure.reason, /oauth_token/);
    assert.equal(existsSync(f.argvFile), false);
  } finally {
    process.env.CLAUDE_CODE_OAUTH_TOKEN = saved;
  }
});

test('구독 사용 한도에 걸리면 바로 다시 실행하지 않고 한도 도달로 멈춘다', async () => {
  const limit = path.join(tmp(), 'limit.jsonl');
  writeFileSync(limit, `${JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: "You've hit your session limit · resets 3:45pm" })}\n`);
  const f = fixture(`cat "${limit}"; exit 1`);
  const { runs, missing, usageLimited } = await executeWithRetry(f.spec(), f.opts);
  assert.equal(runs.length, 1);
  assert.equal(usageLimited, true);
  assert.equal(missing, false);
  assert.equal(runs[0].result.agent.error_kind, 'usage_limit');
});

test('한도 해제 뒤 이어서 실행해도 반복 번호당 재실행 상한은 이전 attempt 를 포함해 센다', async () => {
  const f = fixture(API_ERROR);
  const { runs, missing } = await executeWithRetry(f.spec(), f.opts, { attempt: 4, retryOf: 'prev-run', counted: 2 });
  assert.equal(runs.length, 1);
  assert.equal(missing, true);
  assert.equal(runs[0].result.identity.attempt, 4);
  assert.equal(runs[0].result.identity.retry_of, 'prev-run');
});
