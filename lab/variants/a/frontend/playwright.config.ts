import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(frontendDir, '../backend');
const distDir = path.resolve(frontendDir, 'dist');
const port = Number(process.env.APP_PORT ?? '18080');
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  // 모든 시험이 한 애플리케이션(H2 in-memory)을 함께 쓴다
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['junit', { outputFile: 'reports/junit-e2e.xml' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: [
      'pnpm build',
      `cd "${backendDir}"`,
      './gradlew bootJar',
      `java -jar build/libs/shop-admin.jar --server.port=${port} --shop.frontend.dist-dir="${distDir}"`,
    ].join(' && '),
    cwd: frontendDir,
    url: `${baseURL}/login`,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
