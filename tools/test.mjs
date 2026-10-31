import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Keep runner caches/evidence local and stable in restricted Windows sessions.
const artifactRoot = resolve('prototypes/production-ui-evidence');
const temp = resolve(artifactRoot, 'tmp');
mkdirSync(temp, { recursive: true });
const mode = process.argv[2];
const unit = mode === 'unit';
const cli = resolve(unit ? 'node_modules/vitest/vitest.mjs' : 'node_modules/@playwright/test/cli.js');
const args = mode === 'install' ? ['install', 'chromium'] : unit ? ['run'] : ['test'];
const result = spawnSync(process.execPath, [cli, ...args, ...process.argv.slice(3)], {
  stdio: 'inherit',
  env: { ...process.env, TEMP: temp, TMP: temp, PLAYWRIGHT_BROWSERS_PATH: resolve(artifactRoot, 'browsers') }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
