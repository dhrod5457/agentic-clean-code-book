import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { AGENT_OK, fixture, readEnv, tmp } from './helpers.ts';

const CLI = path.resolve(import.meta.dirname, '../src/cli.ts');

test('run 명령은 shell 에 token 이 없으면 token 파일 값을 Agent 에 넘기고, 출력에는 token 을 쓰지 않는다', () => {
  const f = fixture(AGENT_OK);
  const home = tmp('home-');
  mkdirSync(path.join(home, '.config', 'agentic-lab'), { recursive: true });
  writeFileSync(path.join(home, '.config', 'agentic-lab', 'claude-oauth-token'), 'sk-ant-oat01-from-file\n', { mode: 0o600 });
  const config = path.join(f.dir, 'exec.json');
  const tasks = path.join(f.dir, 'tasks.json');
  writeFileSync(config, JSON.stringify(f.config));
  writeFileSync(tasks, JSON.stringify(f.tasks));
  const { CLAUDE_CODE_OAUTH_TOKEN: _drop, ...env } = process.env;
  const r = spawnSync('node', [CLI, 'run', '--experiment', 'pilot-1', '--task', 'exp1', '--variant', 'a', '--repetition', '1',
    '--source-repo', f.source.repo, '--source-commit', f.source.commit, '--port', String(f.spec().port),
    '--results-root', f.resultsRoot, '--config', config, '--tasks', tasks], { encoding: 'utf8', env: { ...env, HOME: home } });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stdout + r.stderr, /from-file/);
  const out = JSON.parse(r.stdout);
  assert.equal(out.runs[0].state, 'completed');
  assert.equal(out.runs[0].grading, 'passed');
  assert.equal(readEnv(f.envFile).CLAUDE_CODE_OAUTH_TOKEN, 'sk-ant-oat01-from-file');
});

test('run 명령은 잘못된 이어서 실행 인자나 구독 token 이 없으면 실행을 시작하지 않고 exit 2 로 끝난다', () => {
  const f = fixture(AGENT_OK);
  const config = path.join(f.dir, 'exec.json');
  const tasks = path.join(f.dir, 'tasks.json');
  writeFileSync(config, JSON.stringify(f.config));
  writeFileSync(tasks, JSON.stringify(f.tasks));
  const base = ['run', '--experiment', 'pilot-1', '--task', 'exp1', '--variant', 'a', '--repetition', '1',
    '--source-repo', f.source.repo, '--source-commit', f.source.commit, '--port', String(f.spec().port),
    '--results-root', f.resultsRoot, '--config', config, '--tasks', tasks];
  const { CLAUDE_CODE_OAUTH_TOKEN: _drop, ...env } = process.env;
  const cases: [string[], Record<string, string | undefined>][] = [
    [['--resume-attempt', '2', '--resume-retry-of', '20261003T000000Z-abcdef', '--resume-counted', 'x'], process.env],
    [['--resume-attempt', '2', '--resume-counted', '1'], process.env],
    [[], { ...env, HOME: tmp('home-') }],
  ];
  for (const [extra, e] of cases) {
    const r = spawnSync('node', [CLI, ...base, ...extra], { encoding: 'utf8', env: e });
    assert.equal(r.status, 2, `${extra.join(' ')}\n${r.stdout}${r.stderr}`);
    assert.equal(existsSync(path.join(f.resultsRoot, 'runs')), false, extra.join(' '));
  }
});
