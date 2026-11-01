import { defineConfig } from 'vitest/config';

/** QA001: pure critical decision coverage, complementary to native transaction/browser gates. */
export default defineConfig({ test: {
  // The unchanged complete UI/scene suite remains a separate `npm test` gate.
  include: ['tests/{adversarial,catalog,gameplay,hints,modes,rewards,session,storage,sudoku}/**/*.test.ts'],
  coverage: {
    enabled: true,
    provider: 'v8',
    reporter: ['text', 'json', 'json-summary', 'html'],
    reportsDirectory: 'prototypes/gameplay-validation/coverage',
    include: [
      'src/lib/sudoku/{rules,solver,topology}.ts',
      'src/lib/session/{reducer,clock,input}.ts',
      'src/lib/rewards/index.ts', 'src/lib/modes/index.ts',
      'src/lib/hints/{index,detect,witness}.ts',
      'src/lib/storage/{decode,json,namespace,backup,disclosure,history-codec,physical-backup,prepare-restore,raw-recovery-codec}.ts',
      'src/lib/catalog/{decode,select,attestation}.ts',
      'src/lib/gameplay/controller.ts',
    ],
    thresholds: { perFile: true, statements: 100, branches: 100, functions: 100, lines: 100 },
  },
} });
