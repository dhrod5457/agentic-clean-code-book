import { defineConfig, devices } from '@playwright/test';

// 채점 대상 애플리케이션은 run.sh 가 단일 port 로 띄운다. 이 설정은 서버를 띄우지 않는다.
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['junit', { outputFile: process.env.GRADING_JUNIT ?? 'reports/junit-grading.xml' }]],
  snapshotPathTemplate: '{testFileDir}/__screenshots__/{arg}{ext}',
  expect: { toHaveScreenshot: { maxDiffPixels: 0, animations: 'disabled' } },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.GRADING_BASE_URL ?? 'http://localhost:18080',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    trace: 'retain-on-failure',
  },
});
