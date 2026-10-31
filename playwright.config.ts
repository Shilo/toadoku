import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:5179', browserName: 'chromium', headless: true },
  webServer: { command: 'npm run dev -- --port 5179 --strictPort', url: 'http://127.0.0.1:5179', reuseExistingServer: true },
  outputDir: 'prototypes/production-ui-evidence/playwright',
  reporter: 'list'
});
