import { mkdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { runProcess, type Clock } from './process.ts';

// 실행용 저장소 clone, 최종 diff, 채점용 복사본. 기준은 실행 계약 §3(작업 디렉터리), §6.2, §8.2

export class StepError extends Error {}

export interface StepOptions {
  logDir: string;
  // git 이 읽을 HOME. 비어 있는 디렉터리를 준다
  gitHome: string;
  timeoutMs: number;
  graceMs: number;
  clock?: Clock;
}

// host 의 전역 · 시스템 git 설정(excludesfile, autocrlf, 사용자 정보)이 작업 디렉터리 · diff 에 들어가지 않게 한다
function gitEnv(o: StepOptions): Record<string, string> {
  return {
    PATH: process.env.PATH ?? '',
    HOME: o.gitHome,
    XDG_CONFIG_HOME: o.gitHome,
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_TERMINAL_PROMPT: '0',
    GIT_AUTHOR_NAME: 'harness',
    GIT_AUTHOR_EMAIL: 'harness@localhost',
    GIT_COMMITTER_NAME: 'harness',
    GIT_COMMITTER_EMAIL: 'harness@localhost',
  };
}

// git 명령을 실행하고 출력을 logDir 의 <name>.out · <name>.err 에 남긴다. 0 이 아닌 종료 · 시간 초과 · 시작 실패는 StepError
async function git(name: string, args: string[], cwd: string, o: StepOptions, extraEnv: Record<string, string> = {}, stdoutPath?: string): Promise<string> {
  mkdirSync(o.gitHome, { recursive: true });
  const out = stdoutPath ?? path.join(o.logDir, `${name}.out`);
  const err = path.join(o.logDir, `${name}.err`);
  const r = await runProcess({
    cmd: 'git', args, cwd, env: { ...gitEnv(o), ...extraEnv },
    stdoutPath: out, stderrPath: err, timeoutMs: o.timeoutMs, graceMs: o.graceMs, clock: o.clock,
  });
  if (r.spawn_error !== null || r.timed_out || r.exit_code !== 0) {
    throw new StepError(`${name} 실패(exit ${r.exit_code}, signal ${r.signal}, timeout ${r.timed_out}, ${r.spawn_error ?? ''}): ${err}`);
  }
  return readFileSync(out, 'utf8');
}

// source commit 으로 clone 하고 origin 과 reflog 를 지운다. Agent 가 remote · reflog 로 원본 위치를 알 수 없게 한다
export async function cloneAt(repo: string, commit: string, dest: string, o: StepOptions): Promise<void> {
  mkdirSync(path.dirname(dest), { recursive: true });
  await git('clone', ['clone', '--quiet', '--no-hardlinks', repo, dest], path.dirname(dest), o);
  await git('reset', ['-C', dest, 'reset', '--quiet', '--hard', commit], dest, o);
  await git('remote-remove', ['-C', dest, 'remote', 'remove', 'origin'], dest, o);
  rmSync(path.join(dest, '.git', 'logs'), { recursive: true, force: true });
  rmSync(path.join(dest, '.git', 'ORIG_HEAD'), { force: true });
  const head = (await git('rev-parse', ['-C', dest, 'rev-parse', 'HEAD'], dest, o)).trim();
  if (head !== commit) throw new StepError(`HEAD ${head} 가 source commit ${commit} 과 다르다`);
}

// diff 에 쓰는 harness 소유 git 저장소. Agent 작업 디렉터리의 .git 은 Agent 가 바꾸거나 지울 수 있어 쓰지 않는다
export async function harnessGit(repo: string, dest: string, o: StepOptions): Promise<void> {
  mkdirSync(path.dirname(dest), { recursive: true });
  await git('clone-bare', ['clone', '--quiet', '--bare', '--no-hardlinks', repo, dest], path.dirname(dest), o);
}

// Agent 가 끝난 작업 디렉터리의 source commit 대비 diff. 추적하지 않던 새 파일을 포함하고 .gitignore 대상은 뺀다
export async function captureDiff(gitDir: string, indexFile: string, workspace: string, commit: string, artifactsDir: string, o: StepOptions): Promise<void> {
  const env = { GIT_INDEX_FILE: indexFile };
  const base = ['-c', 'core.bare=false', '-c', 'core.quotepath=false', `--git-dir=${gitDir}`, `--work-tree=${workspace}`];
  await git('read-tree', [...base, 'read-tree', commit], workspace, o, env);
  await git('add', [...base, 'add', '-A'], workspace, o, env);
  const diff = [...base, 'diff', '--cached', '--no-color', '--no-ext-diff'];
  await git('diff-patch', [...diff, '--binary', commit], workspace, o, env, path.join(artifactsDir, 'final.patch'));
  await git('diff-numstat', [...diff, '--numstat', commit], workspace, o, env, path.join(artifactsDir, 'diff-numstat.txt'));
  await git('diff-name-status', [...diff, '--name-status', '-M', commit], workspace, o, env, path.join(artifactsDir, 'diff-name-status.txt'));
}

// 채점 입력: source commit 을 새로 clone 하고 final.patch 를 적용한 복사본(실행 계약 §6.2)
export async function gradingCopy(repo: string, commit: string, patch: string, dest: string, o: StepOptions): Promise<void> {
  await cloneAt(repo, commit, dest, o);
  if (statSync(patch).size > 0) await git('apply', ['-C', dest, 'apply', '--binary', '--whitespace=nowarn', patch], dest, o);
}
