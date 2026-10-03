// Claude Code hook: 도구 호출 입력과 결과에 기록 시각을 붙여 hooks.jsonl 에 추가한다.
// 시험 명령(Bash)이 끝나면(성공 · 실패 모두) 그 명령 시작 이후 바뀐 시험 결과 파일만 artifacts/test-<순번>/ 에 복사한다.
// 표준 출력에 쓰지 않고 항상 exit 0 으로 끝난다.
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const OUT = process.env.RECORD_OUT_DIR ?? '/opt/cc-out';
// 결과 파일 위치의 기준. 입력의 cwd 는 Bash 의 cd 를 따라 바뀌므로 쓰지 않는다
const WORKSPACE = process.env.RECORD_WORKSPACE ?? '/work/shop-admin';
const TEST_COMMAND = /gradlew\b.*\btest\b|\bvitest\b|\bverify-all\.sh\b|\bpnpm(\s+(-C|--dir)\s+\S+)?(\s+run)?\s+(test|e2e|test:stories)\b|\bplaywright\s+test\b/;
const RESULT_ROOTS = ['backend/build/test-results', 'frontend/test-results', 'frontend/reports'];

function filesUnder(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function copyNewResults(cwd, sinceMs) {
  const files = RESULT_ROOTS.flatMap((root) => filesUnder(path.join(cwd, root)))
    .filter((f) => statSync(f).mtimeMs >= sinceMs)
    .filter((f) => !f.includes(`${path.sep}frontend${path.sep}reports${path.sep}`) || /junit.*\.xml$/.test(f));
  if (files.length === 0) return null;
  const base = path.join(OUT, 'artifacts');
  mkdirSync(base, { recursive: true });
  const dest = path.join(base, `test-${String(readdirSync(base).length + 1).padStart(3, '0')}`);
  for (const f of files) {
    const target = path.join(dest, path.relative(cwd, f));
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(f, target);
  }
  return path.relative(OUT, dest);
}

try {
  const phase = process.argv[2];
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const at = new Date().toISOString();
  mkdirSync(path.join(OUT, 'pre'), { recursive: true });
  const record = { at, phase, ...input };
  const id = typeof input.tool_use_id === 'string' ? input.tool_use_id.replace(/[^A-Za-z0-9_-]/g, '') : '';
  const command = input.tool_name === 'Bash' && typeof input.tool_input?.command === 'string' ? input.tool_input.command : '';
  if (phase === 'pre' && id) writeFileSync(path.join(OUT, 'pre', id), String(Date.now()));
  if (phase === 'post' && id && TEST_COMMAND.test(command) && existsSync(path.join(OUT, 'pre', id))) {
    const since = Number(readFileSync(path.join(OUT, 'pre', id), 'utf8'));
    record.copied_test_results = copyNewResults(WORKSPACE, since);
  }
  appendFileSync(path.join(OUT, 'hooks.jsonl'), `${JSON.stringify(record)}\n`);
} catch (e) {
  try {
    appendFileSync(path.join(OUT, 'hook-errors.log'), `${new Date().toISOString()} ${e instanceof Error ? e.message : String(e)}\n`);
  } catch {
    // 기록할 곳도 없으면 조용히 끝낸다
  }
}
process.exit(0);
