import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const [legacyText, bText, cText] = process.argv.slice(2);
assert(legacyText && bText && cText, 'Usage: automatic-updates.mjs <captured-0.0.46> <B> <C>');
const roots = [legacyText, bText, cText].map(path => resolve(path));
const releases = await Promise.all(roots.map(async root => JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'))));
const dir = resolve('prototypes/pwa-validation/automatic-updates-' + Date.now()); await mkdir(dir, { recursive: true });
const host = await staticHost({ root: roots[0], port: 0 }); host.state.catalogRoot = resolve('public');
const url = host.origin + '/toadoku/', events = [], errors = [];
let context, page, old;
const mark = (name, details = {}) => { const entry = { name, ...details }; events.push(entry); console.log(JSON.stringify(entry)); };
const build = target => target.locator('meta[name="toadoku-build"]').getAttribute('content');
async function rpc(target, protocol = 1) {
  return target.evaluate(protocol => new Promise(async (done, fail) => {
    const worker = (await navigator.serviceWorker.getRegistration())?.active;
    if (!worker) return done(null);
    const channel = new MessageChannel(), timer = setTimeout(() => fail(Error('RPC timeout')), 15000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); done(event.data); };
    worker.postMessage({ protocol, type: 'TOADOKU_SHELL_VERIFY' }, [channel.port2]);
  }), protocol);
}
async function snapshot(target) {
  return target.evaluate(async () => {
    const db = await new Promise((done, fail) => { const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/')); request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error); });
    try { return await new Promise((done, fail) => { const tx = db.transaction(['attempts', 'profile'], 'readonly'), result = {};
      for (const name of ['attempts', 'profile']) { const request = tx.objectStore(name).getAll(); request.onsuccess = () => result[name] = request.result; }
      tx.oncomplete = () => done(result); tx.onabort = () => fail(tx.error);
    }); } finally { db.close(); }
  });
}
async function start(target, role = 'quick') {
  await target.getByRole('button', { name: role === 'quick' ? 'Quick Play' : 'Progression', exact: true }).click();
  await target.getByRole('button', { name: role === 'quick' ? 'Easy' : 'Start', exact: true }).click();
  await expect(target.locator('.cell')).toHaveCount(81);
}
async function more(target) { await target.locator('.dock .more').click(); await expect(target.getByRole('dialog')).toBeVisible(); }
async function closeDialog(target) { await target.getByRole('button', { name: 'Close', exact: true }).click(); }
async function updateCheck(target) { await target.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); }); }
async function launched(offline = false) {
  context = await chromium.launchPersistentContext(resolve(dir, 'profile'), { headless: true, viewport: { width: 360, height: 800 }, acceptDownloads: true });
  context.on('page', p => p.on('pageerror', error => errors.push(String(error))));
  await context.addInitScript(() => {
    if (typeof ServiceWorkerRegistration === 'undefined') return;
    window.__checks = []; const update = ServiceWorkerRegistration.prototype.update;
    ServiceWorkerRegistration.prototype.update = function (...args) {
      const entry = { start: Date.now() }; window.__checks.push(entry);
      return update.apply(this, args).finally(() => entry.end = Date.now());
    };
  });
  await context.setOffline(offline); page = context.pages()[0]; page.setDefaultTimeout(15000);
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(url); await expect(page.locator('.menu-more')).toBeEnabled();
}
try {
  await launched(); assert.equal(await build(page), releases[0].buildId);
  await start(page); await expect.poll(async () => (await rpc(page))?.ready, { timeout: 30000 }).toBe(true);
  await page.reload(); await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  const quickBefore = (await snapshot(page)).attempts.find(attempt => attempt.role === 'quick');
  old = page; page = await context.newPage(); await page.goto(url); await expect(page.locator('.menu-more')).toBeEnabled();
  host.state.root = roots[1]; await updateCheck(page);
  await expect.poll(async () => (await rpc(old))?.buildId, { timeout: 30000 }).toBe(releases[1].buildId);
  assert.equal(await build(old), releases[0].buildId, 'Legacy game was forcibly reloaded');
  await page.reload(); await expect(page.locator('.menu-more')).toBeEnabled(); assert.equal(await build(page), releases[1].buildId);
  mark('actual-46-upgrade-normal-refresh-with-another-game-open', { oldGameBuild: await build(old), refreshedBuild: await build(page) });

  await start(page, 'frontier');
  const before = await snapshot(page), frontier = before.attempts.find(attempt => attempt.role === 'frontier');
  const cell = Number(await page.locator('[data-clue=false]').first().getAttribute('data-cell'));
  await page.locator(`[data-cell="${cell}"]`).click(); await page.keyboard.press('1');
  await expect.poll(async () => (await snapshot(page)).attempts.find(attempt => attempt.id === frontier.id).entries[cell]).toBe(1);
  const idle = await context.newPage(); await idle.goto(url); await expect(idle.locator('.menu-more')).toBeEnabled();
  assert.equal(await build(idle), releases[1].buildId); await page.bringToFront();
  for (const target of [old, page, idle]) await expect.poll(() => target.evaluate(() => window.__checks.length > 0 && window.__checks.every(check => check.end)), { timeout: 10000 }).toBe(true);
  const checksBefore = await Promise.all([old, page, idle].map(target => target.evaluate(() => window.__checks)));
  const frozenSelection = (quickBefore.selection + 1) % 81;
  await old.locator(`[data-cell="${frozenSelection}"]`).click();
  const oldLifecycle = await context.newCDPSession(old);
  await oldLifecycle.send('Page.setWebLifecycleState', { state: 'frozen' });
  host.state.root = roots[2];
  // No manual check, focus, reconnect or new window: observe the app's real foreground timer.
  const discoveryStart = performance.now();
  await expect(page.locator('.dock .more .notes-mode')).toHaveText('Update', { timeout: 80000 });
  assert.equal(await build(page), releases[1].buildId, 'Playing page auto-reloaded');
  assert.equal((await rpc(page, 2)).activeBuild, releases[2].buildId);
  await expect.poll(() => build(idle), { timeout: 20000 }).toBe(releases[2].buildId);
  await expect(idle.locator('.menu-more')).toBeEnabled();
  await idle.close();
  await oldLifecycle.send('Page.setWebLifecycleState', { state: 'active' });
  mark('automatic-discovery-during-unfinished-game', { discoveryMs: performance.now() - discoveryStart, playingBuild: await build(page), activeBuild: releases[2].buildId, checksBefore, checksAfter: await Promise.all([old, page].map(target => target.evaluate(() => window.__checks))) });
  mark('idle-main-menu-adopts-without-interrupting-other-games');
  mark('frozen-older-game-does-not-block-compatible-activation');

  await context.setOffline(true);
  // .46 has never opened Hint. Its old lazy dialog/module-worker must survive two takeovers offline.
  await old.bringToFront(); await more(old); await old.getByRole('button', { name: 'Hint', exact: true }).click();
  await old.getByRole('button', { name: 'Find a logical hint', exact: true }).click();
  await expect(old.getByText('Hint ready.', { exact: true })).toBeVisible();
  assert.equal(await build(old), releases[0].buildId);
  mark('legacy-late-first-use-hint-offline-after-B-and-C');
  await page.bringToFront();
  await page.evaluate(() => {
    window.__holdSave = true; window.__heldSave = false; const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      const request = put.apply(this, args);
      if (this.name === 'attempts' && window.__holdSave) {
        window.__heldSave = true; const store = this;
        function keepAlive() { const pending = store.get(args[0].id); pending.onsuccess = () => { if (window.__holdSave) keepAlive(); }; }
        keepAlive();
      }
      return request;
    };
  });
  await page.locator(`[data-cell="${cell}"]`).click(); await page.keyboard.press('2');
  await expect.poll(() => page.evaluate(() => window.__heldSave)).toBe(true);
  await more(page); await page.getByRole('button', { name: 'Update', exact: true }).click();
  await page.waitForTimeout(250);
  assert.equal(await build(page), releases[1].buildId, 'Update navigated before transaction acknowledgement');
  await expect(page.locator('div.scene')).toHaveCSS('filter', 'blur(12px)');
  await page.evaluate(() => { window.__holdSave = false; });
  await expect.poll(() => build(page), { timeout: 20000 }).toBe(releases[2].buildId);
  await expect(page.locator('.menu-more')).toBeEnabled();
  const after = await snapshot(page), saved = after.attempts.find(attempt => attempt.id === frontier.id);
  assert.equal(saved.entries[cell], 2); assert.deepEqual(after.profile, before.profile);
  assert.equal(after.attempts.find(attempt => attempt.role === 'quick').id, quickBefore.id);
  assert.equal(await build(old), releases[0].buildId);
  mark('one-page-update-waits-for-held-real-save-offline', { savedEntry: saved.entries[cell], oldWindowPreserved: true, walletPreserved: true });

  await context.close(); context = undefined; await launched(true);
  assert.equal(await build(page), releases[2].buildId);
  await page.getByRole('button', { name: 'Progression', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator(`[data-cell="${cell}"]`)).toHaveAttribute('aria-label', /2/);
  assert.equal((await snapshot(page)).attempts.find(attempt => attempt.id === frontier.id).entries[cell], 2);
  mark('browser-process-cold-offline-resume-after-update');
  await page.evaluate(async () => {
    const db = await new Promise((done, fail) => { const request = indexedDB.open('toadoku:pwa:compat:2:' + encodeURIComponent('/toadoku/')); request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error); });
    window.__holdPin = true; window.__pinLock = false;
    const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state');
    function keepAlive() { const request = store.get('compatibility'); request.onsuccess = () => { window.__pinLock = true; if (window.__holdPin) keepAlive(); }; }
    keepAlive(); tx.oncomplete = () => db.close();
  });
  await expect.poll(() => page.evaluate(() => window.__pinLock)).toBe(true);
  const next = await context.newPage(); let delivered = false;
  const navigation = next.goto(url).then(() => { delivered = true; });
  await page.waitForTimeout(250); assert.equal(delivered, false, 'HTML was delivered before its navigation pin could commit');
  await page.evaluate(() => { window.__holdPin = false; });
  await navigation; await expect(next.locator('.menu-more')).toBeEnabled(); assert.equal(await build(next), releases[2].buildId);
  await next.close(); mark('navigation-waits-for-real-compatibility-transaction');
  assert.deepEqual(errors, []);
} catch (error) { process.exitCode = 1; mark('failure', { error: String(error), stack: error.stack }); }
finally { await context?.close(); await host.close(); await writeFile(resolve(dir, 'results.json'), JSON.stringify({ events, errors, releases: releases.map(({ version, buildId }) => ({ version, buildId })), requests: host.state.requests }, null, 2)); console.log('Evidence: ' + dir); }
