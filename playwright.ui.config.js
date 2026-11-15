import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'ui-workspace.e2e.js',
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5182', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome', viewport: { width: 1280, height: 900 } } },
    { name: 'webkit', use: { browserName: 'webkit', viewport: { width: 1280, height: 900 } } },
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5182 --strictPort', url: 'http://127.0.0.1:5182', reuseExistingServer: false },
});
