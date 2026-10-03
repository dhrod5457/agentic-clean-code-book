import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { before, test } from 'node:test';
import type { ExecConfig } from '../src/config.ts';
import { settleContainer, watchContainer } from '../src/docker.ts';
import { executeRun, regradeRun } from '../src/run.ts';
import { fixture, tmp, writeScript } from './helpers.ts';

// 실제 실행 이미지(image.lock) 위에 가짜 claude 만 더한 이미지로 컨테이너 실행 경로를 시험한다. Docker 가 없으면 건너뛴다

const HARNESS = path.resolve(import.meta.dirname, '..');
const LOCK = JSON.parse(readFileSync(path.join(HARNESS, 'image.lock'), 'utf8')) as { id: string };
const dockerReady = spawnSync('docker', ['image', 'inspect', LOCK.id], { encoding: 'utf8' }).status === 0;
let testImage = '';

const FAKE_CLAUDE = `#!/bin/bash
if [ "$1" = "--version" ]; then echo "2.1.287 (Claude Code)"; exit 0; fi
for a in "$@"; do
  if [ "$a" = auth ]; then
    if [ -n "$ANTHROPIC_API_KEY" ]; then m=api_key; elif [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then m=oauth_token; else m=none; fi
    echo "{\\"loggedIn\\":true,\\"authMethod\\":\\"$m\\"}"; exit 0
  fi
done
o="$CLAUDE_CONFIG_DIR"
printf '%s\\0' "$@" > "$o/fake-argv"
env > "$o/fake-env"; id -u > "$o/fake-uid"; hostname > "$o/fake-hostname"
grep CapEff /proc/self/status > "$o/fake-cap"; cat /proc/self/mountinfo > "$o/fake-mountinfo"; ls /opt/cc > "$o/fake-cc"
cat /opt/cc/* > "$o/fake-cc-content" 2>/dev/null
(curl -s -o /dev/null --max-time 5 https://registry.npmjs.org/ && echo open || echo blocked) > "$o/fake-npm"
find / -name run.json -not -path '/proc/*' 2>/dev/null > "$o/fake-runjson"
case "$2" in
  *MODE=oom*) exec node -e 'const a=[];for(;;)a.push(Buffer.alloc(8<<20,1))' ;;
  *MODE=sleep*) sleep 120 ;;
esac
echo changed >> README.md
echo '{"type":"system","subtype":"init","model":"claude-opus-5-5"}'
echo '{"type":"result","subtype":"success","is_error":false,"total_cost_usd":0.1,"usage":{"input_tokens":1,"output_tokens":1}}'
`;

before(() => {
  if (!dockerReady) return;
  const dir = tmp('img-');
  writeScript(path.join(dir, 'fake-claude'), FAKE_CLAUDE.replace(/^#!\/bin\/bash\n/, ''));
  writeFileSync(path.join(dir, 'Dockerfile'), 'ARG BASE\nFROM ${BASE}\nUSER root\nCOPY fake-claude /usr/local/bin/fake-claude\nRUN chmod 755 /usr/local/bin/fake-claude\n');
  execFileSync('docker', ['tag', LOCK.id, 'lab-runner:test-base']);
  execFileSync('docker', ['build', '-q', '--build-arg', 'BASE=lab-runner:test-base', '-t', 'lab-runner:test', dir], { stdio: ['ignore', 'pipe', 'pipe'] });
  testImage = execFileSync('docker', ['image', 'inspect', 'lab-runner:test', '--format', '{{.Id}}'], { encoding: 'utf8' }).trim();
});

// 가짜 run.sh: 컨테이너 안에서 실행됐는지 남기고 통과 JUnit 을 쓴다
const GRADER = `name="\${3//\\//-}"; id -u > "$GRADING_LOG_DIR/uid"; echo "$1" > "$GRADING_LOG_DIR/workspace"
printf '<testsuites tests="1" failures="0" errors="0" skipped="0"><testsuite name="s"><testcase name="t"/></testsuite></testsuites>' > "$GRADING_LOG_DIR/junit-$name.xml"`;

function containerFixture(prompt: string, tune: (c: ExecConfig) => void = () => {}) {
  const f = fixture('true');
  writeFileSync(f.prompt, prompt);
  // 실제 settings · hook 파일을 임시 lab 저장소에 둔다
  mkdirSync(path.join(f.labRoot, 'lab/harness/config'), { recursive: true });
  cpSync(path.join(HARNESS, 'config/cc'), path.join(f.labRoot, 'lab/harness/config/cc'), { recursive: true });
  execFileSync('git', ['-C', f.labRoot, 'add', 'lab']);
  execFileSync('git', ['-C', f.labRoot, '-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'cc', '--', 'lab']);
  const graderDir = path.join(tmp('grader-'), 'grading');
  mkdirSync(graderDir);
  writeScript(path.join(graderDir, 'run.sh'), GRADER);
  f.config.agent.executable = 'fake-claude';
  f.config.agent.settings_file = 'lab/harness/config/cc/settings.json';
  f.config.agent.hook_files = ['lab/harness/config/cc/record.mjs'];
  f.config.grading.run_script = path.join(graderDir, 'run.sh');
  f.config.environment = { runtime: 'docker', image: testImage, platform: 'linux/arm64', cpus: 2, memory: '1g', grading_network: 'bridge' };
  f.config.timeouts_ms.agent = 60_000;
  tune(f.config);
  f.opts.probe = undefined;
  // 실제 저장소처럼 lab 저장소 경로에 금지 문자열이 들어 있게 한다. 이 경로가 컨테이너에 보이면 시험이 실패해야 한다
  const leakyLab = path.join(tmp('agentic-'), 'agentic-clean-code-book');
  cpSync(f.labRoot, leakyLab, { recursive: true });
  f.opts.labRoot = leakyLab;
  return f;
}

const read = (runDir: string, name: string) => readFileSync(path.join(runDir, 'raw/agent/claude-config', name), 'utf8');
const containerGone = (name: string) => spawnSync('docker', ['inspect', name]).status !== 0;

test('컨테이너 안 Agent 는 권한 없는 agent 로 실행되고, 실험 정보 · 외부망 · 실행 기록에 닿지 않는다', { skip: !dockerReady }, async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-should-not-pass';
  try {
    const f = containerFixture('다음 요청을 처리해 줘.\n');
    const { runId, runDir, result } = await executeRun(f.spec(), f.opts);
    assert.equal(result.state, 'completed', JSON.stringify(result.harness_failure));
    assert.equal(result.grading.outcome, 'passed');
    assert.equal(read(runDir, 'fake-uid').trim(), '1000');
    assert.equal(read(runDir, 'fake-hostname').trim(), `r-${runId}`);
    assert.match(read(runDir, 'fake-cap'), /CapEff:\s+0+\s*$/);
    assert.equal(read(runDir, 'fake-npm').trim(), 'blocked');
    assert.equal(read(runDir, 'fake-runjson').trim(), '');
    assert.deepEqual(read(runDir, 'fake-cc').trim().split('\n').sort(), ['record.mjs', 'settings.json']);
    const env = read(runDir, 'fake-env');
    assert.match(env, /^CLAUDE_CODE_OAUTH_TOKEN=oauth-test$/m);
    assert.doesNotMatch(env, /ANTHROPIC_API_KEY/);
    for (const name of ['fake-env', 'fake-mountinfo', 'fake-hostname', 'fake-cc-content']) {
      assert.doesNotMatch(read(runDir, name), /agentic|variant|실험|experiment/i, name);
    }
    const argv = read(runDir, 'fake-argv').split('\0');
    assert.deepEqual(argv.slice(argv.indexOf('--settings'), argv.indexOf('--settings') + 2), ['--settings', '/opt/cc/settings.json']);
    // 채점은 컨테이너 안에서 agent 사용자로 실행된다
    assert.equal(readFileSync(path.join(runDir, 'raw/grading/exp1/0-1/uid'), 'utf8').trim(), '1000');
    assert.equal(readFileSync(path.join(runDir, 'raw/grading/exp1/0-1/workspace'), 'utf8').trim(), '/work/shop-admin');
    assert.doesNotMatch(readFileSync(path.join(runDir, 'raw/agent/invocation.json'), 'utf8'), /oauth-test|sk-ant/);
    assert.ok(containerGone(`r-${runId}`));
    // Agent 컨테이너의 events 는 생성부터 남는다
    assert.match(readFileSync(path.join(runDir, 'raw/agent/docker-events.jsonl'), 'utf8'), /"Action":"create"/);
  } finally {
    delete process.env.ANTHROPIC_API_KEY;
  }
});

test('컨테이너 메모리 제한을 넘어 Agent 가 죽으면 agent_failed(oom) 다', { skip: !dockerReady }, async () => {
  const f = containerFixture('MODE=oom\n', (c) => { c.environment.memory = '256m'; });
  const { runId, result } = await executeRun(f.spec(), f.opts);
  assert.equal(result.agent.outcome, 'agent_failed');
  assert.equal(result.agent.error_kind, 'oom');
  assert.equal(result.agent.container.oom_killed, true);
  assert.ok(containerGone(`r-${runId}`));
});

test('시간 제한을 넘은 컨테이너는 timed_out 이고 컨테이너가 남지 않는다', { skip: !dockerReady }, async () => {
  const f = containerFixture('MODE=sleep\n', (c) => { c.timeouts_ms.agent = 4000; c.timeouts_ms.grace = 2000; });
  const { runId, result } = await executeRun(f.spec(), f.opts);
  assert.equal(result.agent.outcome, 'timed_out');
  // 실행 중이던 컨테이너를 harness 가 끝낸 뒤의 종료 코드다
  assert.equal(result.agent.container.exit_code, 137);
  assert.ok(containerGone(`r-${runId}`));
  assert.equal(existsSync(path.join(f.resultsRoot, 'runs', runId, 'artifacts/final.patch')), true);
});

test('docker 실행에서 결과 root 경로에 금지 문자열이 있으면 시작하지 않는다', { skip: !dockerReady }, async () => {
  const f = containerFixture('다음 요청을 처리해 줘.\n');
  const root = path.join(tmp('root-'), 'variant-runs');
  await assert.rejects(executeRun(f.spec(), { ...f.opts, resultsRoot: root }), /결과 root 경로/);
  assert.equal(existsSync(path.join(root, 'runs')), false);
  // 중립적인 이름의 symlink 라도 실제 경로가 mountinfo 에 보인다
  const link = path.join(tmp('root-'), 'runs-root');
  symlinkSync(root, link);
  await assert.rejects(executeRun(f.spec(), { ...f.opts, resultsRoot: link }), /결과 root 경로/);
  assert.equal(existsSync(path.join(root, 'runs')), false);
});

test('시작 스크립트가 외부 통신 제한을 설정하지 못하면 명령을 실행하지 않고 exit 90 으로 끝난다', { skip: !dockerReady }, () => {
  const r = spawnSync('docker', ['run', '--rm', '--network', 'none', '--cap-add', 'NET_ADMIN', '--cap-add', 'NET_RAW', testImage, 'sh', '-c', 'echo ran'], { encoding: 'utf8' });
  assert.equal(r.status, 90, r.stderr);
  assert.equal(r.stdout, '');
});

test('채점 컨테이너가 run.sh 를 시작하지 못하면 묶음 판정 없이 harness_failed(after_agent) 다', { skip: !dockerReady }, async () => {
  const f = containerFixture('다음 요청을 처리해 줘.\n');
  rmSync(f.config.grading.run_script);
  const { result } = await executeRun(f.spec(), f.opts);
  assert.equal(result.state, 'harness_failed');
  assert.equal(result.harness_failure.stage, 'after_agent');
  assert.equal(result.agent.outcome, 'agent_succeeded');
  assert.equal(result.grading.outcome, null);
});

test('docker client 가 끝난 뒤에도 실행 중인 컨테이너는 끝내고 그 사실을 남기며, 없는 컨테이너는 found:false 다', { skip: !dockerReady }, async () => {
  const name = `settle-${process.pid}`;
  const events = path.join(tmp('events-'), 'docker-events.jsonl');
  const watch = await watchContainer(name, testImage, events);
  const client = spawn('docker', ['run', '--name', name, '--entrypoint', '', testImage, 'sleep', '120'], { stdio: 'ignore' });
  for (let i = 0; i < 50 && spawnSync('docker', ['inspect', '-f', '{{.State.Running}}', name], { encoding: 'utf8' }).stdout.trim() !== 'true'; i++) await new Promise((r) => setTimeout(r, 200));
  client.kill('SIGKILL');
  await new Promise((r) => client.once('exit', r));
  const state = await settleContainer(name, watch);
  assert.equal(state.running_after_client, true);
  assert.equal(state.exit_code, 137);
  assert.equal(state.vm_restarted, false);
  // 컨테이너가 만들어지기 전부터 받은 기록이라 생성부터 삭제까지 남는다
  const actions = readFileSync(events, 'utf8').trim().split('\n').map((l) => JSON.parse(l).Action);
  for (const a of ['create', 'start', 'die', 'destroy']) assert.ok(actions.includes(a), `${a}: ${actions.join(',')}`);
  assert.ok(containerGone(name));
  const missing = await settleContainer(name, await watchContainer(name, testImage, path.join(tmp('events-'), 'none.jsonl')));
  assert.deepEqual([missing.found, missing.inspect_error], [false, null]);
});

test('재채점은 그 실행의 컨테이너가 남아 있으면 거부하고, 비어 있는 Agent 기록은 container/ 에서 복구한다', { skip: !dockerReady }, async () => {
  const f = containerFixture('다음 요청을 처리해 줘.\n');
  const script = readFileSync(f.config.grading.run_script, 'utf8');
  rmSync(f.config.grading.run_script);
  const { runId, runDir, result } = await executeRun(f.spec(), f.opts);
  assert.equal(result.harness_failure.stage, 'after_agent');
  writeFileSync(f.config.grading.run_script, script, { mode: 0o755 });
  // 기록 복사가 실패한 실행처럼 raw/agent 의 세션 기록을 비운다
  rmSync(path.join(runDir, 'raw/agent/claude-config'), { recursive: true });
  mkdirSync(path.join(runDir, 'raw/agent/claude-config'));
  const leftover = `g-${runId}-exp1-0-1`;
  execFileSync('docker', ['create', '--name', leftover, '--entrypoint', '', testImage, 'true']);
  try {
    await assert.rejects(regradeRun(runDir, { labRoot: f.opts.labRoot }), /컨테이너가 남아 있다/);
  } finally {
    execFileSync('docker', ['rm', '-f', leftover]);
  }
  const { result: regraded } = await regradeRun(runDir, { labRoot: f.opts.labRoot });
  assert.equal(regraded.grading.outcome, 'passed');
  assert.equal(existsSync(path.join(runDir, 'raw/agent/claude-config/fake-uid')), true);
});
