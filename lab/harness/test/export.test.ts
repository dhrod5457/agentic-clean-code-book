import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { tmp } from './helpers.ts';

const SCRIPT = path.resolve(import.meta.dirname, '../export.sh');

// 작성용 저장소 흉내: lab/variants/a 에 commit 된 파일과 미commit 파일을 둔다
function authoringRepo(files: Record<string, string>): string {
  const root = tmp('author-');
  const dir = path.join(root, 'lab', 'variants', 'a');
  mkdirSync(dir, { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), body);
  }
  const git = (...a: string[]) => execFileSync('git', ['-C', root, ...a], { encoding: 'utf8' });
  git('init', '--quiet', '-b', 'main');
  git('add', '-A');
  git('-c', 'user.name=t', '-c', 'user.email=t@example.com', 'commit', '--quiet', '-m', 'v', '--', 'lab');
  return dir;
}

test('commit 된 Variant 내용만 commit 1개의 새 저장소로 내보내고, 같은 내용이면 같은 commit SHA 다', () => {
  const dir = authoringRepo({ 'README.md': 'shop admin\n', 'backend/App.java': 'class App {}\n' });
  writeFileSync(path.join(dir, 'untracked.txt'), 'x\n');
  const out1 = tmp('export-');
  const out2 = tmp('export-');
  const r1 = spawnSync(SCRIPT, [dir, out1], { encoding: 'utf8' });
  const r2 = spawnSync(SCRIPT, [dir, out2], { encoding: 'utf8' });
  assert.equal(r1.status, 0, r1.stderr);
  const sha = r1.stdout.trim().split('\n').at(-1);
  assert.equal(sha, r2.stdout.trim().split('\n').at(-1));
  const repo = path.join(out1, 'shop-admin');
  assert.deepEqual(readdirSync(repo).sort(), ['.git', 'README.md', 'backend']);
  assert.equal(execFileSync('git', ['-C', repo, 'rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim(), '1');
  assert.equal(execFileSync('git', ['-C', repo, 'log', '-1', '--format=%an %s'], { encoding: 'utf8' }).trim(), 'dev Initial commit');
});

test('금지 문자열이나 지침 파일이 있으면 내보내지 않는다', () => {
  const cases: Record<string, string>[] = [{ 'README.md': 'A/B Experiment 저장소\n' }, { 'src/x.ts': '// variant b\n' }, { 'CLAUDE.md': 'rules\n' }, { '.claude/settings.json': '{}\n' }];
  for (const files of cases) {
    const dir = authoringRepo(files);
    const out = tmp('export-');
    const r = spawnSync(SCRIPT, [dir, out], { encoding: 'utf8' });
    assert.equal(r.status, 1, JSON.stringify(files));
    assert.match(r.stderr, /내보내기 검사 실패/);
    assert.equal(existsSync(path.join(out, 'shop-admin')), false);
  }
});
