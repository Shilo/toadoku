import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const before = resolve(process.argv[2]), after = resolve(process.argv[3] ?? 'dist');
const evidence = resolve('prototypes/pwa-validation/version-workflow/browser-' + Date.now());
await mkdir(evidence, { recursive: true });
const profile = resolve(evidence, 'profile'), host = await staticHost({ root: before, port: 5203 });
const current = JSON.parse(await readFile(resolve(after, 'release.json'), 'utf8'));
const events = [], errors = []; let context, page;
async function open(offline = false) {
  context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 360, height: 800 } });
  await context.setOffline(offline); context.on('page', tab => tab.on('pageerror', error => errors.push(String(error))));
  page = context.pages()[0]; page.on('pageerror', error => errors.push(String(error))); page.setDefaultTimeout(15000);
  const response = await page.goto(host.origin + '/toadoku/');
  await expect(page.locator('.menu-more')).toBeEnabled(); return response;
}
async function closeDialogs() {
  for (let i = 0; i < 8 && await page.getByRole('dialog').count(); i++) {
    const title = await page.locator('#game-dialog-title').textContent();
    await page.getByRole('dialog').getByRole('button', { name: /^(Close|Schließen|Cerrar)$/ }).click();
    await page.waitForFunction(previous => document.querySelector('#game-dialog-title')?.textContent !== previous, title);
  }
}
async function settings() {
  await closeDialogs();
  if (await page.locator('.dock .more').count()) {
    await page.locator('.dock .more').click(); await page.getByRole('button', { name: /^(Settings|Einstellungen|Ajustes)$/ }).click();
  } else await page.locator('.menu-more').click();
}
async function panel() {
  await settings(); await page.getByRole('button', { name: /^(Install and offline|Installation und offline|Instalación y sin conexión)$/ }).click();
}
async function saved() {
  return page.evaluate(async () => {
    const db = await new Promise((done, fail) => { const r = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/')); r.onsuccess = () => done(r.result); r.onerror = () => fail(r.error); });
    try { return await new Promise((done, fail) => {
      const tx = db.transaction(['attempts', 'profile'], 'readonly'), values = {};
      for (const name of ['attempts', 'profile']) { const r = tx.objectStore(name).getAll(); r.onsuccess = () => values[name] = r.result; }
      tx.oncomplete = () => done({ profile: values.profile, attempts: values.attempts.map(({ id, entries, notes }) => ({ id, entries, notes })) }); tx.onabort = () => fail(tx.error);
    }); } finally { db.close(); }
  });
}
try {
  await open(); await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click(); await expect(page.locator('.cell')).toHaveCount(81);
  const blank = page.locator('[data-clue="false"]').first(), index = Number(await blank.getAttribute('data-cell')); await blank.press('1');
  await expect.poll(async () => (await saved()).attempts[0]?.entries[index]).toBe(1); const snapshot = await saved();
  await panel(); await page.getByRole('button', { name: 'Prepare offline play', exact: true }).click();
  await expect(page.getByText('Puzzle reserve verified.', { exact: true })).toBeVisible({ timeout: 60000 });
  await context.close(); context = undefined; await open();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toBe(host.origin + '/toadoku/worker.js');
  await panel();
  const oldBuild = await page.locator('meta[name="toadoku-build"]').getAttribute('content'); assert.notEqual(oldBuild, current.buildId);
  const other = await context.newPage(); await other.goto(host.origin + '/toadoku/');
  host.state.root = after;
  await page.getByText('Update options', { exact: true }).click();
  await page.getByRole('button', { name: 'Check for updates', exact: true }).click();
  await expect(page.getByText(/^Update downloaded\./)).toBeVisible({ timeout: 30000 });
  assert.equal(await page.locator('meta[name="toadoku-build"]').getAttribute('content'), oldBuild);
  assert.equal(await other.locator('meta[name="toadoku-build"]').getAttribute('content'), oldBuild);
  assert.deepEqual(await saved(), snapshot); events.push({ name: 'new-version-waits-for-two-old-windows', oldBuild, newBuild: current.buildId });
  await context.close(); context = undefined; host.state.offline = true;
  const response = await open(true); assert(response.fromServiceWorker());
  assert.equal(await page.locator('meta[name="toadoku-build"]').getAttribute('content'), current.buildId);
  assert.deepEqual(await saved(), snapshot);
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  for (const [locale, label] of [['en', 'Version'], ['de', 'Version'], ['es', 'Versión']]) {
    await settings(); await page.getByRole('combobox', { name: /^(Language|Sprache|Idioma)$/ }).selectOption(locale);
    await page.getByRole('button', { name: /^(Install and offline|Installation und offline|Instalación y sin conexión)$/ }).click();
    await page.locator('details').filter({ has: page.locator('.app-version') }).locator('summary').click();
    await expect(page.locator('.app-version')).toHaveText(`${label} ${current.version} · ${current.commit}`);
    const geometry = await page.getByRole('dialog').evaluate(dialog => ({ overflow: dialog.scrollWidth > dialog.clientWidth + 1, within: dialog.getBoundingClientRect().right <= innerWidth + 1 }));
    assert(!geometry.overflow && geometry.within); events.push({ name: 'cold-offline-version-visible', locale, ...geometry });
  }
  assert.deepEqual(await saved(), snapshot); assert.deepEqual(errors, []); events.push({ name: 'passed', version: current.version, commit: current.commit, browser: context.browser().version() });
} catch (error) { events.push({ name: 'failed', error: String(error), stack: error.stack }); process.exitCode = 1; }
finally { if (context) await context.close(); await host.close(); await writeFile(resolve(evidence, 'results.json'), JSON.stringify({ before, after, events, errors, requests: host.state.requests }, null, 2)); console.log(JSON.stringify({ evidence, events })); }
