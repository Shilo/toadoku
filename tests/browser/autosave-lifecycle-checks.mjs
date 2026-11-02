import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { openSync, closeSync, readFileSync } from 'node:fs';
import { appendFile, copyFile, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { resolve } from 'node:path';

assert.equal(process.platform, 'linux');
const output = resolve('prototypes/pwa-validation/autosave-lifecycle-checks'); await mkdir(output, { recursive: true });
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const fixture = 'tests/browser/fixtures/autosave-dense512.json';
assert.equal(hash(await readFile(fixture)), '1bc26b438300479126d5d11c7562df111607aa0f05c4d7d9cc6d2f20b0cd4cba');
const report = { commit: git('rev-parse', 'HEAD'), acceptedAppCommit: '29227c7',
  environment: { os: os.release(), cpu: os.cpus()[0].model, cores: os.cpus().length, node: process.version,
    method: 'Serial isolated Ubuntu runner; six-times CPU slowdown is host-relative simulation, not phone evidence.' },
  run: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`, jobs: [], results: [] };
const sourceFiles = [...git('ls-files', 'src', 'package.json', 'package-lock.json').split('\n'),
  'tests/browser/autosave-long-game.mjs', 'tests/browser/save-optimization.mjs', 'tests/storage/time-checkpoint-native.ts', fixture];
report.sourceFiles = await Promise.all(sourceFiles.map(async path => ({ path, sha256: hash(await readFile(path)) })));
for (const path of sourceFiles.filter(path => path.startsWith('src/') || path === 'package.json' || path === 'package-lock.json')) {
  assert.equal(hash(await readFile(path)), hash(execFileSync('git', ['show', report.acceptedAppCommit + ':' + path], { maxBuffer: 8 * 1024 * 1024 })));
}
function identity(pid) {
  try { return readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').at(-1).split(' ')[19]; } catch { return; }
}
function ownedTree(pid) {
  const rows = execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n').map(row => row.trim().split(/\s+/).map(Number));
  const owned = new Set([pid]);
  for (let changed = true; changed;) { changed = false; for (const [child, parent] of rows) if (owned.has(parent) && !owned.has(child)) { owned.add(child); changed = true; } }
  return [...owned].reverse().map(pid => ({ pid, birth: identity(pid) }));
}
function signalOwned(tree, signal) {
  for (const item of tree) if (item.birth !== undefined && identity(item.pid) === item.birth) {
    try { process.kill(item.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}
async function run(label, args, deadlineMs = 180000) {
  const initialFreeGiB = os.freemem() / 2 ** 30; assert(initialFreeGiB >= 8, `Insufficient RAM for ${label}: ${initialFreeGiB}`);
  const log = openSync(resolve(output, label + '.log'), 'w');
  const job = { label, args, initialFreeGiB, minFreeGiB: initialFreeGiB, pressure: false }; report.jobs.push(job);
  const child = spawn(process.execPath, args, { detached: true, stdio: ['ignore', log, log] });
  let stopping = false, killTimer, killCompletion;
  const stop = reason => {
    if (stopping) return; stopping = true; job.stopReason = reason;
    const tree = ownedTree(child.pid); job.terminatedOwnedPids = tree.map(item => item.pid); signalOwned(tree, 'SIGTERM');
    killCompletion = new Promise(done => { killTimer = setTimeout(() => { signalOwned(tree, 'SIGKILL'); done(); }, 2000); });
  };
  const tick = setInterval(() => { job.minFreeGiB = Math.min(job.minFreeGiB, os.freemem() / 2 ** 30); if (job.minFreeGiB < 6) { job.pressure = true; stop('memory'); } }, 1000);
  const deadline = setTimeout(() => stop('deadline'), deadlineMs), cancel = () => stop('runner cancellation');
  process.once('SIGTERM', cancel); process.once('SIGINT', cancel); const started = performance.now();
  try {
    const result = await new Promise((done, fail) => { child.once('error', fail); child.once('close', (code, signal) => done({ code, signal })); });
    Object.assign(job, result, { durationMs: performance.now() - started });
    assert.equal(result.code, 0, `${label} failed`); assert(!stopping && !job.pressure, `${label} guard stopped`);
  } finally {
    clearInterval(tick); clearTimeout(deadline); if (killCompletion) await killCompletion; clearTimeout(killTimer);
    process.removeListener('SIGTERM', cancel); process.removeListener('SIGINT', cancel); closeSync(log);
    await writeFile(resolve(output, 'summary.json'), JSON.stringify(report, null, 2));
  }
}
async function browser(label, script, args, resultPath) {
  try { await run(label, [script, ...args], 360000); }
  finally { try { await copyFile(resultPath, resolve(output, label + '.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  const result = JSON.parse(await readFile(resultPath)); assert.equal(result.passed, true);
  report.results.push({ label, sha256: hash(await readFile(resultPath)), buildId: result.release?.buildId, stages: result.stages });
}
try {
  // Reuse completed local unit/type/native gates against the exact verified runtime.
  // This runner finishes only the production browser checks blocked by local RAM.
  await run('build', ['node_modules/vite/bin/vite.js', 'build']);
  await run('validate', ['tools/pwa/validate.mjs', 'dist']);
  await copyFile('dist/release.json', resolve(output, 'release.json'));
  await browser('long-slow-phone', 'tests/browser/autosave-long-game.mjs', ['dist', 'remote-lifecycle-dense', '--restore-fixture=' + fixture],
    'prototypes/pwa-validation/autosave-long-game/remote-lifecycle-dense/results.json');
  await browser('readable-overlays', 'tests/browser/save-optimization.mjs', ['dist', 'remote-lifecycle-overlays', '--overlay-only'],
    'prototypes/pwa-validation/save-optimization-browser/remote-lifecycle-overlays/results.json');
  await browser('recovery', 'tests/browser/save-optimization.mjs', ['dist', 'remote-lifecycle-recovery', '--recovery-only'],
    'prototypes/pwa-validation/save-optimization-browser/remote-lifecycle-recovery/results.json');
  await copyFile('prototypes/pwa-validation/save-optimization-browser/remote-lifecycle-recovery/emergency-recovery.json', resolve(output, 'emergency-recovery.json'));
  report.passed = true;
} catch (error) { report.error = String(error); process.exitCode = 1; }
finally {
  await writeFile(resolve(output, 'summary.json'), JSON.stringify(report, null, 2));
  let bytes = 0; for (const path of await readdir(output)) bytes += (await stat(resolve(output, path))).size;
  assert(bytes <= 10 * 1024 * 1024, 'Evidence exceeds10MiB upload allowance');
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'receipts_ready=true\n');
  console.log(JSON.stringify({ passed: report.passed, error: report.error, bytes, jobs: report.jobs }));
}
