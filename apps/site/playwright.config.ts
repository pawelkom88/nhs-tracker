import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium-js',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium-nojs',
      use: {
        ...devices['Desktop Chrome'],
        javaScriptEnabled: false,
      },
    },
    {
      name: 'firefox-js',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-js',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-js',
      use: {
        viewport: { width: 390, height: 844 },
        userAgent: devices['iPhone 14'].userAgent,
      },
    },
  ],
  webServer: {
    command: 'pnpm build && npx serve out -l 4173 --no-port-switching -n',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    env: {
      KYW_DATA_DIR: 'test/fixtures/data',
    },
  },
});
