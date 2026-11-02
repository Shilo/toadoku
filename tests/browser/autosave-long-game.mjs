import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from '../pwa/server.mjs';
import { TIME_SAVE_INTERVAL_MS } from '../../src/lib/gameplay/save-policy.ts';

// Serial production benchmark. A CPU slowdown is host-relative simulation, not Android hardware evidence.
// Run: node tests/browser/autosave-long-game.mjs <build-root> <fresh-label>
// Add --restore-fixture=<prior-run/fixture.json> for the identical game, --paced-only for per-edit saves.
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root = resolve(process.argv[2] ?? 'dist');
const dir = resolve('prototypes/pwa-validation/autosave-long-game', process.argv[3] ?? String(Date.now()));
const fixtureArg = process.argv.find(arg => arg.startsWith('--restore-fixture='));
const fixtureFile = fixtureArg?.slice('--restore-fixture='.length);
const pacedOnly = process.argv.includes('--paced-only');
const rapidOnly = process.argv.includes('--rapid-only');
const interval = Number(process.argv.find(arg => arg.startsWith('--interval='))?.slice('--interval='.length) ?? TIME_SAVE_INTERVAL_MS);
assert(Number.isSafeInteger(interval) && interval > 0);
await mkdir(dir, { recursive: true });
assert.equal(await stat(resolve(dir, 'profile')).then(() => true, error => {
  if (error.code === 'ENOENT') return false;
  throw error;
}), false, 'Use a new evidence label: benchmark profiles must start without an existing worker/cache');
const host = await staticHost({ root, port: 0 });
host.state.catalogRoot = resolve('public');
const context = await chromium.launchPersistentContext(resolve(dir, 'profile'), {
  headless: true, viewport: { width: 360, height: 800 }, deviceScaleFactor: 3,
});
context.setDefaultTimeout(20000);
let page = context.pages()[0];
const report = {
  interval,
  release: JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8')),
  environment: 'Desktop Chromium, 360x800 CSS px, DPR 3; 6x main-thread CPU slowdown after warm setup. This is host-relative simulation, not a particular phone or battery test.',
  instrumentation: 'Identical before/after hooks record constant-work metadata, native Attempt structuredClone/put duration, transaction boundaries, animation frames, trusted input to next animation-frame callback, and long tasks. Cross-phase frame gaps remain in boundaryFrames. Full-record readback runs in a separate verification phase. No JSON serialization inside timed hooks. Input timing is not full paint/INP. Checkpoint-overlap inputs begin at put, so frame gaps across the entire thinking period also cover earlier validation.',
  stages: [],
};
await context.addInitScript(interval => {
  const audit = window.__longSaveAudit = {
    phase: 'setup', phases: [{ name: 'setup', at: performance.now() }], frames: [], boundaryFrames: [], inputs: [], clones: [], transactions: [], checkpoints: [],
    longTasks: [], visibility: [], boardChanges: [], checkpointInputs: false,
  };
  let previousFrame, previousFramePhase;
  function frame(at) {
    if (audit.phase !== 'setup' && previousFrame !== undefined) {
      const sample = { at, gap: at - previousFrame, phase: audit.phase };
      if (previousFramePhase === audit.phase) audit.frames.push(sample);
      else audit.boundaryFrames.push({ ...sample, previousPhase: previousFramePhase });
    }
    previousFrame = at; previousFramePhase = audit.phase; requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  new PerformanceObserver(list => {
    for (const entry of list.getEntries()) audit.longTasks.push({ at: entry.startTime, duration: entry.duration,
      phase: audit.phases.findLast(phase => phase.at <= entry.startTime)?.name ?? 'setup',
      crossesPhaseBoundary: audit.phases.some(phase => phase.at > entry.startTime && phase.at < entry.startTime + entry.duration) });
  }).observe({ type: 'longtask', buffered: false });
  document.addEventListener('visibilitychange', () => audit.visibility.push({ at: performance.now(), hidden: document.hidden }));
  document.addEventListener('keydown', event => {
    if (audit.phase === 'setup') return;
    const input = { at: performance.now(), phase: audit.phase, key: event.key, trusted: event.isTrusted, nextFrameMs: null };
    audit.inputs.push(input); requestAnimationFrame(() => input.nextFrameMs = performance.now() - input.at);
  }, true);
  const clone = window.structuredClone;
  window.structuredClone = function (value, ...args) {
    const isAttempt = value && typeof value === 'object' && value.schemaVersion === 1 && Array.isArray(value.undo) && Array.isArray(value.entries);
    if (!isAttempt || audit.phase === 'setup') return clone.call(this, value, ...args);
    const at = performance.now(), result = clone.call(this, value, ...args);
    audit.clones.push({ at, duration: performance.now() - at, phase: audit.phase, history: value.undo.length, commandSeq: value.commandSeq });
    return result;
  };
  const timeout = window.setTimeout;
  window.setTimeout = function (callback, delay, ...args) {
    if (delay !== interval || typeof callback !== 'function') return timeout.call(this, callback, delay, ...args);
    return timeout.call(this, (...values) => {
      if (audit.phase === 'setup') return callback(...values);
      const event = { at: performance.now(), duration: null, phase: audit.phase };
      audit.checkpoints.push(event);
      try { return callback(...values); } finally { event.duration = performance.now() - event.at; }
    }, delay, ...args);
  };
  const transaction = IDBDatabase.prototype.transaction;
  const records = new WeakMap();
  IDBDatabase.prototype.transaction = function (stores, mode, ...args) {
    const at = performance.now(), tx = transaction.call(this, stores, mode, ...args);
    if (mode === 'readwrite' && [...tx.objectStoreNames].includes('attempts')) {
      const event = { at, complete: null, aborted: false, phase: audit.phase, gets: [], writes: [] };
      records.set(tx, event); audit.transactions.push(event);
      tx.addEventListener('complete', () => event.complete = performance.now());
      tx.addEventListener('abort', () => { event.aborted = true; event.complete = performance.now(); });
    }
    return tx;
  };
  const get = IDBObjectStore.prototype.get;
  IDBObjectStore.prototype.get = function (...args) {
    const request = get.apply(this, args), tx = records.get(this.transaction);
    if (this.name === 'attempts' && tx) {
      const event = { at: performance.now(), success: null }; tx.gets.push(event);
      request.addEventListener('success', () => event.success = performance.now());
    }
    return request;
  };
  const put = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, ...args) {
    const at = performance.now(), request = put.call(this, value, ...args), duration = performance.now() - at;
    if (this.name === 'attempts') {
      const tx = records.get(this.transaction);
      tx?.writes.push({ at, duration, commandSeq: value.commandSeq, elapsedMs: value.elapsedMs, history: value.undo?.length });
      if (audit.checkpointInputs && audit.phase === 'thinking') {
        audit.checkpointInputs = false;
        window.__checkpointPut({ at, commandSeq: value.commandSeq }).catch(() => {});
      }
    }
    return request;
  };
}, interval);

async function snapshot(target = page) {
  return target.evaluate(async () => {
    const db = await new Promise((done, fail) => {
      const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/'));
      request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error);
    });
    try {
      const names = [...db.objectStoreNames].filter(name => name !== 'cache');
      return await new Promise((done, fail) => {
        const tx = db.transaction(names, 'readonly'), result = {};
        for (const name of names) {
          const keys = tx.objectStore(name).getAllKeys(), values = tx.objectStore(name).getAll();
          result[name] = {};
          keys.onsuccess = () => { result[name].keys = keys.result; };
          values.onsuccess = () => { result[name].values = values.result; };
        }
        tx.oncomplete = () => done(result); tx.onabort = () => fail(tx.error);
      });
    } finally { db.close(); }
  });
}
const current = data => data.attempts.values.find(attempt => attempt.role === 'quick');
async function persisted(predicate) { await expect.poll(async () => predicate(current(await snapshot())), { timeout: 20000 }).toBe(true); }
async function phase(name) { await page.evaluate(name => { const audit = window.__longSaveAudit; audit.phases.push({ name, at: performance.now() }); audit.phase = name; }, name); }
async function audit() { return page.evaluate(() => window.__longSaveAudit); }
async function drained() { await expect.poll(() => page.evaluate(() => window.__longSaveAudit.transactions.every(tx => tx.complete !== null))).toBe(true); }
async function resume() {
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
}
async function more() {
  await page.locator('.dock .more').click();
  await expect(page.locator('#game-dialog-title')).toHaveText('Game');
}
function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.ceil(sorted.length * p) - 1] : null;
}
function summarize(data, name) {
  const transactions = data.transactions.filter(tx => tx.phase === name && tx.writes.length);
  const frames = data.frames.filter(frame => frame.phase === name);
  const inputs = data.inputs.filter(input => input.phase === name);
  return {
    name, attemptTransactions: transactions.length,
    transactionMs: transactions.map(tx => tx.complete - tx.at),
    transactionMedianMs: percentile(transactions.map(tx => tx.complete - tx.at), .5),
    nativePutMedianMs: percentile(transactions.flatMap(tx => tx.writes.map(write => write.duration)), .5),
    explicitAttemptClones: data.clones.filter(clone => clone.phase === name).length,
    explicitAttemptCloneTotalMs: data.clones.filter(clone => clone.phase === name).reduce((sum, clone) => sum + clone.duration, 0),
    frames: frames.length, frameGapP95Ms: percentile(frames.map(frame => frame.gap), .95), maxFrameGapMs: percentile(frames.map(frame => frame.gap), 1),
    inputCount: inputs.length, inputNextFrameP95Ms: inputs.length >= 20 ? percentile(inputs.map(input => input.nextFrameMs), .95) : null,
    inputNextFrameSamplesMs: inputs.map(input => input.nextFrameMs),
    longTasks: data.longTasks.filter(task => task.phase === name),
  };
}

let client;
try {
  await page.exposeBinding('__checkpointPut', async () => {
    // Native input during the real pending transaction. This does not cover work before put.
    await page.keyboard.press('ArrowRight');
  });
  await page.goto(host.origin + '/toadoku/');
  await expect(page.locator('.menu-more')).toBeEnabled();
  let fixture;
  if (fixtureFile) {
    fixture = JSON.parse(await readFile(resolve(fixtureFile), 'utf8'));
    await page.evaluate(async stores => {
      const db = await new Promise((done, fail) => {
        const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/'));
        request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error);
      });
      try {
        await new Promise((done, fail) => {
          const tx = db.transaction(Object.keys(stores), 'readwrite');
          for (const [name, data] of Object.entries(stores)) {
            const store = tx.objectStore(name); store.clear();
            data.values.forEach((value, index) => store.put(value, data.keys[index]));
          }
          tx.oncomplete = () => done(); tx.onabort = () => fail(tx.error);
        });
      } finally { db.close(); }
    }, fixture.stores);
    await page.reload(); await expect(page.locator('.menu-more')).toBeEnabled();
    await resume();
  } else {
    await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
    await page.getByRole('button', { name: 'Easy', exact: true }).click();
    await expect(page.locator('.cell')).toHaveCount(81);
    const initial = current(await snapshot());
    const blanks = [...initial.definition.givens].flatMap((digit, cell) => digit === '0' ? [cell] : []);
    const main = blanks.find(cell => cell % 9 < 7 && blanks.some(peer => peer !== cell && (Math.floor(peer / 9) === Math.floor(cell / 9) || peer % 9 === cell % 9 || (Math.floor(peer / 27) === Math.floor(cell / 27) && Math.floor(peer % 9 / 3) === Math.floor(cell % 9 / 3)))));
    assert.notEqual(main, undefined);
    const peer = blanks.find(cell => cell !== main && (Math.floor(cell / 9) === Math.floor(main / 9) || cell % 9 === main % 9 || (Math.floor(cell / 27) === Math.floor(main / 27) && Math.floor(cell % 9 / 3) === Math.floor(main % 9 / 3))));
    await page.locator(`[data-cell="${main}"]`).click();
    for (let index = 0; index < 512; index++) await page.keyboard.press(index % 2 ? '2' : '1');
    await persisted(attempt => attempt.undo.length === 512 && attempt.entries[main] === 2);
    await page.locator(`[data-cell="${peer}"]`).click();
    await page.keyboard.press('n'); await page.keyboard.press('1'); await page.keyboard.press('n');
    await page.locator(`[data-cell="${main}"]`).click(); await page.keyboard.press('1');
    await persisted(attempt => attempt.undo.length === 512 && attempt.undo.at(-1).changes.length > 1);
    fixture = { provenance: 'Generated entirely through native UI selection, 512 alternating digit edits, a peer note and a digit that clears that note. Valid worst retained single-cell history with a real multi-cell peer-pruning tail; not a claim to have simulated hours of human reasoning.', main, peer, stores: await snapshot() };
  }
  assert.equal(current(await snapshot()).undo.length, 512);
  const fixtureText = JSON.stringify(fixture);
  report.fixture = { source: fixtureFile ?? 'generated-native-input', sha256: createHash('sha256').update(fixtureText).digest('hex'), provenance: fixture.provenance, history: 512,
    logicalAttemptBytes: Buffer.byteLength(JSON.stringify(current(fixture.stores))), main: fixture.main, peer: fixture.peer };
  await writeFile(resolve(dir, 'fixture.json'), fixtureText);
  const readinessStartedAt = await page.evaluate(() => performance.now());
  // Installation hashes and reads back the complete shell inside install.waitUntil.
  // Controller alone can be observed before activate.waitUntil has settled.
  // waitForFunction tests the Promise itself as truthy in this Playwright version.
  // evaluate awaits it; expect.poll must retry its resolved Boolean instead.
  await expect.poll(async () => page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return Boolean(registration?.active?.state === 'activated' && !registration.installing && !registration.waiting
      && navigator.serviceWorker.controller?.state === 'activated'
      && navigator.serviceWorker.controller.scriptURL === registration.active.scriptURL);
  }), { intervals: [100], timeout: 60000 }).toBe(true);
  report.pwaReadiness = await page.evaluate(async startedAt => {
    const registration = await navigator.serviceWorker.getRegistration(), worker = registration.active;
    const activatedAt = performance.now();
    const reply = await new Promise((done, fail) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); fail(new Error('Initial shell verification did not finish')); }, 15000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); done(event.data); };
      worker.postMessage({ type: 'TOADOKU_SHELL_VERIFY', protocol: 1 }, [channel.port2]);
    });
    return { startedAt, activatedAt, verificationReplyAt: performance.now(), worker: worker.scriptURL, state: worker.state,
      controlled: navigator.serviceWorker.controller?.scriptURL === worker.scriptURL, reply };
  }, readinessStartedAt);
  assert.equal(report.pwaReadiness.reply.protocol, 1);
  assert.equal(report.pwaReadiness.reply.ready, true);
  assert.equal(report.pwaReadiness.reply.buildId, report.release.buildId);
  // Client initialization can happen well after navigation. Settle beyond its 5s
  // initial visible-page poll relative to full-shell verification, not navigation age.
  const initialPollSettleMs = 6500;
  await page.waitForTimeout(initialPollSettleMs);
  await page.waitForLoadState('networkidle');
  report.pwaReadiness.settledAt = await page.evaluate(() => performance.now());
  report.pwaReadiness.initialPollSettleMs = initialPollSettleMs;
  report.pwaReadiness.totalSettlingAfterVerificationMs = report.pwaReadiness.settledAt - report.pwaReadiness.verificationReplyAt;
  report.pwaReadiness.method = 'Fresh profile; native active worker activated and controlling page; compiled full-shell hash/readback in install.waitUntil, explicit native TOADOKU_SHELL_VERIFY ready reply for this build, then 6.5s unthrottled settling after verification to pass the first client visible-page poll. Networkidle drains that initial poll; it is not the proof of worker/cache completion.';
  client = await context.newCDPSession(page); await client.send('Emulation.setCPUThrottlingRate', { rate: 6 });
  report.cpuSlowdownRate = 6;
  // A real semantic edit resets the checkpoint schedule to a known boundary.
  await page.locator(`[data-cell="${fixture.main}"]`).click();
  await page.keyboard.press('2'); await persisted(attempt => attempt.entries[fixture.main] === 2);
  if (!pacedOnly) {
  if (!rapidOnly) {
  await page.evaluate(() => {
    window.__longSaveAudit.boardChanges = [];
    window.__longBoardObserver = new MutationObserver(records => {
      if (window.__longSaveAudit.phase === 'thinking') window.__longSaveAudit.boardChanges.push(...records.map(record => ({ at: performance.now(), type: record.type, attribute: record.attributeName })));
    });
    window.__longBoardObserver.observe(document.querySelector('.board'), { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'aria-pressed', 'data-clue', 'data-conflict'] });
  });
  await phase('thinking');
  // Pure thinking has no input, so time-only saves must not alter board DOM.
  await page.waitForTimeout(interval * 3 + 1200);
  const thinking = await audit();
  report.stages.push(summarize(thinking, 'thinking'));
  assert.equal(report.stages.at(-1).attemptTransactions, 3);
  assert.equal(thinking.boardChanges.length, 0, 'Time-only saves mutated board text/accessibility/cell state');
  report.stages.at(-1).boardMutations = thinking.boardChanges.length;
  await page.evaluate(() => window.__longBoardObserver.disconnect());
  // One additional real checkpoint overlapping a native input. Small n is reported raw.
  await phase('checkpoint-overlap');
  await phase('thinking'); await page.evaluate(() => { window.__longSaveAudit.checkpointInputs = true; });
  const overlapStart = await page.evaluate(() => performance.now());
  await expect.poll(() => page.evaluate(start => window.__longSaveAudit.inputs.filter(input => input.phase === 'thinking' && input.at > start).length, overlapStart), { timeout: interval + 5000 }).toBe(1);
  await page.waitForTimeout(500);
  const afterOverlap = await audit();
  report.stages.push({ name: 'checkpoint-put-overlap-input', samples: afterOverlap.inputs.filter(input => input.phase === 'thinking' && input.at > overlapStart), limitation: 'One real timer checkpoint sample, reported raw. Native input starts at put; earlier validation is covered by the full thinking frame trace.' });
  }
  await phase('rapid-setup');
  await page.locator(`[data-cell="${fixture.main}"]`).click();
  await persisted(attempt => attempt.selection === fixture.main);
  const beforeRapidSequence = current(await snapshot()).commandSeq;
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await phase('rapid-edits');
  for (let index = 0; index < 40; index++) await page.keyboard.press(index % 2 ? '2' : '1');
  // Keep all pending application saves inside the measured phase; full readback is separate.
  await drained(); await page.waitForTimeout(100);
  await phase('rapid-verification');
  await persisted(attempt => attempt.entries[fixture.main] === 2 && attempt.undo.length === 512 && attempt.commandSeq >= beforeRapidSequence + 40);
  const rapid = await audit(); report.stages.push(summarize(rapid, 'rapid-edits'));
  assert.equal(report.stages.at(-1).inputCount, 40);
  assert(report.stages.at(-1).inputNextFrameSamplesMs.every(value => value !== null));
  assert(report.stages.at(-1).inputNextFrameP95Ms < 200, 'Rapid-edit input responsiveness exceeded 200ms at 6x slowdown');
  if (!rapidOnly) {
  await phase('navigation'); await more(); await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await expect(page.locator('.menu-more')).toBeEnabled(); await drained();
  await phase('menu'); await page.waitForTimeout(interval + 500);
  report.stages.push(summarize(await audit(), 'menu')); assert.equal(report.stages.at(-1).attemptTransactions, 0);
  await phase('navigation'); await resume();
  let hiddenMethod = 'Native background tab after disabling Playwright focus emulation';
  await phase('hide-transition');
  await client.send('Emulation.setFocusEmulationEnabled', { enabled: false });
  const cover = await context.newPage(); await cover.bringToFront();
  const nativeHidden = await page.evaluate(() => document.hidden);
  if (!nativeHidden) {
    await cover.close();
    hiddenMethod = 'Delivered synthetic pagehide; disabling focus emulation and switching tabs did not produce document.hidden in headless Chromium. No hardware event-delivery claim.';
    await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  }
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'blur(12px)');
  await drained(); await phase('hidden'); await page.waitForTimeout(interval + 500);
  report.stages.push({ ...summarize(await audit(), 'hidden'), method: hiddenMethod }); assert.equal(report.stages.at(-1).attemptTransactions, 0);
  await phase('navigation');
  if (nativeHidden) { await page.bringToFront(); await cover.close(); }
  else await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'none');
  }
  }
  if (!rapidOnly) {
  await phase('paced-setup');
  await page.locator(`[data-cell="${fixture.main}"]`).click();
  await persisted(attempt => attempt.selection === fixture.main); await drained();
  const beforePaced = current(await snapshot());
  const firstDigit = beforePaced.entries[fixture.main] === 1 ? 2 : 1;
  // Let setup serialization and its observer callbacks finish before the first measured key.
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
  await phase('paced-edits');
  for (let index = 0; index < 40; index++) {
    await page.keyboard.press(String(index % 2 ? 3 - firstDigit : firstDigit));
    await page.waitForTimeout(175);
  }
  await drained(); await page.waitForTimeout(100);
  await phase('paced-verification');
  await persisted(attempt => attempt.commandSeq >= beforePaced.commandSeq + 40 && attempt.entries[fixture.main] === 3 - firstDigit && attempt.undo.length === 512);
  const paced = await audit(), pacedSummary = summarize(paced, 'paced-edits');
  const pacedTransactions = paced.transactions.filter(tx => tx.phase === 'paced-edits' && tx.writes.length);
  const pacedInputs = paced.inputs.filter(input => input.phase === 'paced-edits');
  assert.equal(pacedInputs.length, 40);
  assert.equal(pacedTransactions.length, 40, 'Paced edits unexpectedly coalesced; this sample must exercise each ordinary per-edit save');
  assert.deepEqual(pacedTransactions.map(tx => tx.writes[0].commandSeq), Array.from({ length: 40 }, (_, index) => beforePaced.commandSeq + index + 1));
  assert(pacedTransactions.every(tx => tx.complete !== null && !tx.aborted));
  assert(pacedTransactions.slice(0, -1).every((tx, index) => tx.complete < pacedInputs[index + 1].at), 'Paced save did not complete before next native input');
  assert(pacedSummary.inputNextFrameSamplesMs.every(value => value !== null));
  assert(pacedSummary.inputNextFrameP95Ms < 200, 'Paced-edit input responsiveness exceeded 200ms at 6x slowdown');
  report.stages.push({ ...pacedSummary, spacingAfterEachNativeKeyMs: 175, eachEditCommittedBeforeNextInput: true, finalSequenceAndValueReadbackPassed: true });
  }
  await phase('navigation');
  await more(); await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await expect(page.locator('.menu-more')).toBeEnabled();
  const beforeReopen = await snapshot();
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  report.raw = await audit();
  report.browser = context.browser().version();
  await page.close(); page = await context.newPage();
  await page.goto(host.origin + '/toadoku/'); await expect(page.locator('.menu-more')).toBeEnabled(); await resume();
  const afterReopen = await snapshot();
  for (const key of ['entries', 'notes', 'undo', 'notesMode', 'logicalRevision']) assert.deepEqual(current(afterReopen)[key], current(beforeReopen)[key], 'Reopen changed ' + key);
  assert.deepEqual(afterReopen.profile, beforeReopen.profile); assert.deepEqual(afterReopen.receipts, beforeReopen.receipts);
  const expectedUndo = current(afterReopen).undo.at(-1);
  await page.keyboard.press('Control+z');
  await persisted(attempt => attempt.undo.length === 511 && expectedUndo.changes.every(change => attempt.entries[change.cell] === change.beforeValue && attempt.notes[change.cell] === change.beforeNotes));
  report.stages.push({ name: 'reopen-and-real-undo', entriesNotesHistoryAndWalletPreserved: true, undoRestoredExpectedValues: true });
  assert(report.raw.transactions.filter(tx => tx.phase !== 'setup').every(tx => tx.complete !== null && !tx.aborted), 'Measured transaction aborted or never completed');
  report.passed = true;
} catch (error) {
  report.error = String(error); report.stack = error.stack; process.exitCode = 1;
  try { report.raw = await audit(); } catch {}
} finally {
  await context.close(); await host.close();
  await writeFile(resolve(dir, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ dir, passed: report.passed, error: report.error, fixture: report.fixture, stages: report.stages }));
}
