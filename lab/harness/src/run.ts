import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { agentEnv, classifyAgent, claudeArgs, summarizeStream } from './agent.ts';
import {
  canonicalJson, conditionHash, inputHash, LAB_ROOT, sha256, SpecError, validateSpec,
  type ExecConfig, type RunSpec, type TaskDef,
} from './config.ts';
import { collectFingerprint, extractVersion, git, labChanges, localProbe, TOOLS, type Probe } from './fingerprint.ts';
import { gradingArgs, INTERRUPTED_EXIT, junitPath, parseJunit, portFree, suiteFileName, suiteStatus, type SuiteKind, type SuiteStatus } from './grader.ts';
import {
  ARTIFACTS, buildResult, gradingWorkspace, HARNESS_GIT, HARNESS_HOME, HARNESS_INDEX, RAW, WORKSPACE, writeResult,
  type HarnessEvent, type RunJson,
} from './normalize.ts';
import { isSuspended, runProcess, systemClock, type Clock } from './process.ts';
import { canTransition, isTerminal, stageOfAbandoned, type RunState, type Stage } from './state.ts';
import { captureDiff, cloneAt, gradingCopy, harnessGit, type StepOptions } from './workspace.ts';

// 실행 1개의 orchestration. 기준은 _design/experiment-execution-contract-v0.1.md §6 ~ §8.
// 3단계 골격은 컨테이너 없이 host 에서 process 를 실행한다. 실제 Claude 실행은 컨테이너 단계 전까지 하지 않는다(실행 계약 §4.3)

export interface RunOptions {
  resultsRoot: string;
  config: ExecConfig;
  tasks: Record<string, TaskDef>;
  labRoot?: string;
  probe?: Probe;
  clock?: Clock;
  newRunId?: () => string;
}

export interface RunOutcome {
  runId: string;
  runDir: string;
  result: ReturnType<typeof JSON.parse>;
}

class HarnessError extends Error {
  readonly stage: Stage;
  constructor(stage: Stage, message: string) {
    super(message);
    this.stage = stage;
  }
}

export function newRunId(): string {
  const t = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `${t}-${randomBytes(3).toString('hex')}`;
}

// 결과 root 가 Git 작업 트리 안이면 원본 로그가 commit 될 수 있어 시작하지 않는다(실행 계약 §8.4).
// git 이 "저장소가 아니다" 라고 답한 경우만 밖으로 본다. 그 밖의 git 오류는 판정할 수 없으므로 거부한다
export function ensureResultsRoot(root: string): void {
  mkdirSync(root, { recursive: true });
  try {
    const out = execFileSync('git', ['-C', root, 'rev-parse', '--is-inside-work-tree'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    if (out === 'true') throw new SpecError(`결과 root 가 Git 작업 트리 안에 있다: ${root}`);
  } catch (e) {
    if (e instanceof SpecError) throw e;
    const stderr = String((e as { stderr?: unknown }).stderr ?? '');
    if (!/not a git repository/i.test(stderr)) throw new SpecError(`결과 root 가 Git 작업 트리 밖인지 확인하지 못했다: ${stderr.trim() || String(e)}`);
  }
}

// 키마다 파일 하나를 처음 쓴 값으로 고정한다. 동시에 시작한 실행끼리도 경쟁 없이 같은 값을 비교한다
function lockKey(dir: string, key: string, value: unknown, what: string): void {
  const file = path.join(dir, `${key}.json`);
  const text = `${canonicalJson(value)}\n`;
  try {
    writeFileSync(file, text, { flag: 'wx' });
    return;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
  }
  const locked = readFileSync(file, 'utf8');
  if (locked !== text) throw new SpecError(`${what} 이 실험 잠금과 다르다. 잠금: ${locked.trim()} 지금: ${text.trim()}`);
}

// 실험 ID 마다 실행 조건 hash, 과제별 과제 문구 · 채점 정의, Variant 별 source commit 을 고정한다(실행 계약 §8.3)
export function checkExperimentLock(root: string, spec: RunSpec, config: ExecConfig, condition: string, task: TaskDef, promptSha: string): void {
  const dir = path.join(root, 'experiments', spec.experiment);
  mkdirSync(dir, { recursive: true });
  lockKey(dir, 'condition', { config_id: config.id, condition_hash: condition }, '실행 조건');
  lockKey(dir, `task-${spec.task}`, { prompt_sha256: promptSha, grading: task.grading }, `과제 ${spec.task} 의 문구 · 채점 정의`);
  lockKey(dir, `source-${spec.variant}`, { commit: spec.source.commit }, `Variant ${spec.variant} 의 source commit`);
}

// 채점 · 과제 코드의 commit 된 내용(tree hash). harness 코드는 실행 계약 §7 이 실험 중 수정을 허용하므로 잠그지 않고 기록만 한다
export function lockGradingCode(root: string, spec: RunSpec, labRoot: string): void {
  const dir = path.join(root, 'experiments', spec.experiment);
  lockKey(dir, 'grading-code', { grading: git(labRoot, ['rev-parse', 'HEAD:lab/grading']), tasks: git(labRoot, ['rev-parse', 'HEAD:lab/tasks']) }, '채점 · 과제 코드(lab/grading, lab/tasks)');
}

// pilot 등에서 기록하는 lab/ 미commit 변경. 추적 중인 파일은 diff, 미추적 파일은 내용(1MB 넘으면 sha256)을 남긴다
function labChangeRecord(labRoot: string, changes: string | null): string {
  const parts = [`# git status --porcelain -- lab\n${changes ?? '(확인하지 못함)'}`, `# git diff HEAD -- lab\n${git(labRoot, ['diff', 'HEAD', '--', 'lab']) ?? ''}`];
  for (const file of (git(labRoot, ['ls-files', '--others', '--exclude-standard', '--', 'lab']) ?? '').split('\n').filter((f) => f !== '')) {
    const data = readFileSync(path.join(labRoot, file));
    parts.push(`# untracked ${file} sha256=${sha256(data)}\n${data.length <= 1_000_000 ? data.toString('utf8') : '(1MB 초과, 내용 생략)'}`);
  }
  return `${parts.join('\n\n')}\n`;
}

class RunContext {
  state: RunState | null = null;
  stage: Stage = 'prepare';
  readonly runDir: string;
  private readonly clock: Clock;

  constructor(runDir: string, clock: Clock) {
    this.runDir = runDir;
    this.clock = clock;
  }

  now(): string {
    return new Date(this.clock.wall()).toISOString();
  }

  event(e: HarnessEvent): void {
    appendFileSync(path.join(this.runDir, RAW.events), `${JSON.stringify(e)}\n`);
  }

  transition(to: RunState, extra: { stage?: Stage; reason?: string } = {}): void {
    if (!canTransition(this.state, to)) throw new Error(`허용되지 않은 상태 전이: ${this.state} → ${to}`);
    this.event({ type: 'state', at: this.now(), from: this.state, to, ...extra });
    this.state = to;
    try {
      writeResult(this.runDir);
    } catch (e) {
      // 원본 기록(events)은 이미 남았다. result.json 은 원본에서 다시 만들 수 있다
      this.event({ type: 'note', at: this.now(), message: `result.json 을 쓰지 못했다: ${e instanceof Error ? e.message : String(e)}` });
    }
  }

  // 여러 process 로 이뤄진 단계의 잠자기 감지
  async guarded<T>(stage: Stage, fn: () => Promise<T>): Promise<T> {
    this.stage = stage;
    const w0 = this.clock.wall();
    const m0 = this.clock.mono();
    const r = await fn();
    const wallMs = this.clock.wall() - w0;
    const monoMs = Math.round(this.clock.mono() - m0);
    if (isSuspended(wallMs, monoMs)) throw new HarnessError(stage, `host 잠자기 감지(wall ${wallMs}ms, monotonic ${monoMs}ms)`);
    return r;
  }
}

export async function executeRun(spec: RunSpec, opts: RunOptions): Promise<RunOutcome> {
  const labRoot = opts.labRoot ?? LAB_ROOT;
  const clock = opts.clock ?? systemClock;
  const probe = opts.probe ?? localProbe;
  const config = opts.config;

  // 여기까지의 실패는 실행을 시작하지 않은 것이다. 실행 디렉터리를 만들지 않는다
  const task = validateSpec(spec, opts.tasks);
  ensureResultsRoot(opts.resultsRoot);
  const changes = labChanges(labRoot);
  if (/^exp[123]/.test(spec.experiment) && changes !== '') {
    throw new SpecError(`집계 실험은 lab/ 에 미commit 변경이 없을 때만 시작한다: ${changes === null ? 'git 상태를 확인하지 못했다' : changes.split('\n').join(', ')}`);
  }
  const condition = conditionHash(config, labRoot);
  const prompt = readFileSync(path.resolve(labRoot, task.prompt));
  const promptSha = sha256(prompt);
  checkExperimentLock(opts.resultsRoot, spec, config, condition, task, promptSha);
  lockGradingCode(opts.resultsRoot, spec, labRoot);
  const head = git(labRoot, ['rev-parse', 'HEAD']);
  // 채점 직전 비교용: lab/ 의 commit 된 tree 와 미commit 변경 기록의 hash. 저장소의 다른 경로 commit 은 비교하지 않는다
  const labState = () => ({ tree: git(labRoot, ['rev-parse', 'HEAD:lab']), changes: sha256(labChangeRecord(labRoot, labChanges(labRoot))) });
  const labAtStart = labState();

  const runId = (opts.newRunId ?? newRunId)();
  const runsDir = path.join(opts.resultsRoot, 'runs');
  mkdirSync(runsDir, { recursive: true });
  const runDir = path.join(runsDir, runId);
  // 같은 실행 ID 가 이미 있으면 EEXIST 로 실패한다. 다른 실행의 디렉터리를 덮어쓰지 않는다
  mkdirSync(runDir);
  for (const d of ['raw/agent/claude-config', 'raw/prepare', 'raw/diff', 'raw/grading', 'artifacts', 'workspace', 'grading-workspace', 'harness']) {
    mkdirSync(path.join(runDir, d), { recursive: true });
  }

  const sessionId = randomUUID();
  const runJson: RunJson = {
    schema: 'lab.run/v1',
    run_id: runId,
    session_id: sessionId,
    identity: {
      experiment: spec.experiment,
      task: spec.task,
      variant: spec.variant,
      repetition: spec.repetition,
      attempt: spec.attempt ?? 1,
      retry_of: spec.retryOf ?? null,
    },
    source: spec.source,
    task: { id: spec.task, experiment: task.experiment, prompt_path: task.prompt, prompt_sha256: promptSha, grading: task.grading },
    execution_config: config,
    condition_hash: condition,
    input_hash: inputHash(spec, promptSha, condition),
    resources: { port: spec.port },
  };
  writeFileSync(path.join(runDir, 'run.json'), `${JSON.stringify(runJson, null, 2)}\n`, { flag: 'wx' });

  const ctx = new RunContext(runDir, clock);
  ctx.event({ type: 'run_started', at: ctx.now() });
  ctx.event({ type: 'harness_code', at: ctx.now(), when: 'start', head, lab_changes: changes });
  const t = config.timeouts_ms;
  const workspace = path.join(runDir, WORKSPACE);
  const step = (logDir: string): StepOptions => ({ logDir: path.join(runDir, logDir), gitHome: path.join(runDir, HARNESS_HOME), timeoutMs: t.prepare, graceMs: t.grace, clock });

  try {
    // 준비. fingerprint 를 clone 보다 먼저 남겨 준비 실패 실행에도 환경 기록이 있게 한다
    await ctx.guarded('prepare', async () => {
      const fp = await collectFingerprint(probe, config.agent.executable, labRoot);
      writeFileSync(path.join(runDir, RAW.fingerprint), `${JSON.stringify(fp, null, 2)}\n`);
      if (changes !== '') writeFileSync(path.join(runDir, RAW.harnessDiff), labChangeRecord(labRoot, changes));
      for (const tool of TOOLS) {
        if (fp.agent_env[tool].exit_code !== 0) throw new HarnessError('prepare', `필수 도구를 실행하지 못했다: ${fp.agent_env[tool].argv.join(' ')}`);
      }
      const cli = extractVersion('claude', fp.agent_env.claude.output);
      if (cli !== config.agent.version) throw new HarnessError('prepare', `Claude Code 버전 ${cli} 가 실행 설정 ${config.agent.version} 과 다르다`);
      // Agent 와 같은 환경 변수 · settings 로 인증 수단을 확인한다. 모델을 호출하지 않는다(실행 계약 §4.4).
      // Agent 의 설정 디렉터리를 비워 두려고 별도의 빈 디렉터리를 쓴다
      const settings = config.agent.settings_file === null ? [] : ['--settings', path.resolve(labRoot, config.agent.settings_file)];
      const auth = await runProcess({
        cmd: config.agent.executable, args: [...settings, 'auth', 'status', '--json'], cwd: runDir,
        env: agentEnv(config, path.join(runDir, 'harness', 'auth-config'), process.env),
        stdoutPath: path.join(runDir, RAW.prepare, 'auth-status.out'), stderrPath: path.join(runDir, RAW.prepare, 'auth-status.err'),
        timeoutMs: 30_000, graceMs: t.grace, clock,
      });
      let method: unknown = null;
      try {
        method = (JSON.parse(readFileSync(path.join(runDir, RAW.prepare, 'auth-status.out'), 'utf8')) as { authMethod?: unknown }).authMethod;
      } catch {
        method = null;
      }
      if (auth.exit_code !== 0 || method !== 'oauth_token') throw new HarnessError('prepare', `Agent 인증 수단이 구독 token(oauth_token)이 아니다: ${String(method)}`);
      await cloneAt(spec.source.repo, spec.source.commit, workspace, step(RAW.prepare));
      await harnessGit(spec.source.repo, path.join(runDir, HARNESS_GIT), step(RAW.prepare));
    });
    ctx.transition('prepared');

    // Agent
    ctx.stage = 'agent';
    ctx.transition('running');
    const args = claudeArgs(config, labRoot, prompt.toString('utf8'), sessionId);
    const env = agentEnv(config, path.join(runDir, RAW.agentConfig), process.env);
    writeFileSync(path.join(runDir, RAW.agentInvocation), `${JSON.stringify({ executable: config.agent.executable, args, env_names: Object.keys(env).sort() }, null, 2)}\n`);
    const agent = await runProcess({
      cmd: config.agent.executable,
      args,
      cwd: workspace,
      env,
      stdoutPath: path.join(runDir, RAW.agentStdout),
      recvPath: path.join(runDir, RAW.agentRecv),
      stderrPath: path.join(runDir, RAW.agentStderr),
      timeoutMs: t.agent,
      graceMs: t.grace,
      clock,
    });
    ctx.event({ type: 'agent_process', ...agent });
    // Agent 종료 기록이 남은 뒤의 예외는 Agent 관찰을 다시 뽑지 않도록 after_agent 다
    ctx.stage = 'after_agent';
    const cls = classifyAgent(
      agent,
      summarizeStream(readFileSync(path.join(runDir, RAW.agentStdout), 'utf8')),
      readFileSync(path.join(runDir, RAW.agentStderr), 'utf8'),
    );
    if (cls.state === 'harness_failed') throw new HarnessError(cls.stage, cls.reason);
    ctx.transition(cls.state);

    // Agent 이후: 최종 diff, 채점용 복사본, 판정 채점
    await ctx.guarded('after_agent', () => captureDiff(path.join(runDir, HARNESS_GIT), path.join(runDir, HARNESS_INDEX), workspace, spec.source.commit, path.join(runDir, 'artifacts'), step(RAW.diffLog)));
    if (task.grading.normative.length === 0) {
      ctx.transition('completed');
      return finish(runId, runDir, ctx);
    }
    // 채점 코드는 Agent 가 끝난 뒤 작업 트리에서 읽는다. 시작 때와 달라졌으면 기록된 harness commit 과 실제 채점 코드가 다르다
    const labNow = labState();
    ctx.event({ type: 'harness_code', at: ctx.now(), when: 'before_grading', head: git(labRoot, ['rev-parse', 'HEAD']), lab_changes: labChanges(labRoot) });
    if (labNow.tree !== labAtStart.tree || labNow.changes !== labAtStart.changes) throw new HarnessError('after_agent', 'Agent 실행 중에 lab/ 의 commit 된 내용이나 미commit 변경이 바뀌었다');
    const gradingWs = path.join(runDir, gradingWorkspace(0));
    await ctx.guarded('after_agent', () => gradingCopy(spec.source.repo, spec.source.commit, path.join(runDir, ARTIFACTS.patch), gradingWs, step(path.join(RAW.grading, 'copy-0'))));

    const grader = new Grader(ctx, config, labRoot, gradingWs, spec.port, clock);
    const statuses: SuiteStatus[] = [];
    for (const suite of task.grading.normative) statuses.push(await grader.normative(suite));
    ctx.transition(statuses.every((s) => s === 'passed') ? 'grading_succeeded' : 'grading_failed');

    // 진단 묶음은 결과와 예외를 기록만 한다. 상태 · 재실행에 쓰지 않는다
    for (const suite of task.grading.diagnostic) await grader.diagnostic(suite);
    ctx.transition('completed');
  } catch (e) {
    const stage = e instanceof HarnessError ? e.stage : ctx.stage;
    // 원인 문구의 경로는 실행 디렉터리 기준으로 남긴다
    const reason = (e instanceof Error ? e.message : String(e)).split(`${runDir}${path.sep}`).join('');
    if (!isTerminal(ctx.state)) ctx.transition('harness_failed', { stage, reason });
    else ctx.event({ type: 'note', at: ctx.now(), message: `종료 상태 뒤 예외: ${reason}` });
  }
  return finish(runId, runDir, ctx);
}

function finish(runId: string, runDir: string, ctx: RunContext): RunOutcome {
  try {
    return { runId, runDir, result: JSON.parse(buildResult(runDir)) };
  } catch (e) {
    return { runId, runDir, result: { run_id: runId, state: ctx.state, terminal: isTerminal(ctx.state), harness_failure: null, agent: null, build_error: e instanceof Error ? e.message : String(e) } };
  }
}

class Grader {
  private calls = 0;
  private lastTimedOut = false;
  private readonly ctx: RunContext;
  private readonly config: ExecConfig;
  private readonly labRoot: string;
  private readonly workspace: string;
  private readonly port: number;
  private readonly clock: Clock;
  // 재채점 회차. 첫 채점은 0 이다. 재채점은 이후 단계에서 1 부터 쓴다(실행 계약 §7)
  private readonly round = 0;

  constructor(ctx: RunContext, config: ExecConfig, labRoot: string, workspace: string, port: number, clock: Clock) {
    this.ctx = ctx;
    this.config = config;
    this.labRoot = labRoot;
    this.workspace = workspace;
    this.port = port;
    this.clock = clock;
  }

  private async invoke(kind: SuiteKind, suite: string, attempt: number, timeoutMs: number) {
    const logRel = path.join(RAW.grading, suiteFileName(suite), `${this.round}-${attempt}`);
    const logDir = path.join(this.ctx.runDir, logRel);
    mkdirSync(logDir, { recursive: true });
    // 첫 호출만 Variant 를 build 한다. 직전 호출이 시간 초과였으면 build 산출물을 믿지 않고 다시 build 한다(실행 계약 §6.4)
    const skipBuild = this.calls > 0 && !this.lastTimedOut;
    this.calls++;
    // 실행자 환경을 그대로 넘기지 않는다. GRADING_SKIP_BUILD 같은 값이 섞이면 build 규칙이 바뀐다
    const env: Record<string, string> = { TZ: 'Asia/Seoul', LANG: 'ko_KR.UTF-8', GRADING_LOG_DIR: logDir, GRADING_SKIP_BUILD: skipBuild ? '1' : '0' };
    for (const name of ['PATH', 'HOME', 'JAVA_HOME', 'PLAYWRIGHT_BROWSERS_PATH']) {
      const v = process.env[name];
      if (v !== undefined) env[name] = v;
    }
    const script = path.resolve(this.labRoot, this.config.grading.run_script);
    const p = await runProcess({
      cmd: script,
      args: gradingArgs(this.workspace, this.port, suite),
      cwd: path.dirname(script),
      env,
      stdoutPath: path.join(logDir, 'run.stdout.log'),
      stderrPath: path.join(logDir, 'run.stderr.log'),
      timeoutMs,
      graceMs: this.config.timeouts_ms.grace,
      clock: this.clock,
    });
    this.lastTimedOut = p.timed_out;
    this.ctx.event({ type: 'grading_process', kind, suite, round: this.round, try: attempt, log_dir: logRel, skip_build: skipBuild, env, ...p });
    let junit = null;
    try {
      junit = parseJunit(readFileSync(junitPath(logDir, suite), 'utf8'));
    } catch {
      junit = null;
    }
    return { p, status: suiteStatus(p.exit_code, p.timed_out, junit) };
  }

  // 판정 묶음. 결과를 내지 못한 경우(port 사용 중, run.sh 시작 실패, 외부 signal 로 중단, 잠자기)는 harness 실패다.
  // 시간 초과는 같은 산출물로 1회 다시 실행한다(실행 계약 §6.3). 최종 판정만 suite_result 로 남긴다
  async normative(suite: string): Promise<SuiteStatus> {
    this.ctx.stage = 'after_agent';
    let status: SuiteStatus = 'error';
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (!(await portFree(this.port))) throw new HarnessError('after_agent', `채점 port ${this.port} 를 이미 쓰고 있다`);
      const r = await this.invoke('normative', suite, attempt, this.config.timeouts_ms.grading_normative);
      if (r.p.spawn_error !== null) throw new HarnessError('after_agent', `run.sh 를 시작하지 못했다: ${r.p.spawn_error}`);
      if (r.p.suspended) throw new HarnessError('after_agent', `host 잠자기 감지(채점 ${suite})`);
      if (!r.p.timed_out && (r.p.signal !== null || (r.p.exit_code !== null && INTERRUPTED_EXIT.includes(r.p.exit_code)))) {
        throw new HarnessError('after_agent', `run.sh 가 외부 signal 로 중단됐다(exit ${r.p.exit_code}, signal ${r.p.signal})`);
      }
      status = r.status;
      if (status !== 'timed_out') break;
    }
    this.ctx.event({ type: 'suite_result', at: this.ctx.now(), kind: 'normative', suite, round: this.round, status });
    return status;
  }

  async diagnostic(suite: string): Promise<void> {
    try {
      if (!(await portFree(this.port))) throw new Error(`채점 port ${this.port} 를 이미 쓰고 있다`);
      const r = await this.invoke('diagnostic', suite, 1, this.config.timeouts_ms.grading_diagnostic);
      this.ctx.event({ type: 'suite_result', at: this.ctx.now(), kind: 'diagnostic', suite, round: this.round, status: r.status });
    } catch (e) {
      this.ctx.event({ type: 'grading_error', at: this.ctx.now(), kind: 'diagnostic', suite, round: this.round, message: e instanceof Error ? e.message : String(e) });
    }
  }
}

// 사용 한도 도달은 Agent 관찰이 아니지만, 한도가 풀리기 전에 다시 실행해도 같은 결과다. 재실행 횟수에 세지 않고 멈춘다
function usageLimited(result: { agent: { error_kind: string | null } | null }): boolean {
  return result.agent?.error_kind === 'usage_limit';
}

interface RetryView {
  state: RunState | null;
  terminal: boolean;
  harness_failure: { stage: string | null } | null;
  agent: { outcome: string | null; error_kind: string | null } | null;
}

// 실행 계약 §7: 새 attempt 가 필요한 결과인지. API 오류를 먼저 본다. 비종료 상태로 남은 실행은 §6.2 의 stage 로 판정한다
export function needsNewAttempt(result: RetryView): boolean {
  if (result.agent?.outcome === 'agent_failed' && (result.agent.error_kind === 'api_error' || result.agent.error_kind === 'usage_limit')) return true;
  // running 에 남았어도 Agent 종료 기록이 Agent 관찰(성공 · 실패 · 시간 초과)로 분류되면 Agent 관찰은 끝났다
  const observed = ['agent_succeeded', 'agent_failed', 'timed_out'].includes(result.agent?.outcome ?? '');
  const abandoned = result.state === 'running' && observed ? 'after_agent' : stageOfAbandoned(result.state);
  const stage = result.state === 'harness_failed' ? result.harness_failure?.stage : !result.terminal ? abandoned : null;
  return stage === 'prepare' || stage === 'agent_start' || stage === 'agent';
}

// 같은 반복 번호를 재실행 규칙에 따라 최대 max_attempts 번 실행한다. 이전 attempt 의 디렉터리는 남긴다.
// 마지막 attempt 도 재실행 대상이면 그 반복은 결측이다(missing).
// 사용 한도에 도달하면 바로 멈추고 usageLimited 로 돌려준다. 한도가 풀린 뒤 같은 반복을 이어서 실행하는 것은 일정 실행 단계가 맡는다(실행 계약 §7)
// 한도 해제 뒤 이어서 실행할 때는 resume 에 다음 attempt 번호, 직전 실행 ID, 이미 상한에 센 attempt 수를 준다
export async function executeWithRetry(
  spec: RunSpec,
  opts: RunOptions,
  resume: { attempt: number; retryOf: string; counted: number } | null = null,
): Promise<{ runs: RunOutcome[]; missing: boolean; usageLimited: boolean }> {
  const runs: RunOutcome[] = [];
  let retryOf: string | null = resume?.retryOf ?? null;
  let attempt = resume?.attempt ?? 1;
  let counted = resume?.counted ?? 0;
  while (counted < opts.config.retry.max_attempts) {
    const r = await executeRun({ ...spec, attempt, retryOf }, opts);
    runs.push(r);
    if (usageLimited(r.result)) return { runs, missing: false, usageLimited: true };
    if (!needsNewAttempt(r.result)) return { runs, missing: false, usageLimited: false };
    counted++;
    attempt++;
    retryOf = r.runId;
  }
  return { runs, missing: true, usageLimited: false };
}
