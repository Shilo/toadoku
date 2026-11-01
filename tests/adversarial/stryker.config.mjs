/** QA001: no publication/dashboard upload; machine evidence remains local and ignored. */
export default {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  // QA001-F5: official runner troubleshooting recommends forks for threads-only hangs.
  vitest: { configFile: 'tests/adversarial/vitest.mutation.config.ts', related: true, pool: 'forks' },
  mutate: [
    'src/lib/sudoku/{rules,solver,topology}.ts',
    'src/lib/session/{reducer,clock,input}.ts',
    'src/lib/rewards/index.ts', 'src/lib/modes/index.ts',
    'src/lib/hints/{index,detect,witness}.ts',
    'src/lib/storage/{decode,json,namespace,backup,disclosure,history-codec,physical-backup,prepare-restore,raw-recovery-codec}.ts',
    'src/lib/catalog/{decode,select,attestation}.ts',
    'src/lib/gameplay/controller.ts',
  ],
  concurrency: 2,
  // Sandbox-copy filter only: none of these directories supplies runtime/test inputs.
  ignorePatterns: ['/prototypes/**', '/.agents/**', '/.codex/**', '/dist/**'],
  // Restricted Windows sessions prohibit these links; native resolution reaches root node_modules.
  symlinkNodeModules: false,
  tempDirName: 'prototypes/gameplay-validation/stryker-tmp',
  reporters: ['progress', 'clear-text', 'json', 'html', 'event-recorder'],
  eventReporter: { baseDir: 'prototypes/gameplay-validation/mutation/events' },
  jsonReporter: { fileName: 'prototypes/gameplay-validation/mutation/mutation.json' },
  htmlReporter: { fileName: 'prototypes/gameplay-validation/mutation/index.html' },
  thresholds: { high: 100, low: 100, break: 100 },
  timeoutMS: 10000,
  timeoutFactor: 2,
  dryRunTimeoutMinutes: 10,
  disableBail: false,
  cleanTempDir: false,
  incremental: true,
  incrementalFile: 'prototypes/gameplay-validation/mutation/incremental.json',
  // Stryker hardcodes root stryker.log; capture console debug under ignored prototypes instead.
  fileLogLevel: 'off',
};
