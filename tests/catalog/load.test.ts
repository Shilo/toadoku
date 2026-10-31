import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { decodeManifest, decodeShard, decodeTuple, verifyRecordIdentity } from '../../src/lib/catalog/decode';
import type { CatalogManifest } from '../../src/lib/catalog/types';
const manifestBytes = await readFile('public/catalog/v1/manifest.json');
const manifest = JSON.parse(manifestBytes.toString()) as CatalogManifest;
function fetchFixture(options: { status?: number; mutate?: (path: string, bytes: Uint8Array) => Uint8Array; delayShard?: number } = {}) {
  const requests: string[] = []; let active = 0, maximum = 0;
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input)); requests.push(url.pathname); active++; maximum = Math.max(maximum, active);
    try {
      if (options.delayShard && !url.pathname.endsWith('manifest.json')) await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, options.delayShard);
        init?.signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
        if (init?.signal?.aborted) { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }
      });
      const path = url.pathname.split('/').at(-1)!;
      const bytes = await readFile(`public/catalog/v1/${path}`);
      return new Response(new Uint8Array(options.mutate?.(path, bytes) ?? bytes), { status: options.status ?? 200 });
    } finally { active--; }
  }) as typeof fetch;
  return { requests, fetcher, maximum: () => maximum };
}
describe('progressive local catalog', () => {
  it('fetches only manifest plus requested shard under root/subpath and coalesces', async () => {
    for (const base of ['https://example.test/catalog/v1/', 'https://example.test/toadoku/catalog/v1/']) {
      const fixture = fetchFixture(), loader = new CatalogLoader(base, fixture);
      const results = await Promise.all([loader.getRecord('easy', 0), loader.getRecord('easy', 1)]);
      expect(results.every(r => r.kind === 'ready')).toBe(true);
      expect(fixture.requests.length).toBe(2); expect(fixture.requests.every(path => path.startsWith(new URL(base).pathname))).toBe(true);
      expect(fixture.maximum()).toBe(1); loader.dispose();
    }
  });
  it('validates selected identities and all shard records', async () => {
    const descriptor = manifest.pools.easy.shards[0], value = JSON.parse(await readFile(`public/catalog/v1/${descriptor.path}`, 'utf8'));
    const record = decodeTuple(value.records[0], 'easy'); expect(await verifyRecordIdentity(record)).toBe(true);
    expect(await verifyRecordIdentity({ ...record, id: 'a'.repeat(64) })).toBe(false);
    expect(() => decodeTuple([...value.records[0].slice(0, 5), 49, 0], 'easy')).toThrow();
    expect(() => decodeTuple(new Array(1_000_000_000), 'easy')).toThrow();
    expect(() => decodeShard({ schemaVersion: 1, catalogVersion: '1', pool: 'easy', start: 0, records: new Array(1_000_000_000) }, { ...descriptor, count: 1 })).toThrow();
    const withExtra = [...value.records[0]]; Object.assign(withExtra, { extra: 1 }); expect(() => decodeTuple(withExtra, 'easy')).toThrow();
    const bad = JSON.parse(JSON.stringify(manifest)); bad.pools.easy.shards[0].path = '../bad.json'; expect(() => decodeManifest(bad)).toThrow();
  });
  it('returns distinct fetch/corruption/exhaustion/abort outcomes', async () => {
    const missing = new CatalogLoader('https://example.test/catalog/v1/', fetchFixture({ status: 404 }));
    expect((await missing.getRecord('easy', 0)).kind).toBe('unavailable');
    const broken = new CatalogLoader('https://example.test/catalog/v1/', fetchFixture({ mutate: (p, b) => p === 'manifest.json' ? b : new TextEncoder().encode('{}') }));
    expect((await broken.getRecord('easy', 0)).kind).toBe('corrupt');
    const oversize = new CatalogLoader('https://example.test/catalog/v1/', fetchFixture({ mutate: () => new Uint8Array(128 * 1024 + 1) }));
    expect((await oversize.getRecord('easy', 0)).kind).toBe('corrupt');
    const fixture = fetchFixture(), loader = new CatalogLoader('https://example.test/catalog/v1/', fixture);
    const abort = new AbortController(); abort.abort(); expect((await loader.getRecord('easy', 0, abort.signal)).kind).toBe('aborted'); expect(fixture.requests).toHaveLength(0);
    expect((await loader.getRecord('easy', manifest.pools.easy.count)).kind).toBe('exhausted');
  });
  it('canceling one shared consumer preserves the other and cancel-all can retry', async () => {
    const fixture = fetchFixture({ delayShard: 25 }), loader = new CatalogLoader('https://example.test/catalog/v1/', fixture);
    await loader.initialize();
    const abort = new AbortController(), a = loader.getRecord('easy', 0, abort.signal), b = loader.getRecord('easy', 1);
    await new Promise(resolve => setTimeout(resolve, 1)); abort.abort();
    expect((await a).kind).toBe('aborted'); expect((await b).kind).toBe('ready');
    const next = manifest.pools.easy.shards[1].start, cancel = new AbortController(), c = loader.getRecord('easy', next, cancel.signal);
    await new Promise(resolve => setTimeout(resolve, 1)); cancel.abort();
    const retry = loader.getRecord('easy', next);
    expect((await c).kind).toBe('aborted'); expect((await retry).kind).toBe('ready');
    expect(fixture.maximum()).toBe(1);
  });
  it('bounds decoded cache to three shards and ignores cache quota errors', async () => {
    const fixture = fetchFixture(), cache = { get: async () => undefined, put: async () => { throw new Error('quota'); } }, loader = new CatalogLoader('https://example.test/catalog/v1/', { ...fixture, cache });
    for (const shard of manifest.pools.easy.shards.slice(0, 4)) expect((await loader.getRecord('easy', shard.start)).kind).toBe('ready');
    expect((await loader.getRecord('easy', 0)).kind).toBe('ready'); expect(fixture.requests.length).toBe(6);
  });
  it('keeps both decoded and proof-tree caches bounded under concurrent consumers', async () => {
    const fixture = fetchFixture(), loader = new CatalogLoader('https://example.test/catalog/v1/', fixture);
    const results = await Promise.all(manifest.pools.easy.shards.slice(0, 8).map(s => loader.getRecord('easy', s.start)));
    expect(results.every(r => r.kind === 'ready')).toBe(true);
    const internals = loader as unknown as { decoded: Map<string, unknown>; recordTrees: Map<string, unknown> };
    expect(internals.decoded.size).toBeLessThanOrEqual(3); expect(internals.recordTrees.size).toBeLessThanOrEqual(3);
    expect(fixture.maximum()).toBe(1);
  });
});
