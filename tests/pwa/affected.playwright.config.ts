import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: '../browser', testMatch: ['built.spec.ts', 'gameplay-integration.spec.ts'],
  fullyParallel: false, workers: 1,
  use: { browserName: 'chromium', headless: true },
  outputDir: '../../prototypes/pwa-validation/affected-browser',
  reporter: 'list',
});
