import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { POOLS } from '../../src/lib/catalog/types';
import type { AttestedRecord, PoolId } from '../../src/lib/catalog/types';
import { OfflineSupport } from '../../src/lib/offline/reserve';
import type { OfflineStore } from '../../src/lib/offline/types';
import { OFFLINE_LIMITS, recordKey, coveragePlans } from '../../src/lib/offline/plan';
import type { CurrentSave } from '../../src/lib/storage/repository';

const manifestBytes = new Uint8Array(await readFile('public/catalog/v1/manifest.json'));
const manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
class MemoryStore implements OfflineStore {
  manifest?: Uint8Array;
  records = new Map<string, AttestedRecord>();
  writes = 0;
  refuse = false;
  corruptRead = false;
  revision = 0;
  afterWrite?: () => void;
  async getManifest() { return this.manifest?.slice(); }
  async putManifest(bytes: Uint8Array) { this.manifest = bytes.slice(); return true; }
  async getRecord(pool: PoolId, ordinal: number) {
    const record = this.records.get(recordKey(pool, ordinal));
    return record ? { ...structuredClone(record), ...(this.corruptRead ? { givens: '0'.repeat(81) } : {}) } : undefined;
  }
  async putRecord(record: AttestedRecord) {
    this.writes++;
    if (this.refuse) return false;
    this.records.set(recordKey(record.pool, record.attestation.shardStart + record.attestation.recordIndex), structuredClone(record));
    this.afterWrite?.(); return true;
  }
  async inventory() { return { keys: [...this.records.keys()], bytes: new TextEncoder().encode(JSON.stringify([...this.records.values()])).length, revision: this.revision }; }
  async replacePins(keys: readonly string[]) { return keys.every(key => this.records.has(key)); }
  async clear() { this.revision++; this.records.clear(); return true; }
  close() {}
}
function initialSave(): CurrentSave {
  return { meta: { generation: 'g1', essentialRevision: 0 },
    preferences: { schemaVersion: 1, language: 'en', motion: 'system', boardShape: 'fill', theme: 'pond', appearance: 'light' },
    profile: { revision: 0, wallet: 0, lifetimeEarned: 0, frontier: { runId: 'run', metamorphosis: 1, leap: 1, scheduleVersion: 1 }, highestCompletedLeap: 0 },
    roles: [], attempts: [], pools: POOLS.map(pool => ({ selectionVersion: '1', catalogVersion: '1', pool, revision: 0, seed: 7,
      epoch: 0, cursor: 0, lifetimeIssued: 0, count: manifest.pools[pool].count })) };
}
function setup(store = new MemoryStore()) {
  const save = initialSave(), requests: string[] = [];
  const loader = new CatalogLoader('https://example.test/toadoku/catalog/v1/', { fetcher: async input => {
    const path = new URL(String(input)).pathname.split('/').at(-1)!; requests.push(path);
    return new Response(new Uint8Array(await readFile('public/catalog/v1/' + path)), { headers: { 'content-type': 'application/json' } });
  } });
  const support = new OfflineSupport({ readCurrent: async () => ({ kind: 'committed', value: structuredClone(save) }) }, loader, store);
  return { save, requests, loader, support, store };
}
describe('verified offline reserve', () => {
  it('does no automatic downloads; explicitly prepares three true upcoming allocations in every pool without essential writes', async () => {
    const fixture = setup(), before = JSON.stringify(fixture.save);
    expect(fixture.requests).toHaveLength(0);
    const estimate = await fixture.support.estimate('default');
    expect(estimate.bytes).toBeLessThan(OFFLINE_LIMITS.defaultDownloadBytes);
    expect(estimate.target).toBe(3);
    await fixture.support.prepare('default');
    expect(fixture.support.state.phase).toBe('ready');
    expect(fixture.support.state.counts).toEqual(Object.fromEntries(POOLS.map(pool => [pool, 3])));
    expect(JSON.stringify(fixture.save)).toBe(before);
    expect(fixture.store.records.size).toBe(15);
    expect(fixture.support.state.storedBytes).toBeLessThan(OFFLINE_LIMITS.recordBytes);
    expect(fixture.support.state.downloadedBytes).toBeLessThan(OFFLINE_LIMITS.defaultDownloadBytes);
    const requests = fixture.requests.length;
    await fixture.support.prepare('default');
    expect(fixture.requests).toHaveLength(requests);
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);
  it('cold exact record reads use verified durable manifest and proof, while a missing exact ordinal still fetches online if writes are refused', async () => {
    const fixture = setup();
    await fixture.support.prepare('default');
    const kept = [...fixture.store.records.values()][0];
    const coldRequests: string[] = [];
    const cold = new CatalogLoader(fixture.loader.base, { fetcher: async input => {
      const path = new URL(String(input)).pathname.split('/').at(-1)!; coldRequests.push(path);
      return new Response(new Uint8Array(await readFile('public/catalog/v1/' + path)), { headers: { 'content-type': 'application/json' } });
    } });
    cold.setOfflineCache(fixture.store);
    expect((await cold.getRecord(kept.pool, kept.attestation.shardStart + kept.attestation.recordIndex)).kind).toBe('ready');
    expect(coldRequests).toHaveLength(0);
    fixture.store.refuse = true;
    const missing = Array.from({ length: manifest.pools.easy.count }, (_, ordinal) => ordinal).find(ordinal => !fixture.store.records.has(recordKey('easy', ordinal)))!;
    const result = await cold.getRecord('easy', missing);
    expect(result.kind).toBe('ready');
    if (result.kind === 'ready') expect(result.value.attestation.shardStart + result.value.attestation.recordIndex).toBe(missing);
    expect(coldRequests).toHaveLength(1);
    fixture.support.dispose(); fixture.loader.dispose(); cold.dispose();
  }, 20_000);
  it('write or independent readback failure never advertises a completed reserve', async () => {
    for (const corrupt of [false, true]) {
      const store = new MemoryStore(); store.refuse = !corrupt; store.corruptRead = corrupt;
      const fixture = setup(store);
      await fixture.support.prepare('default');
      expect(fixture.support.state.phase).toBe('failed');
      expect(Object.values(fixture.support.state.counts).every(count => count === 0)).toBe(true);
      expect(fixture.support.state.completed).toBe(0);
      fixture.support.dispose(); fixture.loader.dispose();
    }
  }, 20_000);
  it('fresh state recomputation rejects a consumed frontier, and removal preserves essential state and trusted metadata', async () => {
    const fixture = setup();
    await fixture.support.prepare('default');
    fixture.save.pools[0].cursor = 100;
    fixture.save.pools[0].revision++;
    await fixture.support.inspect();
    expect(fixture.support.state.counts.easy).toBe(0);
    const before = JSON.stringify(fixture.save);
    await fixture.support.clear();
    expect(Object.values(fixture.support.state.counts).every(count => count === 0)).toBe(true);
    expect(fixture.store.manifest).toEqual(manifestBytes);
    expect(JSON.stringify(fixture.save)).toBe(before);
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);
  it('detects a generation/pool change during staging rather than publishing stale pins', async () => {
    const fixture = setup();
    let changed = false;
    fixture.store.afterWrite = () => {
      if (!changed) { changed = true; fixture.save.meta.generation = 'g2'; fixture.save.pools[0].cursor = 50; fixture.save.pools[0].revision++; }
    };
    await fixture.support.prepare('default');
    expect(fixture.support.state.phase).toBe('failed');
    expect(fixture.support.state.problem).toContain('offline-state-changed');
    expect(fixture.support.state.counts.easy).toBe(0);
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);
  it('removal waits for an in-flight acknowledged write, then stays empty after cancellation settles', async () => {
    let started!: () => void, release!: () => void;
    const held = new Promise<void>(resolve => { release = resolve; });
    const ready = new Promise<void>(resolve => { started = resolve; });
    class HeldStore extends MemoryStore {
      once = true;
      override async putRecord(record: AttestedRecord) {
        if (this.once) { this.once = false; started(); await held; }
        return super.putRecord(record);
      }
    }
    const fixture = setup(new HeldStore());
    const preparing = fixture.support.prepare('default'); await ready;
    let removed = false;
    const clearing = fixture.support.clear().then(() => { removed = true; });
    await Promise.resolve(); expect(removed).toBe(false);
    release(); await Promise.all([preparing, clearing]);
    expect(fixture.store.records.size).toBe(0);
    expect(Object.values(fixture.support.state.counts).every(count => count === 0)).toBe(true);
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);
  it('removal cannot reuse a stale in-flight readiness inspection', async () => {
    const fixture = setup(); await fixture.support.prepare('default');
    let started!: () => void, release!: () => void, calls = 0;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const inventory = fixture.store.inventory.bind(fixture.store);
    fixture.store.inventory = async () => {
      if (++calls === 2) { started(); await held; }
      return inventory();
    };
    const inspecting = fixture.support.inspect(); await ready;
    let removed = false;
    const clearing = fixture.support.clear().then(() => { removed = true; });
    await Promise.resolve(); expect(removed).toBe(false);
    release(); await Promise.all([inspecting, clearing]);
    expect(fixture.store.records.size).toBe(0);
    expect(fixture.support.state.phase).toBe('idle');
    expect(Object.values(fixture.support.state.counts).every(count => count === 0)).toBe(true);
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);
  it('another connection clearing between proof reads and final inventory invalidates capacity', async () => {
    const fixture = setup(); await fixture.support.prepare('default');
    let started!: () => void, release!: () => void, calls = 0;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const inventory = fixture.store.inventory.bind(fixture.store);
    fixture.store.inventory = async () => {
      if (++calls === 2) { started(); await held; }
      return inventory();
    };
    const inspecting = fixture.support.inspect(); await ready;
    await fixture.store.clear(); release(); await inspecting;
    expect(Object.values(fixture.support.state.counts).every(count => count === 0)).toBe(true);
    expect(fixture.support.state.problem).toBe('offline-state-changed');
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);

  it('completed staging performs a fresh inspection rather than coalescing an earlier incomplete snapshot', async () => {
    const fixture = setup(); await fixture.support.estimate('default');
    let started!: () => void, release!: () => void, staged!: () => void, first = true;
    const ready = new Promise<void>(resolve => { started = resolve; });
    const held = new Promise<void>(resolve => { release = resolve; });
    const stagingDone = new Promise<void>(resolve => { staged = resolve; });
    const getRecord = fixture.store.getRecord.bind(fixture.store);
    fixture.store.getRecord = async (pool, ordinal) => {
      const record = await getRecord(pool, ordinal);
      if (first) { first = false; started(); await held; }
      return record;
    };
    const unsubscribe = fixture.support.subscribe(state => { if (state.phase === 'partial' && state.total > 0 && state.completed === state.total) staged(); });
    const inspecting = fixture.support.inspect(); await ready;
    const preparing = fixture.support.prepare('default'); await stagingDone;
    release(); await Promise.all([inspecting, preparing]);
    expect(fixture.support.state.phase).toBe('ready');
    expect(Object.values(fixture.support.state.counts).every(count => count >= 3)).toBe(true);
    unsubscribe(); fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);

  it('stops before the twenty-first new shard attempt when a wrap closure exceeds the explicit default allowance', async () => {
    const fixture = setup();
    for (const state of fixture.save.pools) state.cursor = state.count - 1;
    const paths = new Set(fixture.save.pools.flatMap(state => coveragePlans(state, [], 3)[2].map(ordinal =>
      manifest.pools[state.pool].shards.find((shard: { start: number; count: number }) => ordinal >= shard.start && ordinal < shard.start + shard.count).path)));
    expect(paths.size).toBeGreaterThan(20);
    const before = JSON.stringify(fixture.save);
    await fixture.support.prepare('default');
    expect(fixture.support.state.phase).toBe('failed');
    expect(fixture.support.state.problem).toContain('offline-download-limit');
    expect(fixture.requests.filter(path => path !== 'manifest.json')).toHaveLength(20);
    expect(fixture.support.state.downloadedBytes).toBeLessThanOrEqual(OFFLINE_LIMITS.defaultDownloadBytes);
    expect(fixture.store.records.size).toBeGreaterThan(0);
    expect(fixture.store.records.size).toBeLessThan(fixture.support.state.total);
    expect(JSON.stringify(fixture.save)).toBe(before);
    const requests = fixture.requests.length;
    await fixture.support.inspect();
    expect(fixture.requests).toHaveLength(requests);
    fixture.support.dispose(); fixture.loader.dispose();
  }, 20_000);

});

