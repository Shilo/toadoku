import { describe, expect, it } from 'vitest';
import {
  BUCKET_BYTES_LIMIT, BUCKET_COUNT_LIMIT, bucketBytes, bucketId, bucketKey, bucketStore,
  collectHistory, decodeBucket, decodeHistoryRecord, decodeLayout, decodeOverflow, decodeStoredBucket,
  emptyBucket, overflowKey, overflowRecord, packHistory, putInBucket, recordId, rowKey, rowStore,
} from '../../src/lib/storage/history-codec';
import type { HistoryBucket } from '../../src/lib/storage/history-codec';
import type { IssuedRecord } from '../../src/lib/storage/repository';
import { attempt, definition, receipt } from './fixtures';

const generation = 'history-generation';
function issued(index = 1): IssuedRecord {
  return { generation, id: `ab${index.toString(16).padStart(62, '0')}`, groupId: `cd${index.toString(16).padStart(62, '0')}`,
    catalogVersion: '1', pool: 'easy', firstAttemptId: 'a', issues: 1 };
}
function sample() { return receipt(attempt(generation)); }
const fails = (run: () => unknown, kind = 'corrupt') => {
  let failure: unknown; try { run(); } catch (error) { failure = error; }
  expect(failure).toMatchObject({ issue: { kind } });
};

describe('versioned bounded physical history codec', () => {
  it('keeps legacy, new and unsupported layouts explicit', () => {
    fails(() => decodeLayout(undefined, generation));
    for (const layout of ['rows-v1', 'buckets-v1']) expect(decodeLayout({ generation, layout }, generation)).toBe(layout);
    fails(() => decodeLayout({ generation, layout: 'future' }, generation), 'unsupported-future');
    for (const input of [{ generation: 'other', layout: 'rows-v1' }, { generation, layout: 'rows-v1', extra: true }]) fails(() => decodeLayout(input, generation));
    expect(bucketKey(generation, 'id', issued().id)).toEqual([generation, 'id:ab']);
    expect(overflowKey(generation, 'group', issued().groupId)).toEqual([generation, `overflow:group:${issued().groupId}`]);
    expect(rowKey(generation, 'receipt', 'a')).toEqual([generation, 'a']);
    expect(rowKey(generation, 'group', 'b')).toEqual([generation, 'group:b']);
    expect(bucketStore('receipt')).toBe('receiptBuckets'); expect(bucketStore('id')).toBe('issuedBuckets');
    expect(rowStore('receipt')).toBe('receipts'); expect(rowStore('group')).toBe('issued');
    expect(recordId('receipt', sample())).toBe(sample().attemptId); expect(recordId('group', issued())).toBe(issued().groupId);
    fails(() => bucketId('id', 'not-a-hash')); fails(() => bucketId('receipt', 'bad space'));
    for (const id of [`x${issued().id}`, `${issued().id}x`]) fails(() => bucketId('id', id));
    expect(bucketId('receipt', '__proto__')).toMatch(/^[a-f0-9]{2}$/);
  });
  it('validates every bucket row and all address/schema/array bindings', () => {
    const value = issued(), bucket = putInBucket(emptyBucket(generation, 'id', value.id), value).bucket!;
    expect(decodeBucket(undefined, generation, 'id', value.id).items).toEqual([]);
    expect(decodeBucket(bucket, generation, 'id', value.id)).toEqual(bucket);
    for (const changed of [{ ...bucket, physicalVersion: 2 }, { ...bucket, generation: 'other' }, { ...bucket, kind: 'group' },
      { ...bucket, bucket: '00' }, { ...bucket, extra: 1 }, { ...bucket, items: null }, { ...bucket, items: [value, value] },
      { ...bucket, items: [{ ...value, id: 'ff'.repeat(32) }] }, { ...bucket, items: [{ ...value, generation: 'other' }] }]) fails(() => decodeBucket(changed, generation, 'id', value.id));
    fails(() => decodeStoredBucket(bucket, generation, 'id', 'wrong'));
    for (const address of ['xab', 'abx']) fails(() => decodeStoredBucket({ ...bucket, bucket: address, items: [] }, generation, 'id', address));
    const sparse = [value, value]; delete sparse[0]; Object.assign(sparse, { extra: true });
    fails(() => decodeBucket({ ...bucket, items: sparse }, generation, 'id', value.id));
    const hidden = [value]; Object.defineProperty(hidden, 0, { enumerable: false }); Object.assign(hidden, { extra: true });
    fails(() => decodeBucket({ ...bucket, items: hidden }, generation, 'id', value.id));
    for (const name of ['hidden', Symbol('extra'), 'map']) {
      const items = [value]; Object.defineProperty(items, name, { value: 1 }); fails(() => decodeBucket({ ...bucket, items }, generation, 'id', value.id));
    }
    fails(() => decodeHistoryRecord(value, generation, 'id', issued(2).id));
    fails(() => decodeHistoryRecord({ ...value, issues: 0 }, generation, 'id'));
  });
  it('validates overflow wrappers without treating a false value as absence', () => {
    const value = issued(), overflow = overflowRecord(generation, 'id', value);
    expect(decodeOverflow(undefined, generation, 'id', value.id)).toBeUndefined();
    expect(decodeOverflow(overflow, generation, 'id', value.id)).toEqual(value);
    for (const changed of [null, 0, { ...overflow, physicalVersion: 2 }, { ...overflow, generation: 'other' }, { ...overflow, kind: 'receipt' },
      { ...overflow, id: issued(2).id }, { ...overflow, extra: 1 }, { ...overflow, record: { ...value, id: issued(2).id } }]) fails(() => decodeOverflow(changed, generation, 'id', value.id));
    expect(decodeHistoryRecord(sample(), generation, 'receipt')).toEqual(sample());
  });
  it('keeps the exact count cap and moves cap+1 to recoverable overflow', () => {
    const records = Array.from({ length: BUCKET_COUNT_LIMIT + 1 }, (_, index) => issued(index));
    const rows = packHistory(generation, 'id', records);
    expect(rows).toHaveLength(2);
    const bucket = rows[0].value as HistoryBucket;
    expect(bucket.items).toHaveLength(BUCKET_COUNT_LIMIT); expect(bucketBytes(bucket)).toBeLessThanOrEqual(BUCKET_BYTES_LIMIT);
    expect(decodeBucket(bucket, generation, 'id', records[0].id)).toEqual(bucket);
    fails(() => decodeBucket({ ...bucket, items: records }, generation, 'id', records[0].id));
    expect(putInBucket(bucket, records.at(-1)!)).toEqual({ overflow: overflowRecord(generation, 'id', records.at(-1)!) });
    const updated = { ...records[0], issues: 2 };
    expect(putInBucket(bucket, updated).bucket!.items[0]).toEqual(updated);
    expect(putInBucket(emptyBucket(generation, 'id', records[0].id), records[0]).bucket!.items).toEqual([records[0]]);
  });
  it('accepts exact byte cap and moves an existing record that grows by one byte', () => {
    const items = Array.from({ length: 1024 }, (_, index) => ({ ...issued(index), firstAttemptId: 'a'.repeat(256) }));
    const bucket = { ...emptyBucket(generation, 'id', items[0].id), items };
    let remaining = BUCKET_BYTES_LIMIT - bucketBytes(bucket);
    expect(remaining).toBeGreaterThan(0);
    for (const item of items) { const delta = Math.min(remaining, 15); item.issues = 10 ** delta; remaining -= delta; }
    const original = [...items].reverse().find(item => item.issues === 1)!;
    const originalIndex = items.indexOf(original);
    [items[0], items[originalIndex]] = [items[originalIndex], items[0]];
    expect(items[0]).toBe(original);
    expect(remaining).toBe(0); expect(bucketBytes(bucket)).toBe(BUCKET_BYTES_LIMIT);
    expect(decodeBucket(bucket, generation, 'id', items[0].id).items).toHaveLength(1024);
    const changed = { ...original, issues: 10 };
    const next = putInBucket(bucket, changed);
    expect(next.overflow!.record).toEqual(changed); expect(next.bucket!.items).toHaveLength(1023);
    expect(next.bucket!.items.some(item => item.id === original.id)).toBe(false);
    const tooLarge = { ...bucket, items: items.map(item => item.id === original.id ? changed : item) };
    expect(bucketBytes(tooLarge)).toBe(BUCKET_BYTES_LIMIT + 1);
    fails(() => decodeBucket(tooLarge, generation, 'id', items[0].id));
  });
  it('packs byte-limited receipt histories and preserves all colliding overflow records', () => {
    const records = [], address = bucketId('receipt', 'attempt-0');
    for (let index = 0; records.length < 800; index++) {
      const id = `attempt-${index}`;
      if (bucketId('receipt', id) === address) records.push(receipt(attempt(generation, 'quick', id)));
    }
    const rows = packHistory(generation, 'receipt', records), buckets = rows.filter(row => row.store === 'receiptBuckets'), overflow = rows.filter(row => row.store === 'receipts');
    expect(buckets).toHaveLength(1); expect(overflow.length).toBeGreaterThan(0);
    const bucket = buckets[0].value as HistoryBucket; expect(bucketBytes(bucket)).toBeLessThanOrEqual(BUCKET_BYTES_LIMIT);
    const decoded = collectHistory('buckets-v1', generation, 'receipt', overflow.map(row => row.value), overflow.map(row => row.key), buckets.map(row => row.value), buckets.map(row => row.key));
    expect(decoded).toHaveLength(records.length);
    expect(new Set(decoded.map(row => row.id)).size).toBe(records.length);
    const crowded = { ...bucket, items: [...bucket.items, ...overflow.map(row => ('record' in row.value ? row.value.record : row.value.items[0]))] };
    fails(() => decodeStoredBucket(crowded, generation, 'receipt', address));
    const long = { ...bucket.items[0], definition: { ...definition, sourceId: 'a'.repeat(256) } };
    const moved = putInBucket({ ...bucket, items: [long, ...bucket.items.slice(1)] }, long);
    expect(moved.bucket || moved.overflow).toBeTruthy();
  });
  it('collects legacy paired projections and rejects wrong keys or inconsistent pairs', () => {
    const value = issued(), keys = [rowKey(generation, 'id', value.id), rowKey(generation, 'group', value.groupId)];
    expect(collectHistory('rows-v1', generation, 'issued', [value, value], keys, [], [])).toEqual([value]);
    expect(collectHistory('rows-v1', generation, 'receipt', [sample()], [[generation, sample().id]], [], [])).toEqual([sample()]);
    for (const run of [
      () => collectHistory('rows-v1', generation, 'issued', [value], keys, [], []),
      () => collectHistory('rows-v1', generation, 'issued', [], [keys[0]], [], []),
      () => collectHistory('buckets-v1', generation, 'issued', [], [], [], [bucketKey(generation, 'id', value.id)]),
      () => collectHistory('rows-v1', generation, 'issued', [], [], [value], []),
      () => collectHistory('rows-v1', generation, 'issued', [value], [['wrong', 'id:a']], [], []),
      () => collectHistory('rows-v1', generation, 'issued', [value], ['bad'], [], []),
      () => collectHistory('rows-v1', generation, 'issued', [value], [[generation, 'wrong']], [], []),
      () => collectHistory('rows-v1', generation, 'issued', [value], [keys[0]], [], []),
      () => collectHistory('rows-v1', generation, 'issued', [value], [keys[1]], [], []),
      () => collectHistory('rows-v1', generation, 'issued', [value, { ...value, issues: 2 }], keys, [], []),
    ]) fails(run);
  });
  it('rejects bucket/overflow duplicates rather than choosing a winner', () => {
    const value = issued(), idBucket = putInBucket(emptyBucket(generation, 'id', value.id), value).bucket!,
      groupBucket = putInBucket(emptyBucket(generation, 'group', value.groupId), value).bucket!;
    const buckets = [idBucket, groupBucket], keys = [bucketKey(generation, 'id', value.id), bucketKey(generation, 'group', value.groupId)];
    expect(collectHistory('buckets-v1', generation, 'issued', [], [], buckets, keys)).toEqual([value]);
    fails(() => collectHistory('buckets-v1', generation, 'issued', [overflowRecord(generation, 'id', value)], [overflowKey(generation, 'id', value.id)], buckets, keys));
    for (const address of ['wrong', 'receipt:ab', 'id:gg']) fails(() => collectHistory('buckets-v1', generation, 'issued', [], [], [idBucket], [[generation, address]]));
    fails(() => collectHistory('buckets-v1', generation, 'receipt', [], [], [idBucket], [[generation, 'id:ab']]));
    const emptyReceipt = emptyBucket(generation, 'receipt', sample().attemptId);
    fails(() => collectHistory('buckets-v1', generation, 'issued', [], [], [emptyReceipt], [bucketKey(generation, 'receipt', sample().attemptId)]));
    fails(() => collectHistory('rows-v1', generation, 'issued', [], [], [idBucket], [keys[0]]));
    for (const address of ['wrong', `overflow:receipt:${value.id}`]) fails(() => collectHistory('buckets-v1', generation, 'issued', [overflowRecord(generation, 'id', value)], [[generation, address]], [], []));
    fails(() => collectHistory('buckets-v1', generation, 'receipt', [overflowRecord(generation, 'id', value)], [overflowKey(generation, 'id', value.id)], [], []));
    fails(() => collectHistory('buckets-v1', generation, 'issued', [undefined], [overflowKey(generation, 'id', value.id)], [], []));
  });
});
