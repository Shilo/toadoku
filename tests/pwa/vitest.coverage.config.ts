import { defineConfig } from 'vitest/config';
/** Measured PWA decision coverage complements production-worker/native-IDB lifecycle evidence. */
export default defineConfig({ test: {
  include: ['tests/{pwa,offline,catalog}/**/*.test.ts'],
  maxWorkers: 2,
  coverage: {
    enabled: true, provider: 'v8', reporter: ['text', 'json', 'json-summary', 'html'],
    reportsDirectory: 'prototypes/pwa-validation/coverage',
    include: [
      'src/lib/pwa/{policy,install,client}.ts',
      'src/lib/offline/{plan,verify,reserve}.ts',
      'src/lib/catalog/load.ts',
    ],
  },
} });
