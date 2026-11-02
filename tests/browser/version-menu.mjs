import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from '../pwa/server.mjs';
import { uiCopy } from '../../src/lib/gameplay/ui/copy.ts';
import { dictionaries } from '../../src/lib/i18n.ts';

process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root = resolve(process.argv[2] ?? 'dist'), dir = resolve('prototypes/pwa-validation/version-menu-' + Date.now());
await mkdir(dir, { recursive: true });
const release = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
const host = await staticHost({ root, port: 0 }), context = await chromium.launchPersistentContext(resolve(dir, 'profile'), { headless: true, viewport: { width: 360, height: 800 } });
const page = context.pages()[0], events = [], errors = []; let locale = 'en';
page.setDefaultTimeout(12000); page.on('pageerror', error => errors.push(String(error)));
// Only the external destination is stubbed; app, history, storage and service worker remain native.
await context.route('https://github.com/Shilo/toadoku', route => route.fulfill({ contentType: 'text/html', body: '<title>Source destination fixture</title>' }));
async function closeAll() {
  for (let i = 0; i < 10 && await page.getByRole('dialog').count(); i++) {
    const id = await page.evaluate(() => history.state?.overlay);
    await page.getByRole('dialog').getByRole('button', { name: /^(Close|Schließen|Cerrar)$/ }).click();
    await expect.poll(() => page.evaluate(() => history.state?.overlay)).not.toBe(id);
  }
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function more() {
  await closeAll(); await page.locator(await page.locator('.dock').count() ? '.dock .more' : '.menu-more').click();
  await expect(page.locator('#game-dialog-title')).toHaveText(await page.locator('.dock').count() ? uiCopy[locale].game : uiCopy[locale].menu);
}
async function settings() {
  await more(); await page.getByRole('button', { name: uiCopy[locale].settings, exact: true }).click();
  await expect(page.getByRole('combobox', { name: uiCopy[locale].language, exact: true })).toBeVisible();
}
async function sourceLink() {
  const link = page.getByRole('dialog').locator('.version-link');
  await expect(link).toHaveText(`${uiCopy[locale].version} ${release.version}`);
  await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(1);
  assert.equal(await link.getAttribute('href'), 'https://github.com/Shilo/toadoku');
  assert.match(await link.getAttribute('aria-label'), /GitHub/);
  return link;
}
async function openSource(link) {
  const next = context.waitForEvent('page'); await link.press('Enter'); const popup = await next;
  await popup.waitForLoadState('domcontentloaded'); assert.equal(popup.url(), 'https://github.com/Shilo/toadoku');
  assert(await popup.evaluate(() => window.opener === null)); await popup.close(); await page.bringToFront();
}
async function essential() {
  return page.evaluate(async () => {
    const db = await new Promise((done, fail) => { const r = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/')); r.onsuccess = () => done(r.result); r.onerror = () => fail(r.error); });
    try { return await new Promise((done, fail) => {
      const tx = db.transaction(['attempts', 'profile'], 'readonly'), result = {};
      for (const name of ['attempts', 'profile']) { const r = tx.objectStore(name).getAll(); r.onsuccess = () => result[name] = r.result; }
      tx.oncomplete = () => done({ profile: result.profile, attempts: result.attempts.map(({ id, entries, notes }) => ({ id, entries, notes })) }); tx.onabort = () => fail(tx.error);
    }); } finally { db.close(); }
  });
}
try {
  await page.goto(host.origin + '/toadoku/'); await expect(page.locator('.menu-more')).toBeEnabled();
  for (const nextLocale of ['en', 'de', 'es']) {
    await settings(); await page.getByRole('combobox', { name: uiCopy[locale].language, exact: true }).selectOption(nextLocale); locale = nextLocale; await closeAll();
    for (const [width, height] of [[360, 800], [800, 360]]) {
      await page.setViewportSize({ width, height });
      for (const mode of ['menu', 'quick', 'progression']) {
        if (mode !== 'menu') await page.getByRole('button', { name: dictionaries[locale][mode], exact: true }).click();
        await more(); const link = await sourceLink();
        await expect(page.locator('.more-groups')).toHaveCount(0); await expect(page.getByRole('separator')).toHaveCount(1);
        const bounds = await page.getByRole('dialog').boundingBox(), trigger = await page.locator('.menu-more').boundingBox();
        assert(bounds.width <= 281 && bounds.x >= 7 && bounds.y >= 7 && bounds.x + bounds.width <= width - 7);
        assert(bounds.y + bounds.height <= trigger.y - 7);
        if (locale === 'en' && width === 360 && mode === 'menu') {
          await expect(page.locator('#game-dialog-title')).toBeFocused();
          await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await expect(link).toBeFocused();
          await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
          await page.keyboard.press('Shift+Tab'); await expect(link).toBeFocused(); await openSource(link);
          await page.screenshot({ path: resolve(dir, 'main-more.png') });
        }
        await page.getByRole('button', { name: uiCopy[locale].settings, exact: true }).click();
        await page.getByRole('dialog').getByRole('button', { name: uiCopy[locale].back, exact: true }).click(); await sourceLink();
        await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('.menu-more')).toBeFocused();
        await more(); await page.goBack(); await expect(page.getByRole('dialog')).toHaveCount(0);
        await page.goForward(); await expect(page.getByRole('dialog')).toHaveCount(0);
        await more(); await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toHaveCount(0);
        if (mode !== 'menu') await page.locator('.menu-panel').getByRole('button', { name: dictionaries[locale].back, exact: true }).click();
        events.push({ locale, width, height, mode, anchored: true, historyAndFocus: true });
      }
    }
  }
  await settings(); await page.getByRole('combobox', { name: uiCopy[locale].language, exact: true }).selectOption('en'); locale = 'en'; await closeAll();
  await page.setViewportSize({ width: 360, height: 800 }); await page.getByRole('button', { name: 'Quick Play', exact: true }).click();
  await page.getByRole('button', { name: 'Easy', exact: true }).click(); await expect(page.locator('.cell')).toHaveCount(81);
  const blank = page.locator('[data-clue="false"]').first(), cell = Number(await blank.getAttribute('data-cell')); await blank.press('1');
  await expect.poll(async () => (await essential()).attempts[0]?.entries[cell]).toBe(1); const before = await essential();
  await more(); const link = await sourceLink(); await expect(page.getByRole('heading', { name: 'Tools', exact: true })).toBeVisible();
  await link.focus(); await page.keyboard.press('5'); assert.deepEqual(await essential(), before); await openSource(link); assert.deepEqual(await essential(), before);
  await page.screenshot({ path: resolve(dir, 'game-more.png') });
  await page.keyboard.press('Escape'); await expect(page.locator('.dock .more')).toBeFocused();
  // Cached code must still show its own version when no connection is available.
  await context.setOffline(true); await more(); await sourceLink(); assert.deepEqual(await essential(), before);
  assert.deepEqual(errors, []); events.push({ gameplay: true, keyboardInert: true, savedGamePreserved: true, offlineVersionVisible: true });
} catch (error) { events.push({ failed: true, error: String(error), stack: error.stack }); process.exitCode = 1; }
finally { await context.close(); await host.close(); await writeFile(resolve(dir, 'results.json'), JSON.stringify({ buildId: release.buildId, version: release.version, events, errors }, null, 2)); console.log(JSON.stringify({ evidence: dir, events })); }
