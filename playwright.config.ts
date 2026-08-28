import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: {
    // `npm test` prebuilds this binary before Playwright starts its server
    // timer, so the first claim command is reliable from a cold checkout.
    command: './target/debug/in-class-draft-ticket',
    url: 'http://127.0.0.1:8080/health',
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: '8080', DATA_DIR: './test-data' }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
  ]
});
