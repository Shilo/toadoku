import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const [currentText, targetText, finalText, legacyText] = process.argv.slice(2);
assert(currentText && targetText && finalText && legacyText);
const roots = [currentText, targetText, finalText, legacyText].map(path => resolve(path));
const releases = await Promise.all(roots.map(async root => JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'))));
const dir = resolve('prototypes/pwa-validation/update-failures-' + Date.now()); await mkdir(dir, { recursive: true });
const host = await staticHost({ root: roots[0], port: 0 }); host.state.catalogRoot = resolve('public');
const url = host.origin + '/toadoku/', events = [], errors = [];
const prefix = 'toadoku:pwa:1:' + encodeURIComponent('/toadoku/') + ':';
const legacyOnly = process.argv.includes('--legacy-only');
let context, page, releaseHeld = () => {};
const mark = (name, details = {}) => { events.push({ name, ...details }); console.log(JSON.stringify(events.at(-1))); };
const build = () => page.locator('meta[name="toadoku-build"]').getAttribute('content');
async function rpc(protocol = 2, data = {}, targetPage = page) {
  return targetPage.evaluate(({ protocol, data }) => new Promise(async (done, fail) => {
    const worker = (await navigator.serviceWorker.getRegistration())?.active; if (!worker) return done(null);
    const channel = new MessageChannel(), timer = setTimeout(() => fail(Error('RPC timeout')), 15000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); done(event.data); };
    worker.postMessage({ type: 'TOADOKU_SHELL_VERIFY', protocol, ...data }, [channel.port2]);
  }), { protocol, data });
}
async function check() { await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration()).update(); }); }
async function launch(profile) {
  context = await chromium.launchPersistentContext(resolve(dir, profile), { headless: true, viewport: { width: 360, height: 800 } });
  page = context.pages()[0]; page.on('pageerror', error => errors.push(String(error))); page.setDefaultTimeout(15000);
  await page.goto(url); await expect(page.locator('.menu-more')).toBeEnabled();
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  await expect.poll(async () => (await rpc(1))?.ready, { timeout: 30000 }).toBe(true);
}
try {
  if (!legacyOnly) {
  await launch('current');
  assert(await page.evaluate(() => !!navigator.serviceWorker.controller));
  mark('first-setup-controls-page-without-reopening');
  await page.evaluate(async name => { const cache = await caches.open(name); for (const key of await cache.keys()) if (new URL(key.url).pathname.endsWith('/index.html')) await cache.delete(key); }, prefix + releases[0].buildId);
  await page.reload(); await expect(page.locator('.menu-more')).toBeEnabled(); assert.equal(await build(), releases[0].buildId);
  assert.equal((await rpc()).ready, true); mark('verified-current-html-repaired-online');
  const hint = releases[0].files.find(file => /hint.worker-.*\.js$/.test(file.path));
  await page.evaluate(async ({ name, path }) => { const cache = await caches.open(name); for (const key of await cache.keys()) if (new URL(key.url).pathname.endsWith('/' + path)) await cache.delete(key); }, { name: prefix + releases[0].buildId, path: hint.path });
  const fetched = await page.evaluate(async path => { const response = await fetch(path); const bytes = await response.arrayBuffer(); return { status: response.status, hash: [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('') }; }, hint.path);
  assert.equal(fetched.status, 200); assert.equal(fetched.hash, hint.sha256); assert.equal((await rpc()).ready, true);
  mark('known-worker-cache-miss-repaired-with-expected-bytes');
  host.state.fixtures['/toadoku/probe.html'] = { body: '<!doctype html><title>Unknown document probe</title>', mime: 'text/html' };
  const probe = await context.newPage(); await probe.goto(url + 'probe.html');
  const unknown = await rpc(2, { type: 'TOADOKU_PAGE_CONNECT', buildId: 'd'.repeat(64), documentId: 'unknown-probe' }, probe);
  assert.equal(unknown.ready, false); assert.equal(unknown.pinned, false); assert.equal(unknown.activeReady, true);
  host.state.fixtures['/toadoku/licenses/Workbox-MIT.txt'] = { body: 'network-probe', mime: 'text/plain' };
  assert.equal(await probe.evaluate(async () => (await fetch('licenses/Workbox-MIT.txt?probe')).text()), 'network-probe');
  delete host.state.fixtures['/toadoku/licenses/Workbox-MIT.txt'];
  await probe.close(); delete host.state.fixtures['/toadoku/probe.html'];
  mark('unknown-document-never-receives-arbitrary-mutable-cache');

  const unique = releases[1].files.find(file => /GameDialog-.*\.js$/.test(file.path) && !releases[0].files.some(old => old.path === file.path)); assert(unique);
  host.state.root = roots[1]; let corrupted = false;
  host.state.fault = path => { if (path.endsWith('/' + unique.path)) { corrupted = true; return { bytes: Buffer.from('corrupt deployment') }; } };
  await check(); await expect.poll(() => corrupted).toBe(true);
  await expect.poll(() => page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).installing)).toBe(false);
  assert.equal((await rpc()).activeBuild, releases[0].buildId); assert.equal((await rpc()).ready, true);
  mark('mixed-host-integrity-failure-retains-current-complete-app');
  let held = false; const gate = new Promise(done => releaseHeld = done);
  host.state.fault = path => { if (path.endsWith('/' + unique.path)) { held = true; return { wait: gate }; } };
  await check(); await expect.poll(() => held).toBe(true);
  host.state.root = roots[2]; const queued = check(); releaseHeld(); host.state.fault = undefined; await queued;
  await expect.poll(async () => (await rpc()).activeBuild, { timeout: 30000 }).toBe(releases[2].buildId);
  assert.equal(await build(), releases[0].buildId); mark('rapid-replacement-while-earlier-download-is-held');

  const names = ['e', 'f'].map(letter => prefix + letter.repeat(64));
  await page.evaluate(async names => {
    for (const name of names) await (await caches.open(name)).put(new URL('assets/capacity-probe.js', location.href), new Response(new Uint8Array(4 * 1024 * 1024), { headers: { 'Content-Type': 'text/javascript' } }));
    const db = await new Promise(done => { const request = indexedDB.open('toadoku:pwa:compat:2:' + encodeURIComponent('/toadoku/')); request.onsuccess = () => done(request.result); });
    await new Promise((done, fail) => { const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state'), request = store.get('compatibility'); request.onsuccess = () => { const state = request.result; for (const name of names) state.overflow[name] = Date.now(); store.put(state, 'compatibility'); }; tx.oncomplete = done; tx.onabort = () => fail(tx.error); }); db.close();
  }, names);
  host.state.root = roots[1]; await check();
  await expect.poll(async () => (await rpc()).capacityDeferred, { timeout: 20000 }).toBe(true);
  assert.equal((await rpc()).activeBuild, releases[2].buildId); assert.equal(await build(), releases[0].buildId);
  mark('protected-capacity-defers-update-without-removing-live-apps', { injectedActualBytes: 8 * 1024 * 1024, conservativeReservedBytes: 16 * 1024 * 1024 });
  await page.evaluate(async names => {
    for (const name of names) await caches.delete(name);
    const db = await new Promise(done => { const request = indexedDB.open('toadoku:pwa:compat:2:' + encodeURIComponent('/toadoku/')); request.onsuccess = () => done(request.result); });
    await new Promise((done, fail) => { const tx = db.transaction('state', 'readwrite'), store = tx.objectStore('state'), request = store.get('compatibility'); request.onsuccess = () => { const state = request.result; for (const name of names) delete state.overflow[name]; store.put(state, 'compatibility'); }; tx.oncomplete = done; tx.onabort = () => fail(tx.error); }); db.close();
  }, names);
  await expect.poll(async () => (await rpc()).activeBuild, { timeout: 80000, intervals: [1000, 2000] }).toBe(releases[1].buildId);
  mark('capacity-retries-automatically-after-space-is-released');
  await context.close(); context = undefined;
  }

  if (!process.argv.includes('--current-only')) {
  host.state.root = roots[3]; await launch('damaged-legacy');
  await page.evaluate(async name => { const cache = await caches.open(name); for (const key of await cache.keys()) if (new URL(key.url).pathname.endsWith('/index.html')) await cache.delete(key); }, prefix + releases[3].buildId);
  host.state.root = roots[1]; await check();
  await expect.poll(async () => (await rpc(1))?.buildId, { timeout: 30000 }).toBe(releases[1].buildId);
  assert.equal(await build(), releases[3].buildId); await expect(page.locator('.cell')).toHaveCount(81);
  await page.reload(); await expect(page.locator('.menu-more')).toBeEnabled(); assert.equal(await build(), releases[1].buildId);
  mark('damaged-legacy-cache-does-not-trap-healthy-new-release');
  }
  assert.deepEqual(errors, []);
} catch (error) { process.exitCode = 1; mark('failure', { error: String(error), stack: error.stack }); }
finally { releaseHeld(); await context?.close(); await host.close(); await writeFile(resolve(dir, 'results.json'), JSON.stringify({ events, errors, requests: host.state.requests }, null, 2)); console.log('Evidence: ' + dir); }
