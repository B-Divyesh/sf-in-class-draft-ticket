import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  // A deployed Container App keys the 40 req/s safety boundary to the
  // verifier's ingress address. Keep external projects serial so a rate-limit
  // assertion in one project cannot make an unrelated fresh-page accessibility
  // check in the other project receive its intentional 429 response.
  workers: externalBaseUrl ? 1 : undefined,
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  webServer: externalBaseUrl ? undefined : {
    // `npm test` prebuilds this binary before Playwright starts its server
    // timer, so the first claim command is reliable from a cold checkout.
    command: './target/debug/in-class-draft-ticket',
    url: 'http://127.0.0.1:8080/health',
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: '8080', DATA_DIR: './test-data', ALLOW_TEST_CLOCK: '1' }
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } }
  ]
});
