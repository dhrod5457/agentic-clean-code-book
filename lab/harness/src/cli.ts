import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { LAB_ROOT, loadJson, type ExecConfig, type TaskDef } from './config.ts';
import { writeResult } from './normalize.ts';
import { executeWithRetry, regradeRun } from './run.ts';

// 실행 명령. 사용:
//   node src/cli.ts run --experiment pilot-1 --task pilot --variant a --repetition 1 --source-repo <경로> --source-commit <SHA>
//   node src/cli.ts regrade --run-dir <실행 디렉터리>
//   node src/cli.ts rebuild-result --run-dir <실행 디렉터리>
// 결과 root 기본값은 ~/lab-runs/v0.1, 구독 token 은 CLAUDE_CODE_OAUTH_TOKEN 이 없으면 ~/.config/agentic-lab/claude-oauth-token 에서 읽는다(실행 계약 §4.4)

const TOKEN_FILE = path.join(homedir(), '.config', 'agentic-lab', 'claude-oauth-token');

function loadToken(): void {
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) return;
  if (existsSync(TOKEN_FILE)) process.env.CLAUDE_CODE_OAUTH_TOKEN = readFileSync(TOKEN_FILE, 'utf8').trim();
}

// macOS 에서 실행 중 잠자기를 막는다(실행 계약 §4.1). 이 process 가 끝나면 caffeinate 도 끝난다
function keepAwake(): void {
  if (process.platform !== 'darwin') return;
  spawn('caffeinate', ['-i', '-w', String(process.pid)], { stdio: 'ignore', detached: true }).unref();
}

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2);
  const { values } = parseArgs({
    args: rest,
    options: {
      experiment: { type: 'string' }, task: { type: 'string' }, variant: { type: 'string' }, repetition: { type: 'string' },
      'source-repo': { type: 'string' }, 'source-commit': { type: 'string' }, port: { type: 'string', default: '18080' },
      'results-root': { type: 'string', default: path.join(homedir(), 'lab-runs', 'v0.1') },
      config: { type: 'string', default: path.join(LAB_ROOT, 'lab/harness/config/exec-v0.1.json') },
      tasks: { type: 'string', default: path.join(LAB_ROOT, 'lab/harness/config/tasks.json') },
      'run-dir': { type: 'string' },
      'resume-attempt': { type: 'string' }, 'resume-retry-of': { type: 'string' }, 'resume-counted': { type: 'string' },
    },
  });
  if (command === 'run') {
    loadToken();
    keepAwake();
    const resume = values['resume-attempt'] === undefined ? null : {
      attempt: Number(values['resume-attempt']), retryOf: values['resume-retry-of'] ?? '', counted: Number(values['resume-counted'] ?? '0'),
    };
    const out = await executeWithRetry({
      experiment: values.experiment ?? '', task: values.task ?? '', variant: values.variant ?? '', repetition: Number(values.repetition),
      source: { repo: path.resolve(values['source-repo'] ?? ''), commit: values['source-commit'] ?? '' }, port: Number(values.port),
    }, {
      resultsRoot: path.resolve(values['results-root']!),
      config: loadJson<ExecConfig>(values.config!),
      tasks: loadJson<Record<string, TaskDef>>(values.tasks!),
    }, resume);
    console.log(JSON.stringify({
      missing: out.missing,
      usage_limited: out.usageLimited,
      runs: out.runs.map((r) => ({ run_id: r.runId, run_dir: r.runDir, state: r.result.state, agent: r.result.agent?.outcome ?? null, error_kind: r.result.agent?.error_kind ?? null, grading: r.result.grading?.outcome ?? null })),
    }, null, 2));
  } else if (command === 'regrade') {
    loadToken();
    keepAwake();
    const r = await regradeRun(path.resolve(values['run-dir'] ?? ''));
    console.log(JSON.stringify({ run_id: r.runId, state: r.result.state, regrade_rounds: r.result.regrade_rounds, grading: r.result.grading.outcome }, null, 2));
  } else if (command === 'rebuild-result') {
    writeResult(path.resolve(values['run-dir'] ?? ''));
  } else {
    console.error('사용: node src/cli.ts run|regrade|rebuild-result ...');
    process.exit(2);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
