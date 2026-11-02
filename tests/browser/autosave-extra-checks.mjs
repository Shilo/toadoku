import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, openSync, readFileSync } from 'node:fs';
import { appendFile, copyFile, mkdir, readFile, readdir, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { resolve } from 'node:path';

assert.equal(process.platform, 'linux', 'This isolated runner uses Linux process identities');
const root = process.cwd(), output = resolve('prototypes/pwa-validation/autosave-extra-checks');
const baseline = '6eaf5b1911dd57d11683dda3b088bc28d9696afd';
const before = resolve(process.env.RUNNER_TEMP, 'toadoku-autosave-before');
const fixture = resolve('tests/browser/fixtures/autosave-validation.json');
const fixtureHash = '43cc2a395101a16f2281264b8fdda96f829f150fe2754fb12c58bc5edbd4086a';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
await mkdir(output, { recursive: true });
assert.equal(hash(await readFile(fixture)), fixtureHash);
const report = {
  environment: { node: process.version, os: os.release(), arch: os.arch(), cores: os.cpus().length, cpu: os.cpus()[0].model,
    host: 'GitHub-hosted Ubuntu 24.04; CPU slowdown is simulation, not Android hardware',
    run: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` },
  currentCommit: git('rev-parse', 'HEAD'), baselineCommit: baseline, fixtureHash,
  order: ['optimized-paced', 'baseline-paced', 'native-recovery'], jobs: [], results: [],
};
const files = ['src/lib/storage/decode.ts', 'src/lib/gameplay/game.ts', 'tests/browser/autosave-long-game.mjs', 'tests/browser/save-optimization.mjs'];
report.sourceFiles = await Promise.all(files.map(async path => ({ path, sha256: hash(await readFile(path)) })));
for (const file of report.sourceFiles.filter(file => file.path.startsWith('src/'))) {
  assert.equal(file.sha256, hash(execFileSync('git', ['show', '21cee7c358cc1bdfc8c9c60d8803a638a9855fd0:' + file.path])), 'Runtime differs from accepted published source');
}

// Capture Linux birth ticks to avoid signalling a subsequently reused process ID.
function identity(pid) {
  try { return readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ').at(-1).split(' ')[19]; } catch { return; }
}
function ownedTree(pid) {
  const rows = execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n').map(row => row.trim().split(/\s+/).map(Number));
  const owned = new Set([pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const [child, parent] of rows) if (owned.has(parent) && !owned.has(child)) { owned.add(child); changed = true; }
  }
  return [...owned].reverse().map(pid => ({ pid, birth: identity(pid) }));
}
function signalOwned(tree, signal) {
  for (const item of tree) if (item.birth !== undefined && identity(item.pid) === item.birth) {
    try { process.kill(item.pid, signal); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}
async function run(label, command, args, cwd = root) {
  const initialFreeGiB = os.freemem() / 2 ** 30;
  assert(initialFreeGiB >= 8, `Not enough RAM for ${label}: ${initialFreeGiB} GiB`);
  const log = openSync(resolve(output, label + '.log'), 'w');
  const job = { label, command, args, cwd, initialFreeGiB, minFreeGiB: initialFreeGiB, startedAt: new Date().toISOString(), pressure: false };
  report.jobs.push(job);
  const child = spawn(command, args, { cwd, detached: true, stdio: ['ignore', log, log], env: { ...process.env, TOADOKU_BASE: '/toadoku/' } });
  job.pid = child.pid;
  let killTimer, killCompletion, stopping = false;
  const stop = reason => {
    if (stopping) return;
    stopping = true; job.stopReason = reason;
    const tree = ownedTree(child.pid); job.terminatedOwnedPids = tree.map(item => item.pid);
    signalOwned(tree, 'SIGTERM');
    killCompletion = new Promise(done => {
      killTimer = setTimeout(() => { signalOwned(tree, 'SIGKILL'); done(); }, 2000);
    });
  };
  const tick = setInterval(() => {
    job.minFreeGiB = Math.min(job.minFreeGiB, os.freemem() / 2 ** 30);
    if (job.minFreeGiB < 6) { job.pressure = true; stop('memory'); }
  }, 1000);
  const deadline = setTimeout(() => stop('120-second deadline'), 120000);
  const cancel = () => stop('runner cancellation');
  process.once('SIGTERM', cancel); process.once('SIGINT', cancel);
  const started = performance.now();
  try {
    const result = await new Promise((done, fail) => { child.once('error', fail); child.once('close', (code, signal) => done({ code, signal })); });
    Object.assign(job, result, { durationMs: performance.now() - started });
    assert.equal(result.code, 0, `${label} failed; see its log`);
    assert(!stopping && !job.pressure, `${label} stopped by guard`);
  } finally {
    clearInterval(tick); clearTimeout(deadline);
    // Parent exit alone does not prove its detached browser descendants stopped.
    if (killCompletion) await killCompletion;
    clearTimeout(killTimer);
    process.removeListener('SIGTERM', cancel); process.removeListener('SIGINT', cancel);
    closeSync(log); job.finishedAt = new Date().toISOString();
    await writeFile(resolve(output, 'summary.json'), JSON.stringify(report, null, 2));
  }
}
async function browser(label, script, args, resultPath) {
  try { await run(label, process.execPath, [script, ...args]); }
  finally {
    try { await copyFile(resultPath, resolve(output, label + '.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (label === 'native-recovery') {
      try { await copyFile(resolve('prototypes/pwa-validation/save-optimization-browser/remote-extra-recovery/emergency-recovery.json'), resolve(output, 'native-emergency-recovery.json')); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
  }
  const result = JSON.parse(await readFile(resultPath, 'utf8'));
  assert.equal(result.passed, true);
  report.results.push({ label, sha256: hash(await readFile(resultPath)), releaseBuild: result.release?.buildId, stages: result.stages });
  return result;
}
try {
  assert.equal(git('diff', baseline, 'HEAD', '--', 'package.json', 'package-lock.json'), '', 'Dependency changes prevent a shared install comparison');
  await run('create-baseline-checkout', 'git', ['worktree', 'add', '--detach', before, baseline]);
  await symlink(resolve(root, 'node_modules'), resolve(before, 'node_modules'), 'dir');
  await run('build-current', process.execPath, ['node_modules/vite/bin/vite.js', 'build']);
  await run('validate-current', process.execPath, ['tools/pwa/validate.mjs', 'dist']);
  await run('build-baseline', process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build'], before);
  await run('validate-baseline', process.execPath, ['tools/pwa/validate.mjs', resolve(before, 'dist')]);
  const optimized = await browser('optimized-paced', 'tests/browser/autosave-long-game.mjs', ['dist', 'remote-optimized', '--restore-fixture=' + fixture, '--paced-only'],
    resolve('prototypes/pwa-validation/autosave-long-game/remote-optimized/results.json'));
  const original = await browser('baseline-paced', 'tests/browser/autosave-long-game.mjs', [resolve(before, 'dist'), 'remote-baseline', '--restore-fixture=' + fixture, '--paced-only'],
    resolve('prototypes/pwa-validation/autosave-long-game/remote-baseline/results.json'));
  assert.equal(optimized.fixture.sha256, fixtureHash); assert.equal(original.fixture.sha256, fixtureHash);
  assert(optimized.pwaReadiness.reply.ready && original.pwaReadiness.reply.ready);
  await browser('native-recovery', 'tests/browser/save-optimization.mjs', ['dist', 'remote-extra-recovery', '--recovery-only'],
    resolve('prototypes/pwa-validation/save-optimization-browser/remote-extra-recovery/results.json'));
  report.accepted = true;
} catch (error) {
  report.error = String(error); process.exitCode = 1;
} finally {
  const artifacts = [];
  for (const name of await readdir(output)) if (name !== 'summary.json' && name !== 'manifest.json') {
    const bytes = await readFile(resolve(output, name)); artifacts.push({ name, bytes: bytes.length, sha256: hash(bytes) });
  }
  assert(artifacts.reduce((sum, file) => sum + file.bytes, 0) < 9 * 2 ** 20, 'Diagnostic artifacts exceed allowance');
  report.artifacts = artifacts;
  await writeFile(resolve(output, 'summary.json'), JSON.stringify(report, null, 2));
  const allBytes = await Promise.all((await readdir(output)).map(async name => (await stat(resolve(output, name))).size));
  assert(allBytes.reduce((sum, bytes) => sum + bytes, 0) < 10 * 2 ** 20, 'Diagnostic total exceeds 10 MiB');
  // A failed test may upload its bounded evidence; an oversized bundle may not.
  if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, 'receipts_ready=true\n');
  console.log(JSON.stringify(report, null, 2));
}
