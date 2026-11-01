import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeManifest, decodeShard, decodeTuple } from '../../src/lib/catalog/decode.ts';
import type { CatalogManifest, PoolId, ShardDescriptor } from '../../src/lib/catalog/types.ts';

const manifest = JSON.parse(readFileSync('public/catalog/v1/manifest.json', 'utf8')) as CatalogManifest;
const descriptor = manifest.pools.easy.shards[0];
const shard = JSON.parse(readFileSync(`public/catalog/v1/${descriptor.path}`, 'utf8'));

describe('independent catalog schema attacks', () => {
  it('rejects malformed manifest structure, quotas, ranges and payload descriptors', () => {
    expect(decodeManifest(structuredClone(manifest)).pools.easy.count).toBeGreaterThanOrEqual(25000);
    for (const value of [null, [], {}, { ...manifest, schemaVersion: 2 }, { ...manifest, sourceHashes: {} }, { ...manifest, pools: {} }]) expect(() => decodeManifest(value)).toThrow();
    const mutations = [
      (value: CatalogManifest) => { Object.assign(value.pools, { easy: { ...value.pools.easy, count: 999 } }); },
      (value: CatalogManifest) => { Object.assign(value.pools, { easy: { ...value.pools.easy, shards: [] } }); },
      (value: CatalogManifest) => { Object.assign(value.pools.easy.shards[0], { recordRoot: 'bad' }); },
      (value: CatalogManifest) => { Object.assign(value.pools.easy.shards[0], { start: 1 }); },
      (value: CatalogManifest) => { Object.assign(value.pools.easy.shards[0], { count: 257 }); },
      (value: CatalogManifest) => { Object.assign(value.pools.easy.shards[0], { bytes: 98305 }); },
      (value: CatalogManifest) => { Object.assign(value.pools.easy.shards[0], { path: 'https://evil.test/x' }); },
      (value: CatalogManifest) => { Object.assign(value.pools.easy, { unexpected: true }); },
    ];
    for (const mutate of mutations) { const value = structuredClone(manifest); mutate(value); expect(() => decodeManifest(value)).toThrow(); }
    const insufficient = structuredClone(manifest);
    for (const pool of Object.keys(insufficient.pools) as PoolId[]) {
      const shards: ShardDescriptor[] = [];
      for (let start = 0; start < 1000; start += 200) shards.push({ pool, start, count: 200, bytes: 1, recordRoot: 'a'.repeat(64), sha256: 'b'.repeat(64), path: `${pool}-${start}-${'b'.repeat(16)}.json` });
      Object.assign(insufficient.pools, { [pool]: { count: 1000, shards } });
    }
    expect(() => decodeManifest(insufficient)).toThrow('catalog quotas');
  });
  it('checks tuple solution units and clues independently of fullness', () => {
    const tuple = structuredClone(shard.records[0]);
    expect(decodeTuple(tuple, 'easy').givens).toBe(tuple[3]);
    const maskedHole = structuredClone(tuple); delete maskedHole[0]; Object.assign(maskedHole, { extra: 0 });
    expect(() => decodeTuple(maskedHole, 'easy')).toThrow();
    for (const [index, replacement] of [[0, 'bad'], [1, 'bad'], [2, 'wrong'], [3, '.'.repeat(81)], [4, '1'.repeat(81)], [5, 50], [6, 3]] as const) {
      const bad = structuredClone(tuple); bad[index] = replacement;
      expect(() => decodeTuple(bad, 'easy')).toThrow('catalog record');
    }
    const full = structuredClone(tuple); full[3] = full[4]; expect(() => decodeTuple(full, 'easy')).toThrow();
    const wrongClue = structuredClone(tuple);
    const firstGiven = [...wrongClue[3] as string].findIndex(digit => digit !== '0');
    const digits = [...wrongClue[3] as string]; digits[firstGiven] = String(Number(wrongClue[4][firstGiven]) % 9 + 1); wrongClue[3] = digits.join('');
    expect(() => decodeTuple(wrongClue, 'easy')).toThrow();
    for (const solution of ['123456789'.repeat(9), Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) + cell % 9) % 9 + 1).join('')]) {
      const wrongUnits = structuredClone(tuple); wrongUnits[3] = '0'.repeat(81); wrongUnits[4] = solution;
      expect(() => decodeTuple(wrongUnits, 'easy')).toThrow();
    }
    expect(() => decodeTuple(tuple, 'hard-high')).toThrow();
  });
  it('rejects altered shard versions/counts and both concrete/equivalence duplicates', () => {
    expect(decodeShard(structuredClone(shard), descriptor)).toHaveLength(descriptor.count);
    for (const value of [null, [], { ...shard, records: [] }, { ...shard, schemaVersion: 2 }, { ...shard, start: 1 }, { ...shard, pool: 'hard-low' }]) expect(() => decodeShard(value, descriptor)).toThrow();
    const duplicate = structuredClone(shard); duplicate.records[1] = duplicate.records[0]; expect(() => decodeShard(duplicate, descriptor)).toThrow('duplicate shard identities');
    const duplicateGroup = structuredClone(shard); duplicateGroup.records[1][1] = duplicateGroup.records[0][1]; expect(() => decodeShard(duplicateGroup, descriptor)).toThrow('duplicate shard identities');
  });
});
