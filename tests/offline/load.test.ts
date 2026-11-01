import { describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { CatalogLoader } from '../../src/lib/catalog/load';
import type { AttestedRecord, CatalogManifest } from '../../src/lib/catalog/types';
import { verifyRetained } from '../../src/lib/offline/verify';

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
    loader.setOfflineCache({ getManifest: async () => bytes, putManifest: async input => { if (accept) bytes = input.slice(); return accept; }, getRecord: async () => undefined, putRecord: async () => false });
    expect(await loader.ensureOfflineManifest()).toBe(false);
    accept = true;
    expect(await loader.ensureOfflineManifest()).toBe(true);
    bytes![0] ^= 1;
    loader.setOfflineCache({ getManifest: async () => bytes, putManifest: async () => true, getRecord: async () => undefined, putRecord: async () => false });
    expect(await loader.ensureOfflineManifest()).toBe(false);
    loader.dispose();
  });
});

