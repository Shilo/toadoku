import { describe, expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { decodeBackup } from '../../src/lib/storage/repository';
import { parseBoundedJson } from '../../src/lib/storage/json';
import { attempt, definition, pools, preferences, profile, receipt } from './fixtures';
import type { Backup, IssuedRecord } from '../../src/lib/storage/repository';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { POOLS } from '../../src/lib/catalog/types';
import type { CatalogManifest, RecordTuple } from '../../src/lib/catalog/types';

describe('essential state capacity', () => {
  it('round-trips 100,000 issued groups and 10,000 canonical completion receipts', () => {
    const generation = 'capacity-generation';
    const states = pools().map(pool => ({ ...pool, cursor: pool.count, lifetimeIssued: pool.count }));
    const issued: IssuedRecord[] = Array.from({ length: 100_000 }, (_, index) => ({
      generation, id: index === 0 ? definition.id : index.toString(16).padStart(64, '0'),
      groupId: index === 0 ? definition.groupId : (index + 100_000).toString(16).padStart(64, '0'),
      catalogVersion: '1', pool: states[Math.floor(index / 20_000)].pool,
      firstAttemptId: `issued-${index}`, issues: index === 0 ? 10_000 : 1,
    }));
    const receipts = Array.from({ length: 10_000 }, (_, index) => receipt(attempt(generation, 'quick', `receipt-${index}`)));
    const total = receipts.reduce((sum, receipt) => sum + receipt.result.dewdrops, 0);
    const backup: Backup = { schemaVersion: 1, application: 'toadodu', preferences, profile: { ...profile, wallet: total, lifetimeEarned: total },
      roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role: role as 'quick' | 'frontier' | 'replay', revision: 0, lastIntentSeq: 0 })),
      attempts: [], pools: states, receipts, issued, intents: [],
    };
    const start = performance.now(); const text = JSON.stringify(backup); const serialized = performance.now();
    const parsed = parseBoundedJson(text); const parsedAt = performance.now(); const result = decodeBackup(parsed); const decodedAt = performance.now();
    expect(result.issued).toHaveLength(100_000); expect(result.receipts).toHaveLength(10_000); expect(result.profile.wallet).toBe(total);
    const report = { fixture: 'original synthetic IDs for shape/capacity, not catalog certification', bytes: new TextEncoder().encode(text).byteLength,
      issued: result.issued.length, receipts: result.receipts.length, serializeMs: serialized - start, parseMs: parsedAt - serialized,
      semanticDecodeMs: decodedAt - parsedAt, runtime: process.version, platform: process.platform };
    mkdirSync('prototypes/gameplay-validation/storage', { recursive: true });
    writeFileSync('prototypes/gameplay-validation/storage/capacity.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }, 30_000);
  it('prepares an actual catalog membership fixture for native worker and IndexedDB scale checks', async () => {
    const manifest = JSON.parse(readFileSync('public/catalog/v1/manifest.json', 'utf8')) as CatalogManifest;
    const loader = new CatalogLoader('https://storage-scale.test/catalog/v1/', { fetcher: async input => {
      const name = new URL(String(input)).pathname.split('/').at(-1)!;
      return new Response(new Uint8Array(readFileSync(`public/catalog/v1/${name}`)));
    } });
    const record = await loader.getRecord('easy', 0); expect(record.kind).toBe('ready');
    if (record.kind !== 'ready') throw new Error(record.reason);
    const generation = 'scale-generation';
    const issued: IssuedRecord[] = [];
    for (const pool of POOLS) for (const shard of manifest.pools[pool].shards) {
      const file = JSON.parse(readFileSync(`public/catalog/v1/${shard.path}`, 'utf8')) as { records: RecordTuple[] };
      for (const tuple of file.records) issued.push({ generation, id: tuple[0], groupId: tuple[1], catalogVersion: '1', pool,
        firstAttemptId: `issued-${issued.length}`, issues: 1 });
    }
    const receipts = Array.from({ length: 10_000 }, (_, index) => {
      const value = attempt(generation, 'quick', `native-scale-receipt-${index}`); value.definition = record.value;
      return receipt(value);
    });
    const total = receipts.reduce((sum, receipt) => sum + receipt.result.dewdrops, 0);
    const states = pools().map(pool => ({ ...pool, count: manifest.pools[pool.pool].count, cursor: manifest.pools[pool.pool].count, lifetimeIssued: manifest.pools[pool.pool].count }));
    const backup: Backup = { schemaVersion: 1, application: 'toadodu', preferences,
      profile: { ...profile, wallet: total, lifetimeEarned: total },
      roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role: role as 'quick' | 'frontier' | 'replay', revision: 0, lastIntentSeq: 0 })),
      attempts: [], pools: states, receipts, issued, intents: [],
    };
    // This is simulated capacity history using actual catalog IDs/proofs, not recorded player journeys.
    const text = JSON.stringify(decodeBackup(backup));
    mkdirSync('prototypes/gameplay-validation/storage', { recursive: true });
    writeFileSync('prototypes/gameplay-validation/storage/capacity-real.json', text);
    expect(issued).toHaveLength(100_000);
    loader.dispose();
  }, 30_000);
});
