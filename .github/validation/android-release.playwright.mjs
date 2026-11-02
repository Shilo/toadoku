export default {
  testDir: '../../tests/browser',
  testMatch: 'gameplay-integration.spec.ts',
  fullyParallel: false,
  timeout: 45000,
  use: { browserName: 'chromium', headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  outputDir: '../../prototypes/production-ui-evidence/restore-review',
  reporter: 'list',
};
