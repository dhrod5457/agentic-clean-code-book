import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
