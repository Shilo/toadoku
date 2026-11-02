import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { staticHost } from './server.mjs';
process.env.PLAYWRIGHT_BROWSERS_PATH = resolve('prototypes/production-ui-evidence/browsers');
const { chromium, expect } = await import('@playwright/test');
const root = resolve(process.argv[2] ?? 'dist');
const release = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8'));
const directory = resolve('prototypes/pwa-validation/metadata-recovery-' + Date.now()); await mkdir(directory, { recursive: true });
const host = await staticHost({ root, port: 0 }); host.state.catalogRoot = resolve('public');
const url = host.origin + '/toadoku/', prefix = 'toadoku:pwa:1:' + encodeURIComponent('/toadoku/') + ':';
const databaseName = 'toadoku:pwa:compat:2:' + encodeURIComponent('/toadoku/');
const ownName = prefix + release.buildId, unknownName = prefix + 'd'.repeat(64);
const events = [], errors = []; let context, page;
const mark = (name, details = {}) => { const value = { name, ...details }; events.push(value); console.log(JSON.stringify(value)); };
async function rpc(data = {}, target = page) {
  return target.evaluate(data => new Promise(async (done, fail) => {
    const worker = (await navigator.serviceWorker.getRegistration())?.active; if (!worker) return done(null);
    const channel = new MessageChannel(), timer = setTimeout(() => fail(Error('RPC timeout')), 15000);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); done(event.data); };
    worker.postMessage({ protocol: 2, type: 'TOADOKU_SHELL_VERIFY', ...data }, [channel.port2]);
  }), data);
}
async function metadata(kind = 'read') {
  return page.evaluate(async ({ name, kind, ownName }) => {
    if (kind === 'delete-database') return new Promise((done, fail) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = done; request.onerror = () => fail(request.error); });
    const database = await new Promise((done, fail) => { const request = indexedDB.open(name, kind === 'unavailable' ? 2 : undefined); request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error); });
    try {
      if (kind === 'unavailable') return database.version;
      return await new Promise((done, fail) => {
        const transaction = database.transaction('state', kind === 'read' ? 'readonly' : 'readwrite'), store = transaction.objectStore('state');
        const request = store.get('compatibility'); let value;
        request.onsuccess = () => {
          value = request.result;
          if (kind === 'missing-record') store.delete('compatibility');
          if (kind === 'malformed') store.put({ protocol: 2, broken: true }, 'compatibility');
          if (kind === 'empty') store.put({ protocol: 2, seeded: false, snapshots: {}, leases: {}, overflow: {}, capacityDeferred: false }, 'compatibility');
          if (kind === 'wrong-root') { value.snapshots[ownName].inventoryHash = '0'.repeat(64); store.put(value, 'compatibility'); }
        };
        transaction.oncomplete = () => done(value); transaction.onabort = () => fail(transaction.error);
      });
    } finally { database.close(); }
  }, { name: databaseName, kind, ownName });
}
async function snapshot() {
  return page.evaluate(async () => {
    const database = await new Promise((done, fail) => { const request = indexedDB.open('toadodu:' + encodeURIComponent('/toadoku/')); request.onsuccess = () => done(request.result); request.onerror = () => fail(request.error); });
    try { return await new Promise((done, fail) => {
      const transaction = database.transaction(['attempts', 'profile'], 'readonly'), value = {};
      for (const key of ['attempts', 'profile']) { const request = transaction.objectStore(key).getAll(); request.onsuccess = () => value[key] = request.result; }
      transaction.oncomplete = () => done(value); transaction.onabort = () => fail(transaction.error);
    }); } finally { database.close(); }
  });
}
async function menu() { await page.reload(); await expect(page.locator('.menu-more')).toBeEnabled(); }
try {
  context = await chromium.launchPersistentContext(resolve(directory, 'profile'), { headless: true, viewport: { width: 360, height: 800 } });
  page = context.pages()[0]; page.on('pageerror', error => errors.push(String(error))); page.setDefaultTimeout(15000);
  await page.goto(url); await expect(page.locator('.menu-more')).toBeEnabled();
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Easy', exact: true }).click();
  await expect(page.locator('.cell')).toHaveCount(81);
  const cell = Number(await page.locator('[data-clue=false]').first().getAttribute('data-cell'));
  await page.locator(`[data-cell="${cell}"]`).click(); await page.keyboard.press('4');
  await expect.poll(async () => (await snapshot()).attempts.find(value => value.role === 'quick')?.entries[cell]).toBe(4);
  await expect.poll(async () => (await rpc())?.ready, { timeout: 30000 }).toBe(true);
  const saved = await snapshot(), attempt = saved.attempts.find(value => value.role === 'quick');
  await page.evaluate(async name => { await (await caches.open(name)).put(new URL('assets/untrusted-probe.js', location.href), new Response('untrusted', { headers: { 'Content-Type': 'text/javascript' } })); }, unknownName);
  for (const kind of ['delete-database', 'missing-record', 'empty', 'malformed', 'wrong-root']) {
    await metadata(kind); await menu();
    assert.equal(await page.locator('meta[name="toadoku-build"]').getAttribute('content'), release.buildId);
    assert.equal((await rpc()).ready, true);
    const restored = await metadata();
    assert.equal(restored.snapshots[ownName].state, 'ready'); assert.notEqual(restored.snapshots[ownName].inventoryHash, '0'.repeat(64));
    assert.equal(restored.snapshots[unknownName], undefined); assert(Number.isSafeInteger(restored.overflow[unknownName]));
    assert(await page.evaluate(name => caches.has(name), unknownName));
    const current = await snapshot(); assert.equal(current.attempts.find(value => value.id === attempt.id).entries[cell], 4); assert.deepEqual(current.profile, saved.profile);
    mark('ordinary-navigation-recovers-' + kind, { oldCacheRetainedWithoutAuthentication: true, gamePreserved: true });
  }
  // A real App bridge can legitimately reconnect its own identity during startup.
  // This controlled document has no bridge, so its unknown identity remains isolated.
  host.state.fixtures['/toadoku/probe.html'] = { body: '<!doctype html><title>Metadata identity probe</title>', mime: 'text/html' };
  const probe = await context.newPage(); await probe.goto(url + 'probe.html');
  assert(await probe.evaluate(() => !!navigator.serviceWorker.controller));
  const unknown = await rpc({ type: 'TOADOKU_PAGE_CONNECT', buildId: 'd'.repeat(64), documentId: 'unknown-recovery-document' }, probe);
  assert.equal(unknown.ready, false); assert.equal(unknown.pinned, false);
  const unknownBefore = Object.values((await metadata()).leases).find(value => value.documentId === 'unknown-recovery-document');
  assert(unknownBefore); assert.equal(unknownBefore.primary, undefined); assert.equal(unknownBefore.buildId, 'd'.repeat(64));
  host.state.fixtures['/toadoku/licenses/Workbox-MIT.txt'] = { body: 'network-only-recovery-probe', mime: 'text/plain' };
  assert.equal(await probe.evaluate(async () => (await fetch('licenses/Workbox-MIT.txt?recovery')).text()), 'network-only-recovery-probe');
  const unknownAfter = Object.values((await metadata()).leases).find(value => value.documentId === 'unknown-recovery-document');
  assert.equal(unknownAfter.primary, undefined); assert.equal(unknownAfter.buildId, 'd'.repeat(64));
  delete host.state.fixtures['/toadoku/licenses/Workbox-MIT.txt'];
  await probe.close(); delete host.state.fixtures['/toadoku/probe.html'];
  assert.equal((await rpc()).ready, true);
  mark('unknown-old-document-gets-no-invented-current-mutable-primary', { isolatedProbe: true, identityStableBeforeAndAfterFetch: true });
  const hint = release.files.find(file => /hint.worker-.*\.js$/.test(file.path)); assert(hint);
  await page.evaluate(async ({ name, path }) => { const cache = await caches.open(name); for (const key of await cache.keys()) if (new URL(key.url).pathname.endsWith('/' + path)) await cache.delete(key); }, { name: ownName, path: hint.path });
  host.state.fault = path => path.endsWith('/' + hint.path) ? { bytes: Buffer.from('unverified-javascript') } : undefined;
  assert.equal(await page.evaluate(async path => (await fetch(path)).status, hint.path), 503);
  host.state.fault = undefined;
  assert.equal(await page.evaluate(async path => (await fetch(path)).status, hint.path), 200);
  mark('known-resource-integrity-failure-does-not-become-network-degradation');
  assert.equal(await metadata('unavailable'), 2);
  const start = performance.now(); await menu();
  const degraded = await rpc(); assert.equal(degraded.metadataUnavailable, true); assert.equal(degraded.ready, false); assert.equal(degraded.activeReady, false);
  await page.getByRole('button', { name: 'Quick Play', exact: true }).click(); await page.getByRole('button', { name: 'Resume', exact: true }).click(); await expect(page.locator('.cell')).toHaveCount(81);
  assert.equal((await snapshot()).attempts.find(value => value.id === attempt.id).entries[cell], 4);
  assert.deepEqual((await snapshot()).profile, saved.profile);
  mark('unavailable-compatibility-database-keeps-online-play-usable', { elapsedMs: performance.now() - start, readiness: degraded.ready });
  assert.deepEqual(errors, []);
} catch (error) { process.exitCode = 1; mark('failure', { error: String(error), stack: error.stack }); }
finally { await context?.close(); await host.close(); await writeFile(resolve(directory, 'results.json'), JSON.stringify({ events, errors, requests: host.state.requests }, null, 2)); console.log('Evidence: ' + directory); }
