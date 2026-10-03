import { createServer } from 'node:net';
import path from 'node:path';

// lab/grading/run.sh 호출과 결과 판정. 기준은 실행 계약 §6.3, §6.4

export type SuiteKind = 'normative' | 'diagnostic';

// run.sh 가 INT · TERM trap 으로 끝난 종료 코드. harness 가 보낸 시간 초과가 아니면 외부에서 중단된 것이다.
// 137 · 143 은 run.sh 가 아니라 build 자식(gradlew, pnpm)이 signal 로 죽은 경우라 여기에 넣지 않는다. 그 경우는 묶음 error 다
export const INTERRUPTED_EXIT = [130];
export type SuiteStatus = 'passed' | 'failed' | 'error' | 'timed_out';

// run.sh 와 같은 규칙으로 묶음 이름을 파일 이름으로 바꾼다(exp2/T2-M1 → exp2-T2-M1)
export function suiteFileName(suite: string): string {
  return suite.replace(/\//g, '-');
}

export function gradingArgs(workspace: string, port: number, suite: string): string[] {
  return [workspace, String(port), suite];
}

export function junitPath(logDir: string, suite: string): string {
  return path.join(logDir, `junit-${suiteFileName(suite)}.xml`);
}

export interface JunitSummary {
  tests: number;
  failures: number;
  errors: number;
  skipped: number;
  failed_tests: string[];
}

function attr(attrs: string, name: string): string | null {
  const m = new RegExp(`\\b${name}="([^"]*)"`).exec(attrs);
  return m ? m[1] : null;
}

function unescapeXml(s: string): string {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

// Playwright JUnit reporter 의 출력을 읽는다. 읽을 수 없으면 null
export function parseJunit(xml: string): JunitSummary | null {
  const root = /<testsuites\b([^>]*)>/.exec(xml);
  if (!root) return null;
  const num = (name: string) => Number(attr(root[1], name) ?? 'NaN');
  const summary: JunitSummary = { tests: num('tests'), failures: num('failures'), errors: num('errors'), skipped: num('skipped'), failed_tests: [] };
  if ([summary.tests, summary.failures, summary.errors].some(Number.isNaN)) return null;
  if (Number.isNaN(summary.skipped)) summary.skipped = 0;
  for (const m of xml.matchAll(/<testcase\b([^>]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g)) {
    const body = m[2] ?? '';
    if (body.includes('<failure') || body.includes('<error')) {
      summary.failed_tests.push(unescapeXml(attr(m[1], 'name') ?? ''));
    }
  }
  return summary;
}

// 실행 계약 §6.3 의 묶음 판정. run.sh 를 시작하지 못한 경우는 묶음 판정이 아니라 harness 실패라 여기서 다루지 않는다
export function suiteStatus(exitCode: number | null, timedOut: boolean, junit: JunitSummary | null): SuiteStatus {
  if (timedOut) return 'timed_out';
  if (junit !== null && junit.failures + junit.errors > 0) return 'failed';
  if (exitCode === 0 && junit !== null && junit.tests > 0) return 'passed';
  return 'error';
}

export function portFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}
