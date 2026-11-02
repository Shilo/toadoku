import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from '../pwa/server.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root = resolve(process.argv[2] ?? 'dist');
const dir = resolve('prototypes/pwa-validation/save-optimization-browser', process.argv[3] ?? String(Date.now()));
const recoveryOnly = process.argv.includes('--recovery-only');
await mkdir(dir, { recursive: true });
await mkdir(resolve(dir, 'downloads'), { recursive: true });
const release = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
const report = { release, environment: 'Production Chromium on desktop, fresh isolated profile; JSON sizes are logical record bytes, not physical disk writes or phone measurements.', stages: [] };
const host = await staticHost({ root, port: 0 });
const context = await chromium.launchPersistentContext(resolve(dir, 'profile'), { headless: true, acceptDownloads: true, downloadsPath: resolve(dir, 'downloads'), artifactsDir: resolve(dir, 'artifacts'), viewport: { width: 360, height: 800 } });
let page = context.pages()[0];
context.setDefaultTimeout(12000);
await context.addInitScript(() => {
  window.__saveAudit = [];
  window.__failAttemptPuts = false;
  window.__failedAttemptPuts = 0;
  window.__visibilityAudit = [{ at: performance.now(), hidden: document.hidden, kind: 'initial' }];
  document.addEventListener('visibilitychange', event => {
    window.__visibilityAudit.push({ at: performance.now(), hidden: document.hidden, kind: 'visibilitychange', trusted: event.isTrusted });
  });
  const transactions = new WeakMap();
  const original = IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put = function (value, ...args) {
    if (this.name === 'attempts' && window.__failAttemptPuts) {
      window.__failedAttemptPuts++;
      throw new DOMException('Isolated test quota failure', 'QuotaExceededError');
    }
    if (['attempts', 'meta', 'profile', 'receipts'].includes(this.name)) {
      let event = transactions.get(this.transaction);
      if (!event) {
        event = { at: performance.now(), complete: null, aborted: false, writes: [] };
        transactions.set(this.transaction, event);
        window.__saveAudit.push(event);
        this.transaction.addEventListener('complete', () => event.complete = performance.now());
        this.transaction.addEventListener('abort', () => { event.aborted = true; });
      }
      event.writes.push({ store: this.name, bytes: new TextEncoder().encode(JSON.stringify(value)).length,
        commandSeq: value.commandSeq, elapsedMs: value.elapsedMs, selection: value.selection });
    }
    return original.call(this, value, ...args);
  };
});

async function snapshot(target = page) {
  return target.evaluate(async () => {
    const db = await new Promise((done, fail) => {
      const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/'));
      request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error);
    });
    try {
      return await new Promise((done, fail) => {
        const tx = db.transaction(['attempts', 'profile', 'receipts'], 'readonly'), result = {};
        for (const name of ['attempts', 'profile', 'receipts']) {
          const request = tx.objectStore(name).getAll(); request.onsuccess = () => { result[name] = request.result; };
        }
        tx.oncomplete = () => done(result); tx.onabort = () => fail(tx.error);
      });
    } finally { db.close(); }
  });
}
const current = data => data.attempts.find(attempt => attempt.role === 'quick');
async function writes(target = page) {
  return target.evaluate(() => window.__saveAudit.filter(tx => tx.writes.some(write => write.store === 'attempts')));
}
async function sample(name, duration, expected) {
  const before = (await writes()).length;
  const started = await page.evaluate(() => performance.now());
  await page.waitForTimeout(duration);
  const events = (await writes()).slice(before);
  assert.equal(events.length, expected, name + ' attempt transaction count');
  assert(events.every(event => event.complete !== null && !event.aborted), name + ' transaction completion');
  report.stages.push({ name, observedMs: await page.evaluate(start => performance.now() - start, started), attemptTransactions: events.length, events });
  return events;
}
async function closeDialogs() {
  for (let n = 0; n < 8 && await page.getByRole('dialog').count(); n++) {
    const title = await page.locator('#game-dialog-title').textContent();
    await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
    await page.waitForFunction(previous => document.querySelector('#game-dialog-title')?.textContent !== previous, title);
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function more() {
  await closeDialogs(); await page.locator('.dock .more').click();
  await expect(page.locator('#game-dialog-title')).toHaveText('Game');
}
async function resume(target = page) {
  await target.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await target.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(target.locator('.cell')).toHaveCount(81);
}
async function persisted(predicate) {
  await expect.poll(async () => predicate(current(await snapshot()))).toBe(true);
}

try {
  await page.goto(host.origin + '/toadoku/');
  await expect(page.locator('.menu-more')).toBeEnabled();
  let original, cell;
  if (recoveryOnly) {
    await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
    await page.getByRole('button', { name: 'Easy', exact: true }).click();
    await expect(page.locator('.cell')).toHaveCount(81);
    cell = Number(await page.locator('[data-clue=false]').first().getAttribute('data-cell'));
    await page.locator(`[data-cell="${cell}"]`).click();
    await page.keyboard.press('n'); await page.keyboard.press('3');
    await persisted(attempt => attempt.notesMode && attempt.notes[cell] === 4);
    original = await snapshot();
    report.stages.push({ name: 'focused-recovery-fixture', notesModeAndNoteCommitted: true });
  } else {
  await sample('fresh-main-menu-no-recurring-save', 10500, 0);
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await page.waitForTimeout(100);
  original = await snapshot();
  await page.evaluate(() => {
    window.__boardChanges = [];
    window.__boardObserver = new MutationObserver(records => window.__boardChanges.push(...records.map(record => ({ type: record.type, attribute: record.attributeName }))));
    window.__boardObserver.observe(document.querySelector('.board'), { subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: ['aria-label', 'aria-pressed', 'data-clue', 'data-conflict'] });
  });
  const idle = await sample('visible-thinking-31-seconds', 31000, 3);
  assert(idle.slice(1).every((event, index) => event.at - idle[index].at >= 9500));
  assert(current(await snapshot()).elapsedMs >= 30000);
  const boardChanges = await page.evaluate(() => { window.__boardObserver.disconnect(); return window.__boardChanges; });
  assert.equal(boardChanges.length, 0, 'Time-only saves changed board text, accessibility labels or cell states');
  report.stages.push({ name: 'time-saves-do-not-refresh-board', changes: boardChanges });

  await more();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#game-dialog-title')).toHaveText('Settings');
  const geometry = await page.evaluate(async () => {
    const dialog = document.querySelector('dialog'), states = new Set();
    let running = true, frames = 0;
    function frame() {
      if (!running) return;
      const rect = dialog.getBoundingClientRect();
      states.add(JSON.stringify([rect.x, rect.y, rect.width, rect.height, dialog.scrollHeight]));
      frames++; requestAnimationFrame(frame);
    }
    const start = window.__saveAudit.length; frame();
    await new Promise(done => setTimeout(done, 20500)); running = false;
    return { frames, states: [...states], transactions: window.__saveAudit.slice(start).filter(tx => tx.writes.some(write => write.store === 'attempts')) };
  });
  assert.equal(geometry.states.length, 1, 'Settings changed layout during routine saves');
  assert(geometry.transactions.length >= 2, 'Settings sample did not span two real saves');
  report.stages.push({ name: 'settings-layout-across-time-saves', ...geometry });
  await closeDialogs();

  // Start away from the right edge so every Right/Left pair is a real move.
  cell = 0;
  await page.locator(`[data-cell="${cell}"]`).click();
  const burstStart = (await writes()).length;
  const burstAt = performance.now();
  for (let index = 0; index < 20; index++) await page.keyboard.press(index % 2 ? 'ArrowLeft' : 'ArrowRight');
  const burstMs = performance.now() - burstAt;
  await page.waitForTimeout(350);
  const burstWrites = (await writes()).slice(burstStart);
  assert(burstWrites.length <= 2 && burstWrites.length >= 1, 'Arrow burst did not coalesce');
  assert.equal(current(await snapshot()).selection, cell);
  report.stages.push({ name: 'twenty-real-arrow-inputs', burstMs, attemptTransactions: burstWrites.length, selection: cell });

  // A cursor update immediately followed by a real edit must bypass the cursor deadline.
  cell = Number(await page.locator('[data-clue=false]').nth(1).getAttribute('data-cell'));
  await page.locator(`[data-cell="${cell}"]`).click();
  const digitAt = performance.now();
  await page.keyboard.press('1');
  await persisted(attempt => attempt.entries[cell] === 1);
  const digitMs = performance.now() - digitAt;
  await page.keyboard.press('Backspace');
  await persisted(attempt => attempt.entries[cell] === 0);
  await page.keyboard.press('n');
  await persisted(attempt => attempt.notesMode);
  await page.keyboard.press('3');
  await persisted(attempt => attempt.notes[cell] === 4);
  await page.keyboard.press('Control+z');
  await persisted(attempt => attempt.notes[cell] === 0);
  await page.keyboard.press('3');
  await persisted(attempt => attempt.notes[cell] === 4);
  report.stages.push({ name: 'digit-note-mode-note-and-undo-committed', firstDigitReadbackMs: digitMs });

  await more(); await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'blur(12px)');
  await page.waitForTimeout(100);
  const paused = current(await snapshot());
  await sample('explicit-pause-no-recurring-save', 10500, 0);
  assert.equal(current(await snapshot()).elapsedMs, paused.elapsedMs);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  const boundaryBefore = current(await snapshot()).elapsedMs;
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'blur(12px)');
  await persisted(attempt => attempt.elapsedMs > boundaryBefore + 1000);
  const hiddenTime = current(await snapshot()).elapsedMs;
  await sample('delivered-pagehide-no-recurring-save', 10500, 0);
  assert.equal(current(await snapshot()).elapsedMs, hiddenTime);
  report.stages.push({ name: 'lifecycle-final-sub-five-second-sample', beforeElapsed: boundaryBefore, hiddenElapsed: hiddenTime, method: 'Synthetic pagehide/pageshow events; no claim about mobile event delivery or OS suspension.' });
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'none');

  await more(); await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await expect(page.locator('.menu-more')).toBeEnabled();
  await page.waitForTimeout(100);
  await sample('main-menu-after-playing-no-recurring-save', 10500, 0);
  const beforeReopen = await snapshot();
  await page.close(); page = await context.newPage();
  await page.goto(host.origin + '/toadoku/'); await resume();
  const reopened = await snapshot();
  assert.deepEqual(current(reopened).entries, current(beforeReopen).entries);
  assert.deepEqual(current(reopened).notes, current(beforeReopen).notes);
  assert.equal(current(reopened).notesMode, true);
  assert.deepEqual(reopened.profile, original.profile);
  assert.deepEqual(reopened.receipts, original.receipts);
  report.stages.push({ name: 'close-document-and-resume-persisted-progress', entriesNotesModeAndWalletPreserved: true });
  }

  await page.evaluate(() => { window.__failAttemptPuts = true; });
  await page.locator(`[data-cell="${cell}"]`).press('5');
  await more();
  await expect(page.getByText('Changes are not saved', { exact: true })).toBeVisible();
  const failures = await page.evaluate(() => window.__failedAttemptPuts);
  assert(failures > 0);
  const failureElapsed = current(await snapshot()).elapsedMs;
  await page.waitForTimeout(5500);
  assert.equal(await page.evaluate(() => window.__failedAttemptPuts), failures, 'Failed save retried automatically');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export emergency recovery', exact: true }).click();
  const download = await downloadPromise;
  try { await download.saveAs(resolve(dir, 'emergency-recovery.json')); }
  catch (error) { report.downloadFailure = { failure: await download.failure(), pageClosed: page.isClosed(), url: download.url() }; throw error; }
  const recovery = JSON.parse(await readFile(resolve(dir, 'emergency-recovery.json'), 'utf8'));
  assert.equal(recovery.localAttempt.notes[cell], 4 | 16);
  assert(recovery.localAttempt.elapsedMs >= failureElapsed + 5000);
  await page.evaluate(() => { window.__failAttemptPuts = false; });
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect(page.getByText('Changes are not saved', { exact: true })).toHaveCount(0);
  await persisted(attempt => attempt.notes[cell] === (4 | 16) && attempt.elapsedMs >= failureElapsed + 5000);
  report.stages.push({ name: 'native-quota-no-retry-loop-and-explicit-recovery', failedPuts: failures, durableBeforeElapsed: failureElapsed, recoveredElapsed: current(await snapshot()).elapsedMs });
  await closeDialogs();

  const oldOwner = current(await snapshot());
  const second = await context.newPage();
  await second.goto(host.origin + '/toadoku/'); await resume(second);
  const takeoverAt = performance.now();
  await page.bringToFront();
  const visibility = await page.evaluate(() => ({ hidden: document.hidden, online: navigator.onLine }));
  assert.equal(visibility.hidden, false, 'Old owner was not visible for automatic detection');
  await expect(page.locator('.cell')).toHaveCount(0, { timeout: 12000 });
  const concealmentMs = performance.now() - takeoverAt;
  const winner = current(await snapshot(second));
  assert.equal(winner.id, oldOwner.id); assert(winner.writer.epoch > oldOwner.writer.epoch);
  await page.keyboard.press('9');
  const afterStaleInput = await snapshot(second);
  assert.deepEqual(current(afterStaleInput).entries, winner.entries);
  assert.deepEqual(current(afterStaleInput).notes, winner.notes);
  assert.deepEqual(afterStaleInput.profile, original.profile);
  assert.deepEqual(afterStaleInput.receipts, original.receipts);
  report.stages.push({ name: 'native-two-window-takeover', concealmentMs, visibility,
    oldOwnerVisibilityEvents: await page.evaluate(() => window.__visibilityAudit),
    newOwnerVisibilityEvents: await second.evaluate(() => window.__visibilityAudit),
    winnerEpoch: winner.writer.epoch, staleInputCouldNotChangeProgressOrWallet: true });
  await second.close();
  report.browser = context.browser().version(); report.passed = true;
} catch (error) {
  report.error = String(error); report.stack = error.stack; process.exitCode = 1;
} finally {
  await context.close(); await host.close();
  await writeFile(resolve(dir, 'results.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ dir, passed: report.passed, error: report.error, stages: report.stages.map(({ name, attemptTransactions, concealmentMs }) => ({ name, attemptTransactions, concealmentMs })) }));
}
