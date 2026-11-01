import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { CatalogLoader } from '../../src/lib/catalog/load';
import type { AttestedRecord, CatalogManifest } from '../../src/lib/catalog/types';
import { verifyRetained } from '../../src/lib/offline/verify';
import { decodeManifest } from '../../src/lib/catalog/decode';
import { manifestMembership } from '../../src/lib/catalog/attestation';

const manifestBytes = new Uint8Array(await readFile('public/catalog/v1/manifest.json'));
const manifest = JSON.parse(new TextDecoder().decode(manifestBytes)) as CatalogManifest;
const response = (bytes: Uint8Array) => new Response(new Uint8Array(bytes), { headers: { 'content-type': 'application/json' } });
const fixture = async (input: RequestInfo | URL) => response(new Uint8Array(await readFile('public/catalog/v1/' + new URL(String(input)).pathname.split('/').at(-1))));
async function certified() {
  const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: fixture });
  const result = await loader.getRecord('easy', 0); loader.dispose();
  if (result.kind !== 'ready') throw new Error(result.kind);
  return result.value;
}
describe('offline loader priority and rejected bytes', () => {
  it('fences old foreground retention after clear while a new request can retain', async () => {
    let revision = 0, saved: AttestedRecord | undefined;
    const attempts: number[] = [];
    let release!: () => void, started!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { started = resolve; });
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async input => {
      if (!String(input).endsWith('manifest.json')) { started(); await held; }
      return fixture(input);
    } });
    loader.setOfflineCache({
      getRevision: async () => revision, getManifest: async () => manifestBytes, putManifest: async () => true,
      getRecord: async () => undefined, putRecord: async (record, expected) => {
        attempts.push(expected);
        if (expected !== revision) return false;
        saved = record; return true;
      },
    });
    const request = loader.getRecord('easy', 0); await ready;
    revision++; release();
    expect((await request).kind).toBe('ready');
    await vi.waitFor(() => expect(attempts).toEqual([0]));
    expect(saved).toBeUndefined();
    expect((await loader.getRecord('easy', 1)).kind).toBe('ready');
    await vi.waitFor(() => expect(saved?.attestation.recordIndex).toBe(1));
    expect(attempts).toEqual([0, 1]); loader.dispose();
  });
  it('does not block requested play on an unresolved or failed retention revision', async () => {
    let reject!: (error: Error) => void, writes = 0;
    const revision = new Promise<number>((_resolve, fail) => { reject = fail; });
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: fixture });
    loader.setOfflineCache({ getRevision: () => revision, getManifest: async () => manifestBytes,
      putManifest: async () => true, getRecord: async () => undefined, putRecord: async () => { writes++; return true; } });
    expect((await loader.getRecord('easy', 0)).kind).toBe('ready');
    reject(new Error('optional storage unavailable'));
    await Promise.resolve(); await Promise.resolve();
    expect(writes).toBe(0); loader.dispose();
  });
  it('skips retention for mid-request cache attachment and leaves background writes to preparation', async () => {
    let release!: () => void, started!: () => void, writes = 0;
    const held = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { started = resolve; });
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async input => {
      if (!String(input).endsWith('manifest.json')) { started(); await held; }
      return fixture(input);
    } });
    const request = loader.getRecord('easy', 0); await ready;
    loader.setOfflineCache({ getRevision: async () => 0, getManifest: async () => manifestBytes,
      putManifest: async () => true, getRecord: async () => undefined, putRecord: async () => { writes++; return true; } });
    release(); expect((await request).kind).toBe('ready');
    expect((await loader.getRecord('easy', 1, undefined, 'background')).kind).toBe('ready');
    expect(writes).toBe(0); loader.dispose();
  });
  it('foreground exact fetch bypasses a held background file; cancelling the shared background consumer preserves foreground ownership', async () => {
    let release!: () => void, heldStarted!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; }), started = new Promise<void>(resolve => { heldStarted = resolve; });
    const slow = manifest.pools.easy.shards[0], fast = manifest.pools.easy.shards[1];
    let active = 0, maximum = 0;
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async (input, init) => {
      const path = new URL(String(input)).pathname.split('/').at(-1)!;
      if (path === 'manifest.json') return response(manifestBytes);
      active++; maximum = Math.max(maximum, active);
      try {
        if (path === slow.path) {
          heldStarted();
          await new Promise<void>((resolve, reject) => {
            held.then(resolve);
            init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), { once: true });
          });
        }
        return fixture(input);
      } finally { active--; }
    } });
    await loader.initialize();
    const cancel = new AbortController(), background = loader.getRecord('easy', slow.start, cancel.signal, 'background');
    await started;
    const sharedForeground = loader.getRecord('easy', slow.start + 1);
    const fastForeground = loader.getRecord('easy', fast.start);
    expect((await fastForeground).kind).toBe('ready');
    cancel.abort();
    expect((await background).kind).toBe('aborted');
    release();
    expect((await sharedForeground).kind).toBe('ready');
    expect(maximum).toBe(2);
    loader.dispose();
  });
  it('rejects HTML MIME and redirects and cancels their unused response bodies', async () => {
    for (const bad of ['mime','redirect']) {
      let cancelled = false;
      const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async () => {
        const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
        const response = new Response(body, { headers: { 'content-type': bad === 'mime' ? 'text/html' : 'application/json' } });
        if (bad === 'redirect') Object.defineProperty(response, 'redirected', { value: true });
        return response;
      } });
      expect((await loader.initialize()).kind).toBe('corrupt');
      expect(cancelled).toBe(true);
      loader.dispose();
    }
  });
  it('bounded fetch and body timeouts are unavailable rather than reporting a player cancellation', async () => {
    vi.useFakeTimers();
    try {
      for (const phase of ['fetch','body']) {
        let started!: () => void;
        const ready = new Promise<void>(resolve => { started = resolve; });
        const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async (_input, init) => {
          started();
          if (phase === 'fetch') return new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), { once: true }));
          return new Response(new ReadableStream<Uint8Array>({ start(controller) {
            init?.signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted','AbortError')), { once: true });
          } }), { headers: { 'content-type': 'application/json' } });
        } });
        const result = loader.initialize(); await ready;
        await vi.advanceTimersByTimeAsync(20_001);
        expect(await result).toMatchObject({ kind: 'unavailable', reason: expect.stringContaining('catalog-timeout') });
        loader.dispose();
      }
    } finally { vi.useRealTimers(); }
  });
  it('rejects valid-proof records with extra fields, accessors, nonenumerable keys, proof extras or a different manifest identity', async () => {
    const record = await certified();
    expect(await verifyRetained(record, manifest, 'easy', 0)).toBe(true);
    for (const corrupt of [
      (r: AttestedRecord) => Object.assign(r, { extra: 1 }),
      (r: AttestedRecord) => Object.assign(r.attestation, { extra: 1 }),
      (r: AttestedRecord) => Object.defineProperty(r, Symbol('extra'), { value: 1 }),
      (r: AttestedRecord) => Object.defineProperty(r, 'extra', { value: 1 }),
      (r: AttestedRecord) => Object.defineProperty(r.attestation.recordSiblings, 'extra', { value: 1 }),
      (r: AttestedRecord) => Object.defineProperty(r, 'givens', { enumerable: true, get() { throw new Error('getter must not run'); } }),
    ]) {
      const candidate = structuredClone(record); corrupt(candidate);
      expect(await verifyRetained(candidate, manifest, 'easy', 0)).toBe(false);
    }
    expect(await verifyRetained(record, { ...manifest, sourceRevision: 'a'.repeat(40) }, 'easy', 0)).toBe(false);
  });
  it('explicit preparation cannot acknowledge a manifest until the awaited write and exact readback succeed', async () => {
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: fixture });
    await loader.initialize();
    let bytes: Uint8Array | undefined, accept = false;
    loader.setOfflineCache({ getRevision: async () => 0, getManifest: async () => bytes, putManifest: async input => { if (accept) bytes = input.slice(); return accept; }, getRecord: async () => undefined, putRecord: async () => false });
    expect(await loader.ensureOfflineManifest()).toBe(false);
    accept = true;
    expect(await loader.ensureOfflineManifest()).toBe(true);
    bytes![0] ^= 1;
    loader.setOfflineCache({ getRevision: async () => 0, getManifest: async () => bytes, putManifest: async () => true, getRecord: async () => undefined, putRecord: async () => false });
    expect(await loader.ensureOfflineManifest()).toBe(false);
    loader.dispose();
  });
  it('debits every background refetch after foreground LRU eviction, and refusal cannot reject a same-path foreground consumer', async () => {
    const requests: string[] = [];
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async input => { requests.push(new URL(String(input)).pathname); return fixture(input); } });
    let claims = 0;
    const allowance = { claim: () => ++claims <= 1 };
    expect((await loader.getRecord('easy', 0, undefined, 'background', allowance)).kind).toBe('ready');
    expect(claims).toBe(1);
    expect((await loader.getRecord('easy', 1, undefined, 'background', allowance)).kind).toBe('ready');
    expect(claims).toBe(1);
    for (const shard of manifest.pools.easy.shards.slice(1, 5)) expect((await loader.getRecord('easy', shard.start)).kind).toBe('ready');
    const [background, foreground] = await Promise.all([
      loader.getRecord('easy', 2, undefined, 'background', allowance), loader.getRecord('easy', 2),
    ]);
    expect(background).toMatchObject({ kind: 'unavailable', reason: expect.stringContaining('offline-download-limit') });
    expect(foreground.kind).toBe('ready');
    expect(claims).toBe(2);
    expect(requests.filter(path => path.endsWith(manifest.pools.easy.shards[0].path))).toHaveLength(2);
    loader.dispose();
  });
  it('an existing foreground read spends no optional allowance, and a shared admitted background read keeps its original action byte ownership', async () => {
    for (const owner of ['foreground', 'background'] as const) {
      let started!: () => void, release!: () => void;
      const ready = new Promise<void>(resolve => { started = resolve; });
      const held = new Promise<void>(resolve => { release = resolve; });
      const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async (input, init) => {
        if (String(input).endsWith('manifest.json')) return response(manifestBytes);
        started();
        await new Promise<void>((resolve, reject) => { held.then(resolve); init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted','AbortError')), { once: true }); });
        return fixture(input);
      } });
      await loader.initialize();
      let oldClaims = 0, oldBytes = 0, newClaims = 0, newBytes = 0;
      const oldAllowance = { claim: () => { oldClaims++; return true; }, received: (bytes: number) => oldBytes += bytes };
      const newAllowance = { claim: () => { newClaims++; return false; }, received: (bytes: number) => newBytes += bytes };
      const cancel = new AbortController();
      const first = loader.getRecord('easy', 0, cancel.signal, owner, oldAllowance);
      await ready;
      const foreground = loader.getRecord('easy', 1);
      const joined = loader.getRecord('easy', 2, undefined, 'background', newAllowance);
      // Cancellation releases only this consumer; the foreground still needs the same bytes.
      await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
      cancel.abort(); expect((await first).kind).toBe('aborted');
      release();
      expect((await foreground).kind).toBe('ready');
      expect((await joined).kind).toBe('ready');
      expect(newClaims).toBe(0); expect(newBytes).toBe(0);
      expect(oldClaims).toBe(owner === 'background' ? 1 : 0);
      expect(oldBytes).toBe(owner === 'background' ? manifest.pools.easy.shards[0].bytes : 0);
      loader.dispose();
    }
  });

  it('rejects cached routing poison despite valid membership, fetches the canonical manifest once and repairs the next cold offline loader', async () => {
    const poisoned = JSON.parse(JSON.stringify(manifest));
    poisoned.pools.easy.shards[0].sha256 = '0'.repeat(64);
    poisoned.pools.easy.shards[0].path = 'easy-0-0000000000000000.json';
    expect(() => decodeManifest(poisoned)).not.toThrow();
    expect(await manifestMembership(poisoned)).toBeDefined();
    let bytes = new TextEncoder().encode(JSON.stringify(poisoned) + '\n'), saved: AttestedRecord | undefined;
    expect(() => JSON.parse(new TextDecoder().decode(bytes))).not.toThrow();
    const requests: string[] = [], cache = {
      getRevision: async () => 0,
      getManifest: async () => bytes.slice(), putManifest: async (input: Uint8Array) => { bytes = input.slice(); return true; },
      getRecord: async () => saved && structuredClone(saved), putRecord: async (record: AttestedRecord) => { saved = structuredClone(record); return true; },
    };
    const loader = new CatalogLoader('https://test.invalid/catalog/v1/', { fetcher: async input => { requests.push(new URL(String(input)).pathname); return fixture(input); } });
    loader.setOfflineCache(cache);
    expect((await loader.getRecord('easy', 0)).kind).toBe('ready');
    expect(requests.filter(path => path.endsWith('/manifest.json'))).toHaveLength(1);
    expect(requests.some(path => path.includes('0000000000000000'))).toBe(false);
    expect(await loader.ensureOfflineManifest()).toBe(true);
    expect(bytes).toEqual(manifestBytes);
    const cold = new CatalogLoader(loader.base, { fetcher: async () => { throw new Error('offline'); } });
    cold.setOfflineCache(cache);
    expect((await cold.getRecord('easy', 0)).kind).toBe('ready');
    const wrongNetwork = new CatalogLoader(loader.base, { fetcher: async () => response(new TextEncoder().encode(JSON.stringify(poisoned))) });
    expect(await wrongNetwork.initialize()).toMatchObject({ kind: 'corrupt', reason: expect.stringContaining('manifest hash') });
    loader.dispose(); cold.dispose(); wrongNetwork.dispose();
  });

});

