import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import base from '../theme-browser.config';

export default defineConfig({
  ...base, testDir: '../browser', testMatch: 'themes.spec.ts', globalTimeout: 120000,
  use: { ...base.use, baseURL: 'http://127.0.0.1:5197' },
  webServer: { cwd: fileURLToPath(new URL('../../', import.meta.url)), command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5197 --strictPort', url: 'http://127.0.0.1:5197', reuseExistingServer: false },
  outputDir: '../../prototypes/pwa-validation/theme-regression',
});
