/// <reference lib="webworker" />
import { acceptableShellMime, normalizePrecache, orphanShellCaches, ownedShellCache } from './policy';
import { PrecacheController } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;
const scope = self.registration.scope;
const manifest = normalizePrecache(self.__WB_MANIFEST as PrecacheEntry[], scope);
const prefix = `toadoku:pwa:1:${encodeURIComponent(new URL(scope).pathname)}:`;
const releaseRevision = manifest.find(entry => entry.url === 'release.json')?.revision;
if (!releaseRevision) throw new Error('Missing release inventory');
const cacheName = `${prefix}${releaseRevision}`;
const MAX_SHELL = 8 * 1024 * 1024, MAX_ALL = 24 * 1024 * 1024, MAX_FILE = 4 * 1024 * 1024;
const precache = new PrecacheController({ cacheName, plugins: [{
  async cacheWillUpdate({ response, request }) {
    if (response.status !== 200 || response.redirected || !acceptableMime(request.url, response.headers.get('content-type') ?? '')) return null;
    return response;
  },
}] });
precache.addToCacheList(manifest);
const expected = precache.getURLsToCacheKeys();
const byURL = new Map(manifest.map(entry => [new URL(entry.url, scope).href, entry]));
const acceptableMime = acceptableShellMime;
async function verified(response: Response | undefined, entry: PrecacheEntry): Promise<boolean> {
  if (!response || response.status !== 200 || response.redirected || !acceptableMime(new URL(entry.url, scope).href, response.headers.get('content-type') ?? '')) return false;
  const blob = await response.clone().blob();
  if (blob.size > MAX_FILE) return false;
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
  return entry.integrity === `sha256-${btoa(String.fromCharCode(...hash))}`;
}
async function readback(): Promise<{ ready: boolean; buildId?: string; bytes?: number }> {
  const cache = await caches.open(cacheName);
  let total = 0;
  for (const [url, key] of expected) {
    const response = await cache.match(key);
    if (!await verified(response, byURL.get(url)!)) return { ready: false, buildId: releaseRevision! };
    total += (await response!.clone().blob()).size;
    if (total > MAX_SHELL) return { ready: false, buildId: releaseRevision! };
  }
  const release = await cache.match(precache.getCacheKeyForURL(new URL('release.json', scope).href)!);
  const data = await release!.json() as { protocol?: number; buildId?: string };
  return data.protocol === 1 && data.buildId === releaseRevision ? { ready: true, buildId: data.buildId, bytes: total } : { ready: false, buildId: releaseRevision! };
}
function identity(worker: ServiceWorker): Promise<string> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Worker identity unavailable; keep existing caches')); }, 3000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      const name: unknown = event.data?.cacheName;
      if (typeof name === 'string' && ownedShellCache(name, prefix)) resolve(name); else reject(new Error('Unknown worker cache protocol'));
    };
    worker.postMessage({ type: 'TOADOKU_SHELL_IDENTITY', protocol: 1 }, [channel.port2]);
  });
}
async function stage(): Promise<void> {
  // Snapshot first. No cache created by a later registration job is a deletion candidate.
  const names = (await caches.keys()).filter(name => ownedShellCache(name, prefix));
  const active = self.registration.active, waiting = self.registration.waiting, installing = self.registration.installing;
  const protectedNames = new Set([cacheName]);
  for (const worker of [active, waiting]) if (worker) protectedNames.add(await identity(worker));
  if (active !== self.registration.active || waiting !== self.registration.waiting || installing !== self.registration.installing) throw new Error('Registration changed during cache planning');
  for (const name of orphanShellCaches(names, protectedNames, prefix)) await caches.delete(name);
  let retained = 0;
  for (const name of names.filter(name => protectedNames.has(name) && name !== cacheName)) {
    const cache = await caches.open(name), keys = await cache.keys();
    if (keys.length > 256) throw new Error('Shell cache inventory exceeds budget');
    for (const key of keys) {
      const response = await cache.match(key); retained += response ? (await response.blob()).size : 0;
      if (retained > MAX_ALL - MAX_SHELL) throw new Error('Shell storage limit; close other Toadoku windows and retry');
    }
  }
  const target = await caches.open(cacheName);
  // Reuse only bytes whose actual SHA-256 matches this release, including mutable public paths.
  for (const [url, key] of expected) {
    const entry = byURL.get(url)!;
    if (await verified(await target.match(key), entry)) continue;
    await target.delete(key);
    for (const name of protectedNames) {
      if (name === cacheName) continue;
      const old = await caches.open(name);
      const response = await old.match(url, { ignoreSearch: true });
      if (await verified(response, entry)) { await target.put(key, response!); break; }
    }
  }
}
let repairing: Promise<{ ready: boolean; buildId?: string; bytes?: number }> | undefined;
async function repair() {
  if (repairing) return repairing;
  repairing = (async () => {
    const cache = await caches.open(cacheName); let spent = 0;
    for (const [url, key] of expected) {
      const entry = byURL.get(url)!;
      if (await verified(await cache.match(key), entry)) continue;
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(new Request(url, { integrity: entry.integrity, cache: 'reload', redirect: 'error', signal: controller.signal }));
        if (!response.ok || !response.body || !acceptableMime(url, response.headers.get('content-type') ?? '')) throw new Error('Repair response rejected');
        const reader = response.body.getReader(), parts: Uint8Array[] = []; let size = 0;
        try { while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; spent += part.value.byteLength; if (size > MAX_FILE || spent > MAX_SHELL) { await reader.cancel(); throw new Error('Repair download exceeds budget'); } parts.push(part.value); } } finally { reader.releaseLock(); }
        const body = new Uint8Array(size); let offset = 0; for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
        const complete = new Response(body, { status: response.status, headers: response.headers });
        if (!await verified(complete, entry)) throw new Error('Repair integrity mismatch');
        await cache.put(key, complete);
      } finally { clearTimeout(timer); }
    }
    return readback();
  })().finally(() => { repairing = undefined; });
  return repairing;
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await stage();
    await precache.install(event);
    if (!(await readback()).ready) throw new Error('Offline shell readback failed');
  })());
});
// Default waiting is intentional. Never activate globally from a page or reload clients.
self.addEventListener('activate', event => { event.waitUntil(precache.activate(event)); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url), base = new URL(scope);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  const index = new URL('index.html', scope).href;
  const navigation = event.request.mode === 'navigate' && (url.pathname === base.pathname || url.pathname === new URL(index).pathname);
  const canonical = navigation ? index : `${url.origin}${url.pathname}`;
  const key = expected.get(canonical), entry = byURL.get(canonical);
  if (!key || !entry) return;
  event.respondWith(precache.strategy.handle({ event, request: new Request(canonical, { credentials: 'same-origin' }), params: { cacheKey: key, integrity: entry.integrity } }));
});
self.addEventListener('message', event => {
  if (event.data?.protocol !== 1 || !event.ports[0]) return;
  if (event.data.type === 'TOADOKU_SHELL_IDENTITY') { event.ports[0].postMessage({ protocol: 1, cacheName, buildId: releaseRevision }); return; }
  if (event.data.type === 'TOADOKU_SHELL_REPAIR' && event.data.buildId === releaseRevision) event.waitUntil(repair().then(result => event.ports[0].postMessage({ protocol: 1, cacheName, ...result })).catch(() => event.ports[0].postMessage({ protocol: 1, cacheName, ready: false, buildId: releaseRevision })));
  if (event.data.type === 'TOADOKU_SHELL_VERIFY') event.waitUntil(readback().then(result => event.ports[0].postMessage({ protocol: 1, cacheName, ...result })).catch(() => event.ports[0].postMessage({ protocol: 1, cacheName, ready: false, buildId: releaseRevision })));
});
