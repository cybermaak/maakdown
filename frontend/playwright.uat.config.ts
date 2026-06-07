import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
const port = 5191;
const baseURL = `http://127.0.0.1:${port}`;

/**
 * UI-driven UAT suite (see docs/uat-test-plan.md). Runs the real Svelte app via
 * a production UAT-mode bundle, which swaps the Wails IPC boundary for a
 * deterministic mock.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  workers: 2,
  timeout: 60_000,
  globalTimeout: 10 * 60_000,
  reporter: isCI
    ? [['junit', { outputFile: 'uat-results/junit.xml' }], ['html', { outputFolder: 'uat-results/html', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'uat-results/html', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/serve-uat.mjs',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000
  }
});
