/// <reference lib="webworker" />
import { acceptableShellMime, normalizePrecache, ownedShellCache } from './policy';
import { PrecacheController } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';
import { assertImmutableCompatibility, BUILD_ID, compactAbsent, connectPage, decodeInventory, emptyShellState, immutableShellPath, INVENTORY_LIMIT,
  markDeleting, pinSnapshot, reconstructedShellState, releasePage, renewObserved, seedLegacy, shellPath, SHELL_FILE_LIMIT, SHELL_LIMIT, SHELL_TOTAL_LIMIT, validDocumentId } from './worker-compat';
import type { ShellInventory, ShellSnapshot, ShellState } from './worker-compat';
import { ShellMetadataError, shellMetadata } from './worker-leases';

declare const self: ServiceWorkerGlobalScope;
const scope = self.registration.scope, base = new URL(scope);
const manifest = normalizePrecache(self.__WB_MANIFEST as PrecacheEntry[], scope);
const prefix = `toadoku:pwa:1:${encodeURIComponent(base.pathname)}:`;
const revision = manifest.find(entry => entry.url === 'release.json')?.revision;
if (!revision || !BUILD_ID.test(revision)) throw new Error('Missing release inventory');
const buildId: string = revision, cacheName = `${prefix}${buildId}`;
const metadata = shellMetadata(scope, prefix);
const precache = new PrecacheController({ cacheName, plugins: [{
  async cacheWillUpdate({ response, request }) {
    return response.status === 200 && !response.redirected && acceptableShellMime(request.url, response.headers.get('content-type') ?? '') ? response : null;
  },
}] });
precache.addToCacheList(manifest);
const expected = precache.getURLsToCacheKeys();
const byURL = new Map(manifest.map(entry => [new URL(entry.url, scope).href, entry]));
const sha = async (body: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', body))].map(value => value.toString(16).padStart(2, '0')).join('');
function inScope(url: string): boolean { const value = new URL(url); return value.origin === base.origin && value.pathname.startsWith(base.pathname); }
async function verified(response: Response | undefined, entry: { url: string; integrity?: string }): Promise<boolean> {
  if (!response || response.status !== 200 || response.redirected || !acceptableShellMime(new URL(entry.url, scope).href, response.headers.get('content-type') ?? '')) return false;
  const blob = await response.clone().blob();
  if (blob.size > SHELL_FILE_LIMIT) return false;
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()));
  return entry.integrity === `sha256-${btoa(String.fromCharCode(...hash))}`;
}
async function readback(): Promise<{ ready: boolean; buildId: string; bytes?: number }> {
  const cache = await caches.open(cacheName);
  let bytes = 0;
  for (const [url, key] of expected) {
    const response = await cache.match(key);
    if (!await verified(response, byURL.get(url)!)) return { ready: false, buildId };
    bytes += (await response!.clone().blob()).size;
    if (bytes > SHELL_LIMIT) return { ready: false, buildId };
  }
  const release = await cache.match(expected.get(new URL('release.json', scope).href)!);
  decodeInventory(await release!.json(), buildId);
  return { ready: true, buildId, bytes };
}
interface WorkerReply { protocol: 1; cacheName: string; buildId: string; ready?: boolean; updateProtocol?: number }
function ask(worker: ServiceWorker, type: 'TOADOKU_SHELL_IDENTITY' | 'TOADOKU_SHELL_VERIFY'): Promise<WorkerReply> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Worker verification unavailable; existing caches retained')); }, type === 'TOADOKU_SHELL_VERIFY' ? 15_000 : 3000);
    channel.port1.onmessage = event => {
      clearTimeout(timer); channel.port1.close();
      const reply = event.data as WorkerReply;
      if (reply?.protocol === 1 && ownedShellCache(reply.cacheName, prefix) && reply.cacheName === prefix + reply.buildId) resolve(reply);
      else reject(new Error('Unknown worker cache protocol'));
    };
    worker.postMessage({ type, protocol: 1 }, [channel.port2]);
  });
}
interface CachedInventory { inventory: ShellInventory; hash: string; release: Response }
async function cachedInventory(name: string, snapshot?: ShellSnapshot): Promise<CachedInventory> {
  const response = await (await caches.open(name)).match(new URL('release.json', scope).href, { ignoreSearch: true });
  if (!response || response.status !== 200 || response.redirected || !acceptableShellMime('release.json', response.headers.get('content-type') ?? '')) throw new Error('Missing retained shell inventory');
  const blob = await response.clone().blob();
  if (blob.size > INVENTORY_LIMIT) throw new Error('Retained inventory exceeds budget');
  const buffer = await blob.arrayBuffer(), hash = await sha(buffer);
  if (snapshot && snapshot.inventoryHash !== hash) throw new Error('Retained inventory integrity mismatch');
  return { inventory: decodeInventory(JSON.parse(new TextDecoder().decode(buffer)), name.slice(prefix.length)), hash,
    release: new Response(buffer, { status: 200, headers: response.headers }) };
}
let metadataChecking: Promise<ShellState> | undefined, metadataRetryAt = 0, checkedOwnRoot: string | undefined;
/** Recover disposable ownership only from this worker's compiled proof; otherwise leave networking usable. */
function ensureMetadata(installing = false): Promise<ShellState> {
  if (Date.now() < metadataRetryAt) return Promise.reject(new ShellMetadataError('unavailable', 'Application file metadata retry is deferred'));
  if (metadataChecking) return metadataChecking;
  metadataChecking = (async () => {
    try {
      const state = await metadata.read();
      if (installing) return state;
      const own = state.snapshots[cacheName];
      if (own?.state === 'ready' && own.inventoryHash) {
        if (checkedOwnRoot === own.inventoryHash) return state;
        const url = new URL('release.json', scope).href;
        const response = await (await caches.open(cacheName)).match(expected.get(url)!);
        if (!await verified(response, byURL.get(url)!)) throw new Error('Compiled release inventory failed verification');
        if (await sha(await response!.arrayBuffer()) === own.inventoryHash) { checkedOwnRoot = own.inventoryHash; return state; }
        // A valid-looking but incorrect stored root is still disposable metadata corruption.
      }
    } catch (error) {
      if (!(error instanceof ShellMetadataError) || error.kind === 'unavailable') throw error;
    }
    const names = (await caches.keys()).filter(name => ownedShellCache(name, prefix));
    if (names.length > 64) throw new ShellMetadataError('unavailable', 'Too many application snapshots to reconstruct safely');
    if (installing) {
      const active = self.registration.active;
      const legacy = active ? (await ask(active, 'TOADOKU_SHELL_IDENTITY')).updateProtocol !== 2 : true;
      if (legacy) {
        // Protocol 1 never owned this DB. Preserve its original one-time client seeding.
        await metadata.recover(emptyShellState());
        return metadata.read();
      }
    }
    let own: ShellSnapshot | undefined;
    if (!installing) {
      try {
        if ((await readback()).ready) own = { buildId, inventoryHash: (await cachedInventory(cacheName)).hash, state: 'ready' };
      } catch { /* A partial own shell cannot establish offline readiness. */ }
    }
    const observed = await scopedClients();
    await metadata.recover(reconstructedShellState(names, cacheName, own, Date.now(), observed.map(client => client.id)), true);
    if (own) await metadata.transact(state => {
      if (state.snapshots[cacheName]?.state === 'deleting') throw new ShellMetadataError('unavailable', 'Application snapshot retirement is in progress');
      // Another worker may have repaired the record first. Merge only this compiled proof.
      state.snapshots[cacheName] = own!;
    });
    const state = await metadata.read();
    if (!installing && (!own || state.snapshots[cacheName]?.state !== 'ready' || !state.snapshots[cacheName].inventoryHash)) {
      throw new ShellMetadataError('unavailable', 'Application file ownership could not be reconstructed');
    }
    if (own) checkedOwnRoot = own.inventoryHash;
    return state;
  })().catch(error => {
    if (error instanceof ShellMetadataError) metadataRetryAt = Date.now() + 30_000;
    throw error;
  }).finally(() => { metadataChecking = undefined; });
  return metadataChecking;
}
async function importWorker(worker: ServiceWorker): Promise<string> {
  const identity = await ask(worker, 'TOADOKU_SHELL_IDENTITY');
  const state = await metadata.read(), previous = state.snapshots[identity.cacheName];
  if (previous?.state === 'ready' && previous.inventoryHash) {
    // A damaged predecessor must not trap an otherwise complete new release.
    try { await cachedInventory(identity.cacheName, previous); } catch { /* Retain bytes without trusting their damaged inventory. */ }
    return identity.cacheName;
  }
  // Protocol 1's compiled integrity authenticates release.json and the complete legacy closure.
  const result = await ask(worker, 'TOADOKU_SHELL_VERIFY');
  if (result.cacheName !== identity.cacheName) throw new Error('Legacy identity changed during verification');
  if (result.ready !== true) return identity.cacheName;
  const cached = await cachedInventory(identity.cacheName);
  await metadata.transact(value => {
    if (value.snapshots[identity.cacheName]?.state === 'deleting') throw new Error('Legacy snapshot is being retired');
    value.snapshots[identity.cacheName] = { buildId: identity.buildId, inventoryHash: cached.hash, state: 'ready' };
  });
  return identity.cacheName;
}
async function scopedClients(): Promise<Client[]> {
  return (await self.clients.matchAll({ includeUncontrolled: true, type: 'all' })).filter(client => inScope(client.url));
}
async function stage(): Promise<void> {
  // Names are captured before any later registration job can create its cache.
  const names = (await caches.keys()).filter(name => ownedShellCache(name, prefix));
  if (names.length > 64) throw new Error('Too many application snapshots for safe update');
  await ensureMetadata(true);
  const active = self.registration.active, waiting = self.registration.waiting, installing = self.registration.installing;
  const protectedNames = new Set([cacheName]);
  let primary: string | undefined;
  for (const worker of [active, waiting]) if (worker) {
    const name = await importWorker(worker); protectedNames.add(name);
    if (worker === active) primary = name;
  }
  const clients = await scopedClients();
  if (active !== self.registration.active || waiting !== self.registration.waiting || installing !== self.registration.installing) throw new Error('Registration changed during cache planning');
  const deleting = await metadata.transact(state => {
    if (state.snapshots[cacheName]?.state === 'deleting') throw new Error('Application snapshot retirement is still in progress');
    seedLegacy(state, clients.map(client => client.id), names.filter(name => name !== cacheName), primary, Date.now());
    renewObserved(state, new Set(clients.map(client => client.id)), Date.now());
    compactAbsent(state, new Set(clients.map(client => client.id)), Date.now());
    return markDeleting(state, names, protectedNames);
  });
  for (const name of deleting) {
    if (active !== self.registration.active || waiting !== self.registration.waiting || installing !== self.registration.installing) throw new Error('Registration changed before cache deletion');
    await caches.delete(name);
    await metadata.transact(state => { if (state.snapshots[name]?.state === 'deleting') delete state.snapshots[name]; });
  }
  // A terminated collector may have removed bytes before finalizing its tombstone.
  await metadata.transact(state => {
    for (const [name, snapshot] of Object.entries(state.snapshots)) if (snapshot.state === 'deleting' && !names.includes(name)) delete state.snapshots[name];
  });
  const state = await metadata.read(), retainedNames = names.filter(name => name !== cacheName && !deleting.includes(name));
  let retained = 0;
  const inventories: ShellInventory[] = [];
  for (const name of retainedNames) {
    const cache = await caches.open(name), keys = await cache.keys();
    if (keys.length > 256) throw new Error('Shell cache inventory exceeds budget');
    let actual = 0, declared = SHELL_LIMIT;
    for (const key of keys) {
      const response = await cache.match(key); actual += response ? (await response.blob()).size : 0;
    }
    const snapshot = state.snapshots[name];
    if (snapshot?.state === 'ready' && snapshot.inventoryHash) {
      try {
        const cached = await cachedInventory(name, snapshot);
        inventories.push(cached.inventory);
        declared = cached.inventory.files.reduce((total, file) => total + file.bytes, (await cached.release.blob()).size);
      } catch { /* An untrusted/damaged predecessor reserves a complete maximum shell. */ }
    }
    // Evicted bytes remain reserved. Later verified repairs cannot consume a new install's space.
    retained += Math.max(actual, declared);
    if (retained > SHELL_TOTAL_LIMIT - SHELL_LIMIT) {
      await metadata.transact(value => { value.capacityDeferred = true; });
      throw new Error('Application update deferred while supported snapshots need storage');
    }
  }
  assertImmutableCompatibility(inventories);
  for (const inventory of inventories) for (const file of inventory.files) if (immutableShellPath(file.path)) {
    const entry = byURL.get(new URL(file.path, scope).href);
    if (entry && entry.integrity !== file.integrity) throw new Error('Immutable shell URL changed bytes');
  }
  await metadata.transact(value => { value.capacityDeferred = false; });
  const target = await caches.open(cacheName);
  for (const [url, key] of expected) {
    const entry = byURL.get(url)!;
    if (await verified(await target.match(key), entry)) continue;
    await target.delete(key);
    for (const name of retainedNames) {
      const response = await (await caches.open(name)).match(url, { ignoreSearch: true });
      if (await verified(response, entry)) { await target.put(key, response!); break; }
    }
  }
}
async function fetchExpected(path: string, integrity: string, bytes?: number, hash?: string): Promise<Response> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(new Request(new URL(path, scope), { integrity, cache: 'reload', redirect: 'error', signal: controller.signal }));
    if (response.status !== 200 || response.redirected || !response.body || !acceptableShellMime(path, response.headers.get('content-type') ?? '')) throw new Error('Shell repair response rejected');
    const reader = response.body.getReader(), parts: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength;
        if (size > SHELL_FILE_LIMIT || bytes !== undefined && size > bytes) { await reader.cancel(); throw new Error('Shell repair exceeds budget'); }
        parts.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const body = new Uint8Array(size); let offset = 0;
    for (const part of parts) { body.set(part, offset); offset += part.byteLength; }
    const digest = await crypto.subtle.digest('SHA-256', body);
    if (bytes !== undefined && size !== bytes || hash !== undefined && [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('') !== hash
      || `sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}` !== integrity) throw new Error('Shell repair integrity mismatch');
    return new Response(body, { status: 200, headers: response.headers });
  } finally { clearTimeout(timer); }
}
let repairPuts = Promise.resolve();
async function retainRepair(name: string, path: string, response: Response): Promise<void> {
  const work = repairPuts.then(async () => {
    // Installation owns its reserved space. A verified online response need not be retained.
    if (self.registration.installing) return;
    const pin = `repair:${crypto.randomUUID()}`;
    const held = await metadata.transact(state => {
      if (Object.keys(state.leases).length >= 256 || !pinSnapshot(state, pin, name, Date.now())) return false;
      state.leases[pin].documentId = pin;
      return true;
    });
    if (!held) return;
    try {
      const cache = await caches.open(name), url = new URL(path, scope).href;
      const key = name === cacheName ? expected.get(url) : (await cache.keys()).find(value => { const keyURL = new URL(value.url); return `${keyURL.origin}${keyURL.pathname}` === url; });
      await cache.put(key ?? url, response.clone());
    } finally {
      await metadata.transact(state => releasePage(state, pin, name.slice(prefix.length), pin, false));
    }
  });
  repairPuts = work.catch(() => undefined);
  // Admission failure affects offline readiness, never an already verified online response.
  await work.catch(() => undefined);
}
let repairing: Promise<{ ready: boolean; buildId: string; bytes?: number }> | undefined;
async function repair() {
  if (repairing) return repairing;
  repairing = (async () => {
    const cache = await caches.open(cacheName); let spent = 0;
    for (const [url, key] of expected) {
      const entry = byURL.get(url)!;
      if (await verified(await cache.match(key), entry)) continue;
      const complete = await fetchExpected(entry.url, entry.integrity!);
      spent += (await complete.clone().blob()).size;
      if (spent > SHELL_LIMIT) throw new Error('Repair download exceeds budget');
      await retainRepair(cacheName, entry.url, complete);
    }
    return readback();
  })().finally(() => { repairing = undefined; });
  return repairing;
}
async function bodyFor(name: string, path: string, snapshot: ShellSnapshot, cached = undefined as CachedInventory | undefined, allowRepair = false): Promise<Response | undefined> {
  cached ??= await cachedInventory(name, snapshot);
  if (path === 'release.json') return cached.release;
  const file = cached.inventory.files.find(entry => entry.path === path);
  if (!file) return;
  const response = await (await caches.open(name)).match(new URL(path, scope).href, { ignoreSearch: true });
  if (response?.status === 200 && !response.redirected && acceptableShellMime(path, response.headers.get('content-type') ?? '')) {
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === file.bytes && await sha(bytes) === file.sha256) return new Response(bytes, { status: 200, headers: response.headers });
  }
  if (!allowRepair) return;
  const repaired = await fetchExpected(path, file.integrity, file.bytes, file.sha256);
  await retainRepair(name, path, repaired);
  return repaired;
}
async function route(event: FetchEvent, path: string, navigation: boolean): Promise<Response> {
  const state = await ensureMetadata();
  if (navigation) {
    // Await the durable pin inside the response chain, before delivering HTML.
    if (event.resultingClientId && !await protectClientSnapshot(event.resultingClientId, cacheName)) throw new Error('Application snapshot is not ready');
    const entry = byURL.get(new URL('index.html', scope).href)!;
    const response = await (await caches.open(cacheName)).match(expected.get(new URL('index.html', scope).href)!);
    if (await verified(response, entry)) return response!;
    const repaired = await fetchExpected('index.html', entry.integrity!);
    await retainRepair(cacheName, 'index.html', repaired);
    return repaired;
  }
  const lease = state.leases[event.clientId];
  const choices: string[] = [];
  if (lease?.primary && state.snapshots[lease.primary]?.state === 'ready') choices.push(lease.primary);
  if (immutableShellPath(path)) choices.push(cacheName, ...Object.keys(state.snapshots));
  let recognized = immutableShellPath(path) && byURL.has(new URL(path, scope).href);
  for (const name of new Set(choices)) {
    const snapshot = state.snapshots[name];
    if (snapshot?.state !== 'ready' || !snapshot.inventoryHash) continue;
    let inventory: CachedInventory;
    try { inventory = await cachedInventory(name, snapshot); }
    catch (error) { if (!immutableShellPath(path) && name === lease?.primary) throw error; continue; }
    if (path !== 'release.json' && !inventory.inventory.files.some(file => file.path === path)) continue;
    recognized = true;
    const client = event.resultingClientId || event.clientId;
    if (client && !await protectClientSnapshot(client, name)) continue;
    try { const response = await bodyFor(name, path, snapshot, inventory, true); if (response) return response; }
    catch (error) { if (!immutableShellPath(path)) throw error; }
  }
  if (recognized) throw new Error('Known shell resource failed verification');
  // Unknown page builds never receive arbitrary mutable cached resources.
  return fetch(event.request);
}
async function protectClientSnapshot(client: string, name: string): Promise<boolean> {
  return metadata.transact(state => {
    const pinned = pinSnapshot(state, client, name, Date.now());
    return pinned || state.snapshots[name]?.state === 'ready' && state.overflow[name] !== undefined;
  });
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    await stage();
    await precache.install(event);
    if (!(await readback()).ready) throw new Error('Offline shell readback failed');
    const inventory = await cachedInventory(cacheName);
    await metadata.transact(state => {
      if (state.snapshots[cacheName]?.state === 'deleting') throw new Error('Application snapshot retirement is still in progress');
      state.snapshots[cacheName] = { buildId, inventoryHash: inventory.hash, state: 'ready' };
      state.capacityDeferred = false;
    });
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await precache.activate(event);
    // Unknown clients use network passthrough until their build has been identified.
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !inScope(event.request.url)) return;
  const url = new URL(event.request.url);
  const navigation = event.request.mode === 'navigate' && (url.pathname === base.pathname || url.pathname === new URL('index.html', scope).pathname);
  const path = navigation ? 'index.html' : url.pathname.slice(base.pathname.length);
  if (!navigation && !shellPath(path)) return;
  event.respondWith(route(event, path, navigation).catch(error => {
    if (error instanceof ShellMetadataError) return fetch(event.request);
    return new Response('Application files unavailable. Reconnect and update when your game is saved.', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }));
});
async function reply2(event: ExtendableMessageEvent): Promise<object> {
  await ensureMetadata();
  const data = event.data as { type: string; buildId?: unknown; documentId?: unknown; persisted?: unknown };
  const source = event.source as Client | null;
  let pinned = false;
  if (data.type === 'TOADOKU_PAGE_CONNECT' || data.type === 'TOADOKU_PAGE_RELEASE') {
    if (!source?.id || !inScope(source.url) || typeof data.buildId !== 'string' || !BUILD_ID.test(data.buildId) || !validDocumentId(data.documentId)) throw new Error('Invalid page identity');
    const pageBuild = data.buildId, documentId = data.documentId;
    const observed = data.type === 'TOADOKU_PAGE_CONNECT' ? await scopedClients() : [];
    await metadata.transact(state => {
      if (data.type === 'TOADOKU_PAGE_CONNECT') {
        renewObserved(state, new Set(observed.map(value => value.id)), Date.now());
        if (Object.keys(state.leases).length >= 256 && !state.leases[source.id]) compactAbsent(state, new Set(observed.map(value => value.id)), Date.now());
        pinned = connectPage(state, source.id, pageBuild, documentId, Date.now());
      }
      else releasePage(state, source.id, pageBuild, documentId, data.persisted === true);
    });
    if (data.type === 'TOADOKU_PAGE_RELEASE') return { protocol: 2, released: true };
  }
  const current = data.type === 'TOADOKU_SHELL_REPAIR' && data.buildId === buildId ? await repair() : await readback();
  const state = await metadata.read();
  const requested = typeof data.buildId === 'string' && BUILD_ID.test(data.buildId) ? data.buildId : buildId;
  const name = prefix + requested, snapshot = state.snapshots[name];
  let ready = requested === buildId && current.ready, bytes = ready ? current.bytes : undefined;
  if (requested !== buildId && snapshot?.state === 'ready' && snapshot.inventoryHash) {
    try {
      const inventory = await cachedInventory(name, snapshot);
      let count = (await inventory.release.clone().blob()).size;
      ready = true;
      for (const file of inventory.inventory.files) { if (!await bodyFor(name, file.path, snapshot, inventory)) { ready = false; break; } count += file.bytes; }
      if (count > SHELL_LIMIT) ready = false;
      if (ready) bytes = count;
    } catch { ready = false; }
  }
  if (data.type === 'TOADOKU_PAGE_CONNECT' && !pinned) ready = false;
  return { protocol: 2, updateProtocol: 2, activeBuild: buildId, activeReady: current.ready, buildId: requested, cacheName: name, ready, bytes, pinned, capacityDeferred: state.capacityDeferred };
}
self.addEventListener('message', event => {
  if (!event.ports[0]) {
    if (event.data?.protocol === 2 && event.data.type === 'TOADOKU_PAGE_RELEASE') event.waitUntil(reply2(event).catch(() => undefined));
    return;
  }
  const port = event.ports[0];
  if (event.data?.protocol === 2) {
    if (!['TOADOKU_PAGE_CONNECT', 'TOADOKU_PAGE_RELEASE', 'TOADOKU_SHELL_VERIFY', 'TOADOKU_SHELL_REPAIR'].includes(event.data.type)) return;
    event.waitUntil(reply2(event).then(reply => port.postMessage(reply)).catch(error => port.postMessage({ protocol: 2, updateProtocol: 2, activeBuild: buildId, activeReady: false, buildId: event.data.buildId, ready: false, pinned: false, metadataUnavailable: error instanceof ShellMetadataError })));
    return;
  }
  if (event.data?.protocol !== 1) return;
  if (event.data.type === 'TOADOKU_SHELL_IDENTITY') { port.postMessage({ protocol: 1, cacheName, buildId, updateProtocol: 2 }); return; }
  if (event.data.type === 'TOADOKU_SHELL_REPAIR' && event.data.buildId !== buildId) return;
  if (event.data.type !== 'TOADOKU_SHELL_VERIFY' && event.data.type !== 'TOADOKU_SHELL_REPAIR') return;
  event.waitUntil((async () => {
    await ensureMetadata();
    const result = event.data.type === 'TOADOKU_SHELL_REPAIR' ? await repair() : await readback();
    const state = await metadata.read();
    port.postMessage({ protocol: 1, cacheName, ...result, updateProtocol: 2, activeBuild: buildId, activeReady: result.ready, capacityDeferred: state.capacityDeferred });
  })().catch(error => port.postMessage({ protocol: 1, cacheName, ready: false, buildId, updateProtocol: 2, activeReady: false, metadataUnavailable: error instanceof ShellMetadataError })));
});
