import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  testDir: '.', testMatch: ['native.spec.ts', 'mutation.spec.ts'], fullyParallel: false, timeout: 90_000,
  use: { baseURL: 'http://127.0.0.1:5187', headless: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { command: 'npm run dev -- --port 5187 --strictPort', cwd: fileURLToPath(new URL('../..', import.meta.url)), url: 'http://127.0.0.1:5187', reuseExistingServer: true },
  outputDir: '../../prototypes/gameplay-validation/storage-native', reporter: 'list',
});
