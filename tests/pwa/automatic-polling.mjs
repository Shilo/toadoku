import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const [aText, bText] = process.argv.slice(2), target = JSON.parse(await readFile(resolve(bText, 'release.json'), 'utf8'));
const dir = resolve('prototypes/pwa-validation/automatic-polling-' + Date.now()); await mkdir(dir, { recursive: true });
const host = await staticHost({ root: aText, port: 0 });
const context = await chromium.launchPersistentContext(resolve(dir, 'profile'), { headless: true, viewport: { width: 360, height: 800 } });
const page = context.pages()[0], errors = [];
await context.addInitScript(() => {
  if (typeof ServiceWorkerRegistration === 'undefined') return;
  window.__checks = []; const original = ServiceWorkerRegistration.prototype.update;
  ServiceWorkerRegistration.prototype.update = function (...args) { const call = { start: Date.now() }; window.__checks.push(call); return original.apply(this, args).finally(() => call.end = Date.now()); };
});
let result;
try {
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(host.origin + '/toadoku/'); await expect(page.locator('.menu-more')).toBeEnabled();
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await expect.poll(() => page.evaluate(() => window.__checks.length > 0 && window.__checks.every(call => call.end)), { timeout: 30000 }).toBe(true);
  const oldBuild = await page.locator('meta[name="toadoku-build"]').getAttribute('content'), before = await page.evaluate(() => window.__checks);
  host.state.root = resolve(bText); const started = performance.now();
  // One settled window. No manual update/focus/reconnect/new-page actions after publication.
  await expect(page.locator('.dock .more .notes-mode')).toHaveText('Update', { timeout: 80000 });
  const discoveredMs = performance.now() - started;
  await expect.poll(() => page.evaluate(() => window.__checks.length), { timeout: 80000 }).toBeGreaterThan(before.length);
  const after = await page.evaluate(() => window.__checks), gap = after[before.length].start - before.at(-1).start;
  assert(gap >= 60000); assert.equal(await page.locator('meta[name="toadoku-build"]').getAttribute('content'), oldBuild);
  assert.deepEqual(errors, []); result = { passed: true, discoveredMs, automaticCallGapMs: gap, before, after, target: target.buildId, conditions: 'One visible desktop Chromium game, actual app registration.update calls; no guaranteed deadline on sleeping/mobile/offline clients.' };
} catch (error) { result = { passed: false, error: String(error), stack: error.stack }; process.exitCode = 1; }
finally { await context.close(); await host.close(); await writeFile(resolve(dir, 'results.json'), JSON.stringify({ ...result, errors, requests: host.state.requests }, null, 2)); console.log(JSON.stringify({ dir, ...result })); }
