import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser', testMatch: 'theme-polish.spec.ts', fullyParallel: false, workers: 1,
  timeout: 120_000, expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://127.0.0.1:5195', browserName: 'chromium', headless: true,
    timezoneId: 'America/Los_Angeles', viewport: { width: 360, height: 800 },
    reducedMotion: 'reduce', trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: { command: 'npm run dev -- --port 5195 --strictPort', url: 'http://127.0.0.1:5195', reuseExistingServer: true },
  outputDir: '../prototypes/theme-polish/playwright', reporter: 'list',
});
