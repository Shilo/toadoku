import { expect, it } from 'vitest';
import { bucketId, collectHistory, decodeStoredBucket, emptyBucket, overflowRecord, recordId } from '../../src/lib/storage/history-codec';
import { decodeReceipt } from '../../src/lib/storage/decode';
import type { IssuedRecord } from '../../src/lib/storage/repository';
import { attempt, receipt } from './fixtures';

const generation = 'history-boundaries';
const issued: IssuedRecord = { generation, id: 'a'.repeat(64), groupId: 'b'.repeat(64), catalogVersion: '1', pool: 'easy', firstAttemptId: 'first', issues: 1 };
function corrupt(action: () => unknown) {
  let failure: unknown;
  try { action(); } catch (error) { failure = error; }
  expect(failure).toMatchObject({ issue: { kind: 'corrupt' } });
}
function sample() { return { ...receipt(attempt(generation)), id: 'different-receipt-id' }; }

it('pins receipt buckets to independent unsigned32 FNV1a bytes over valid ASCII identifiers', () => {
  // RFC9923 arithmetic, independently evaluated with BigInt modulo rather than Math.imul.
  const lowByte = (text: string) => {
    let value = 2166136261n;
    for (const byte of new TextEncoder().encode(text)) value = ((value ^ BigInt(byte)) * 16777619n) % 4294967296n;
    return Number(value % 256n).toString(16).padStart(2, '0');
  };
  expect(lowByte('a')).toBe('2c'); expect(lowByte('foobar')).toBe('68');
  for (const id of ['a', 'foobar', 'A_Z-9:.', 'a'.repeat(256), ...Array.from({ length: 32 }, (_, index) => `attempt-${index}`)])
    expect(bucketId('receipt', id)).toBe(lowByte(id));
});

it('uses attempt identity for receipt history even when its valid receipt ID differs', () => {
  const value = sample(); expect(decodeReceipt(value)).toEqual(value);
  expect(recordId('receipt', value)).toBe(value.attemptId);
  expect(collectHistory('rows-v1', generation, 'receipt', [value], [[generation, value.attemptId]], [], [])).toEqual([value]);
  corrupt(() => collectHistory('rows-v1', generation, 'receipt', [value], [[generation, value.id]], [], []));
  const overflow = overflowRecord(generation, 'receipt', value);
  expect(overflow.id).toBe(value.attemptId);
  expect(collectHistory('buckets-v1', generation, 'receipt', [overflow], [[generation, `overflow:receipt:${value.attemptId}`]], [], [])).toEqual([value]);
});

it('rejects an empty bucket at the wrong otherwise valid address', () => {
  const bucket = emptyBucket(generation, 'id', issued.id);
  expect(bucket.items).toEqual([]);
  corrupt(() => decodeStoredBucket(bucket, generation, 'id', 'ab'));
});

it('rejects a hidden existing item without a compensating extra property', () => {
  const items = [issued]; Object.defineProperty(items, 0, { enumerable: false });
  expect(Reflect.ownKeys(items)).toEqual(['0', 'length']);
  corrupt(() => decodeStoredBucket({ ...emptyBucket(generation, 'id', issued.id), items }, generation, 'id', 'aa'));
});

it('classifies mismatched physical counts and malformed primary keys as corruption', () => {
  const value = sample();
  corrupt(() => collectHistory('rows-v1', generation, 'receipt', [value], [], [], []));
  corrupt(() => collectHistory('buckets-v1', generation, 'receipt', [], [], [emptyBucket(generation, 'receipt', value.attemptId)], []));
  const invalid: IDBValidKey[] = ['not-a-tuple', [generation], [generation, value.attemptId, 'extra'], ['foreign', value.attemptId], [generation, 0], [generation, [value.attemptId]]];
  for (const key of invalid) corrupt(() => collectHistory('rows-v1', generation, 'receipt', [value], [key], [], []));
  const trailingHole = [generation, value.attemptId]; trailingHole.length = 3; Object.freeze(trailingHole);
  expect(Reflect.ownKeys(trailingHole)).toEqual(['0', '1', 'length']);
  corrupt(() => collectHistory('rows-v1', generation, 'receipt', [value], [trailingHole], [], []));
  corrupt(() => collectHistory('rows-v1', generation, 'issued', [issued], [[generation, 0]], [], []));
  expect(trailingHole.length).toBe(3); expect(2 in trailingHole).toBe(false);
  for (const index of [0, 1]) {
    const key = [generation, value.attemptId]; Object.defineProperty(key, index, { enumerable: false });
    corrupt(() => collectHistory('rows-v1', generation, 'receipt', [value], [key], [], []));
  }
  corrupt(() => collectHistory('rows-v1', generation, 'receipt', [{ ...value, generation: 'foreign' }], [[generation, value.attemptId]], [], []));
});

it('rejects decorated overflow and bucket addresses without relying on missing records', () => {
  const value = sample(), overflow = overflowRecord(generation, 'receipt', value);
  const overflowAddress = `overflow:receipt:${value.attemptId}`, address = `receipt:${bucketId('receipt', value.attemptId)}`;
  const bucket = emptyBucket(generation, 'receipt', value.attemptId);
  for (const decorate of [(text: string) => `x${text}`, (text: string) => `${text}x`, (text: string) => `${text}\n`]) {
    corrupt(() => collectHistory('buckets-v1', generation, 'receipt', [overflow], [[generation, decorate(overflowAddress)]], [], []));
    corrupt(() => collectHistory('buckets-v1', generation, 'receipt', [], [], [bucket], [[generation, decorate(address)]]));
  }
});

it('preserves equal concrete and group projections and rejects a divergent counterpart', () => {
  const keys = [[generation, `id:${issued.id}`], [generation, `group:${issued.groupId}`]];
  expect(collectHistory('rows-v1', generation, 'issued', [issued, structuredClone(issued)], keys, [], [])).toEqual([issued]);
  corrupt(() => collectHistory('rows-v1', generation, 'issued', [issued, { ...issued, issues: 2 }], keys, [], []));
  const malformed = [[generation, 'id:' + issued.id], [generation, 'wrong:' + issued.groupId]];
  const before = structuredClone(malformed);
  malformed.forEach(Object.freeze); Object.freeze(malformed);
  corrupt(() => collectHistory('rows-v1', generation, 'issued', [issued, structuredClone(issued)], malformed, [], []));
  expect(malformed).toEqual(before);
});
