import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const [oldRoot, newRoot] = process.argv.slice(2), target = JSON.parse(await readFile(resolve(newRoot, 'release.json'), 'utf8'));
const dir = resolve('prototypes/pwa-validation/update-cancellation-' + Date.now()); await mkdir(dir, { recursive: true });
const host = await staticHost({ root: oldRoot, port: 0 });
const context = await chromium.launchPersistentContext(resolve(dir, 'profile'), { headless: true, viewport: { width: 360, height: 800 } });
const page = context.pages()[0], url = host.origin + '/toadoku/', events = [], errors = [];
page.on('pageerror', error => errors.push(String(error))); page.setDefaultTimeout(15000);
const mark = (name, details = {}) => { events.push({ name, ...details }); console.log(JSON.stringify(events.at(-1))); };
const build = () => page.locator('meta[name="toadoku-build"]').getAttribute('content');
async function current(targetPage = page) {
  return targetPage.evaluate(async () => {
    const db = await new Promise(done => { const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/')); request.onsuccess = () => done(request.result); });
    try { return await new Promise((done, fail) => { const tx = db.transaction('attempts', 'readonly'), request = tx.objectStore('attempts').getAll(); tx.oncomplete = () => done(request.result.find(attempt => attempt.role === 'quick')); tx.onabort = () => fail(tx.error); }); } finally { db.close(); }
  });
}
async function closeDialogs() {
  for (let count = 0; count < 8 && await page.getByRole('dialog').count(); count++) {
    const title = await page.locator('#game-dialog-title').textContent(); await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.waitForFunction(previous => document.querySelector('#game-dialog-title')?.textContent !== previous, title);
  }
}
async function more() { await page.locator('.dock .more').click(); await expect(page.getByRole('dialog', { name: 'Game', exact: true })).toBeVisible(); }
try {
  await page.goto(url); await expect(page.locator('.menu-more')).toBeEnabled();
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state), { timeout: 30000 }).toBe('activated');
  const original = await build(), cell = Number(await page.locator('[data-clue=false]').first().getAttribute('data-cell'));
  host.state.root = resolve(newRoot); await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); });
  await expect(page.locator('.dock .more .notes-mode')).toHaveText('Update', { timeout: 30000 });
  assert.notEqual(original, target.buildId);
  await page.evaluate(() => {
    window.__holdKind = ''; window.__heldKind = ''; window.__releaseConfirm = () => {};
    const get = IDBObjectStore.prototype.get, put = IDBObjectStore.prototype.put;
    function hold(store) {
      function pump() { const request = get.call(store, 'isolated-keepalive'); request.onsuccess = () => { if (window.__holdKind) pump(); }; }
      pump();
    }
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      if (window.__holdKind === 'save' && !window.__heldKind && this.name === 'attempts') { window.__heldKind = 'save'; hold(this); }
      return request;
    };
    IDBObjectStore.prototype.get = function (...args) {
      const request = get.apply(this, args);
      if (['readback', 'authority'].includes(window.__holdKind) && !window.__heldKind && this.name === 'meta' && this.transaction.mode === 'readonly') { window.__heldKind = window.__holdKind; hold(this); }
      return request;
    };
    const post = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function (message, ...args) {
      if (window.__holdKind === 'confirm' && !window.__heldKind && message.protocol === 2 && message.type === 'TOADOKU_PAGE_CONNECT') {
        window.__heldKind = 'confirm'; window.__releaseConfirm = () => post.call(this, message, ...args); return;
      }
      return post.call(this, message, ...args);
    };
  });
  for (const kind of ['save', 'readback', 'confirm']) {
    await page.evaluate(kind => { window.__heldKind = ''; window.__holdKind = kind; }, kind);
    if (kind === 'save') { await page.locator(`[data-cell="${cell}"]`).click(); await page.keyboard.press('2'); }
    await more(); await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__heldKind)).toBe(kind);
    const updating = page.getByRole('dialog', { name: 'Updating…', exact: true });
    await expect(updating).toBeVisible(); await updating.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(updating).toHaveCount(0); assert.equal(await build(), original);
    // A newer local semantic command must survive the older continuation.
    await page.getByRole('button', { name: 'Notes', exact: true }).click();
    await page.evaluate(() => { window.__holdKind = ''; window.__releaseConfirm(); window.__releaseConfirm = () => {}; });
    await expect.poll(async () => (await current()).notesMode).toBe(kind !== 'readback');
    await closeDialogs(); await expect(page.locator('.cell')).toHaveCount(81);
    assert.equal(await build(), original); mark('cancel-' + kind + '-ignores-late-completion', { newerCommandSaved: true });
  }
  await page.evaluate(() => {
    window.__hiddenProbe = true;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__hiddenProbe });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const other = await context.newPage(); await other.goto(url); await expect(other.locator('.menu-more')).toBeEnabled();
  await other.getByRole('button', { name: 'Quick Play', exact: true }).click(); await other.getByRole('button', { name: 'Resume', exact: true }).click(); await expect(other.locator('.cell')).toHaveCount(81);
  const owner = await current(other);
  await page.evaluate(() => {
    window.__holdKind = 'authority'; window.__heldKind = ''; window.__hiddenProbe = false;
    window.dispatchEvent(new Event('pageshow')); document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.__heldKind)).toBe('authority');
  await expect(page.locator('.cell')).toHaveCount(0); await expect(page.locator('.dock .more')).toBeEnabled();
  await page.keyboard.press('9'); await more(); await page.getByRole('button', { name: 'Main menu', exact: true }).click();
  await expect(page.locator('.menu-more')).toBeEnabled();
  await page.evaluate(() => { window.__holdKind = ''; });
  await expect.poll(() => page.evaluate(() => window.__holdKind)).toBe('');
  await page.waitForTimeout(250);
  await expect(page.locator('.menu-more')).toBeEnabled();
  const after = await current(other); assert.deepEqual(after.entries, owner.entries); assert.deepEqual(after.notes, owner.notes);
  mark('held-returning-authority-keeps-board-hidden-and-menu-reachable', { syntheticVisibility: true, staleInputCouldNotChangeOtherOwner: true });
  await other.close(); await context.close();
  const unsupported = await chromium.launchPersistentContext(resolve(dir, 'unsupported-profile'), { headless: true, viewport: { width: 360, height: 800 } });
  try {
    await unsupported.addInitScript(() => { delete Navigator.prototype.serviceWorker; });
    const unavailable = unsupported.pages()[0]; unavailable.on('pageerror', error => errors.push(String(error)));
    await unavailable.goto(url); await expect(unavailable.locator('.menu-more')).toBeEnabled();
    await unavailable.locator('.menu-more').click(); await unavailable.getByRole('button', { name: 'Settings', exact: true }).click();
    await unavailable.getByRole('button', { name: 'Install and offline', exact: true }).click();
    await expect(unavailable.getByRole('button', { name: 'Prepare offline play', exact: true })).toBeDisabled();
    await expect(unavailable.getByText('Offline app installation is unavailable here.', { exact: true })).toBeVisible();
    mark('unsupported-offline-preparation-explains-disabled-action');
  } finally { await unsupported.close(); }
  assert.deepEqual(errors, []);
} catch (error) { process.exitCode = 1; mark('failure', { error: String(error), stack: error.stack }); }
finally { await page.evaluate(() => { window.__holdKind = ''; window.__releaseConfirm?.(); }).catch(() => {}); await context.close(); await host.close(); await writeFile(resolve(dir, 'results.json'), JSON.stringify({ events, errors, requests: host.state.requests }, null, 2)); console.log('Evidence: ' + dir); }
