import type { CompletionReceipt } from '../gameplay/contracts';
import type { IssuedRecord } from './repository';
import { decodeIssued } from './backup';
import { decodeReceipt, identifier, object, same } from './decode';
import { StorageFailure } from './transaction';

export type HistoryKind = 'id' | 'group' | 'receipt';
export type HistoryRecord = IssuedRecord | CompletionReceipt;
export type HistoryLayout = 'rows-v1' | 'buckets-v1';
export const BUCKET_COUNT_LIMIT = 1024;
export const BUCKET_BYTES_LIMIT = 512 * 1024;
export interface HistoryBucket { physicalVersion: 1; generation: string; kind: HistoryKind; bucket: string; items: HistoryRecord[] }
export interface HistoryOverflow { physicalVersion: 1; generation: string; kind: HistoryKind; id: string; record: HistoryRecord }
const bad = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason: `history-${reason}` }); };
const fields = (value: Record<string, unknown>, names: string[]) => { if (Object.keys(value).some(name => !names.includes(name))) bad('fields'); };
export function decodeLayout(value: unknown, generation: string): HistoryLayout {
  if (value === undefined) return bad('missing-layout');
  const input = object(value); fields(input, ['generation', 'layout']);
  if (input.generation !== generation) bad('generation');
  if (input.layout !== 'rows-v1' && input.layout !== 'buckets-v1') throw new StorageFailure({ kind: 'unsupported-future', reason: 'history-layout' });
  return input.layout;
}
export function recordId(kind: HistoryKind, record: HistoryRecord): string {
  return kind === 'receipt' ? (record as CompletionReceipt).attemptId : kind === 'group' ? record.groupId : record.id;
}
export function bucketId(kind: HistoryKind, id: string): string {
  identifier(id);
  if (kind !== 'receipt') {
    if (!/^[a-f0-9]{64}$/.test(id)) bad('hash');
    return id.slice(0, 2);
  }
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  return ((hash >>> 0) & 255).toString(16).padStart(2, '0');
}
export const bucketKey = (generation: string, kind: HistoryKind, id: string): [string, string] => [generation, `${kind}:${bucketId(kind, id)}`];
export const overflowKey = (generation: string, kind: HistoryKind, id: string): [string, string] => [generation, `overflow:${kind}:${id}`];
export const rowKey = (generation: string, kind: HistoryKind, id: string): [string, string] => [generation, kind === 'receipt' ? id : `${kind}:${id}`];
export const bucketStore = (kind: HistoryKind): string => kind === 'receipt' ? 'receiptBuckets' : 'issuedBuckets';
export const rowStore = (kind: HistoryKind): string => kind === 'receipt' ? 'receipts' : 'issued';
export function decodeHistoryRecord(value: unknown, generation: string, kind: HistoryKind, id?: string): HistoryRecord {
  const record = kind === 'receipt' ? decodeReceipt(value) : decodeIssued(value);
  if (record.generation !== generation || (id !== undefined && recordId(kind, record) !== id)) bad('record-binding');
  return record;
}
export function bucketBytes(value: HistoryBucket): number { return new TextEncoder().encode(JSON.stringify(value)).byteLength; }
export function emptyBucket(generation: string, kind: HistoryKind, id: string): HistoryBucket {
  return { physicalVersion: 1, generation, kind, bucket: bucketId(kind, id), items: [] };
}
export function decodeBucket(value: unknown, generation: string, kind: HistoryKind, id: string): HistoryBucket {
  if (value === undefined) return emptyBucket(generation, kind, id);
  return decodeStoredBucket(value, generation, kind, bucketId(kind, id));
}
export function decodeStoredBucket(value: unknown, generation: string, kind: HistoryKind, address: string): HistoryBucket {
  const input = object(value); fields(input, ['physicalVersion', 'generation', 'kind', 'bucket', 'items']);
  if (!/^[a-f0-9]{2}$/.test(address) || input.physicalVersion !== 1 || input.generation !== generation || input.kind !== kind || input.bucket !== address) bad('bucket-binding');
  if (!Array.isArray(input.items) || input.items.length > BUCKET_COUNT_LIMIT || Reflect.ownKeys(input.items).length !== input.items.length + 1) return bad('items');
  const rawItems = input.items as unknown[];
  const ids = new Set<string>();
  const items: HistoryRecord[] = [];
  for (let index = 0; index < rawItems.length; index++) {
    if (!Object.prototype.propertyIsEnumerable.call(rawItems, index)) bad('hole');
    const record = decodeHistoryRecord(rawItems[index], generation, kind), recordKey = recordId(kind, record);
    if (bucketId(kind, recordKey) !== input.bucket || ids.has(recordKey)) bad('duplicate-or-address');
    ids.add(recordKey); items.push(record);
  }
  const bucket = { physicalVersion: 1 as const, generation, kind, bucket: input.bucket as string, items };
  if (bucketBytes(bucket) > BUCKET_BYTES_LIMIT) bad('bytes');
  return bucket;
}
export function decodeOverflow(value: unknown, generation: string, kind: HistoryKind, id: string): HistoryRecord | undefined {
  if (value === undefined) return undefined;
  const input = object(value); fields(input, ['physicalVersion', 'generation', 'kind', 'id', 'record']);
  if (input.physicalVersion !== 1 || input.generation !== generation || input.kind !== kind || input.id !== id) bad('overflow-binding');
  return decodeHistoryRecord(input.record, generation, kind, id);
}
export function overflowRecord(generation: string, kind: HistoryKind, record: HistoryRecord): HistoryOverflow {
  return { physicalVersion: 1, generation, kind, id: recordId(kind, record), record };
}
/** Returns a whole replacement bucket, or an overflow row. Neither path drops records. */
export function putInBucket(bucket: HistoryBucket, record: HistoryRecord): { bucket?: HistoryBucket; overflow?: HistoryOverflow } {
  const id = recordId(bucket.kind, record), index = bucket.items.findIndex(item => recordId(bucket.kind, item) === id);
  const items = [...bucket.items];
  if (index >= 0) items[index] = record; else items.push(record);
  const next = { ...bucket, items };
  if (next.items.length <= BUCKET_COUNT_LIMIT && bucketBytes(next) <= BUCKET_BYTES_LIMIT) return { bucket: next };
  // An existing record that grows beyond the cap moves atomically to overflow.
  return { ...(index >= 0 ? { bucket: { ...bucket, items: bucket.items.filter((_, at) => at !== index) } } : {}),
    overflow: overflowRecord(bucket.generation, bucket.kind, record) };
}

export function collectHistory(layout: HistoryLayout, generation: string, category: 'issued' | 'receipt',
  rows: unknown[], keys: IDBValidKey[], buckets: unknown[], bucketKeys: IDBValidKey[]): HistoryRecord[] {
  if (rows.length !== keys.length || buckets.length !== bucketKeys.length) bad('key-count');
  const found = new Map<string, HistoryRecord>();
  const add = (kind: HistoryKind, id: string, record: HistoryRecord) => {
    const address = `${kind}:${id}`;
    if (found.has(address)) bad('duplicate-location');
    found.set(address, record);
  };
  const checkedKey = (value: IDBValidKey): string => {
    if (!Array.isArray(value) || value.length !== 2 || Reflect.ownKeys(value).length !== 3 || !Object.prototype.propertyIsEnumerable.call(value, 0) || !Object.prototype.propertyIsEnumerable.call(value, 1)
      || value[0] !== generation || typeof value[1] !== 'string') return bad('key');
    return value[1];
  };
  for (let index = 0; index < rows.length; index++) {
    const address = checkedKey(keys[index]);
    let kind: HistoryKind, id: string;
    if (layout === 'rows-v1') {
      kind = category === 'receipt' ? 'receipt' : address.startsWith('id:') ? 'id' : address.startsWith('group:') ? 'group' : bad('row-key');
      id = category === 'receipt' ? address : address.slice(kind.length + 1);
      add(kind, id, decodeHistoryRecord(rows[index], generation, kind, id));
    } else {
      const match = /^overflow:(id|group|receipt):(.+)$/.exec(address);
      if (!match || (category === 'receipt' ? match[1] !== 'receipt' : match[1] === 'receipt')) bad('overflow-key');
      kind = match![1] as HistoryKind; id = match![2];
      const record = decodeOverflow(rows[index], generation, kind, id);
      if (!record) bad('missing-overflow');
      add(kind, id, record!);
    }
  }
  if (layout === 'rows-v1' && buckets.length) bad('legacy-buckets');
  const seenBuckets = new Set<string>();
  for (let index = 0; index < buckets.length; index++) {
    const address = checkedKey(bucketKeys[index]), match = /^(id|group|receipt):([a-f0-9]{2})$/.exec(address);
    if (!match || (category === 'receipt' ? match[1] !== 'receipt' : match[1] === 'receipt')) bad('bucket-key');
    if (seenBuckets.has(address)) bad('duplicate-bucket');
    seenBuckets.add(address);
    const kind = match![1] as HistoryKind, bucket = decodeStoredBucket(buckets[index], generation, kind, match![2]);
    for (const record of bucket.items) add(kind, recordId(kind, record), record);
  }
  if (category === 'receipt') return [...found.values()];
  const result: HistoryRecord[] = [];
  for (const [address, record] of found) {
    const kind: HistoryKind = address.startsWith('id:') ? 'id' : 'group';
    const counterpart = found.get(kind === 'id' ? `group:${record.groupId}` : `id:${record.id}`);
    if (!counterpart || !same(record, counterpart)) bad('pair');
    if (kind === 'id') result.push(record);
  }
  return result;
}

export interface PhysicalHistoryRow { store: string; key: [string, string]; value: HistoryBucket | HistoryOverflow }
/** Input is the already validated backup DTO. Limits affect placement, never acceptance. */
export function packHistory(generation: string, kind: HistoryKind, records: readonly HistoryRecord[]): PhysicalHistoryRow[] {
  const buckets = new Map<string, { bucket: HistoryBucket; bytes: number }>(), overflow: PhysicalHistoryRow[] = [];
  const encoder = new TextEncoder();
  for (const record of records) {
    const id = recordId(kind, record), address = bucketId(kind, id);
    let state = buckets.get(address);
    if (!state) {
      const bucket = emptyBucket(generation, kind, id);
      state = { bucket, bytes: bucketBytes(bucket) }; buckets.set(address, state);
    }
    const extra = encoder.encode(JSON.stringify(record)).byteLength + (state.bucket.items.length ? 1 : 0);
    if (state.bucket.items.length < BUCKET_COUNT_LIMIT && state.bytes + extra <= BUCKET_BYTES_LIMIT) {
      state.bucket.items.push(record); state.bytes += extra;
    } else overflow.push({ store: rowStore(kind), key: overflowKey(generation, kind, id), value: overflowRecord(generation, kind, record) });
  }
  return [...[...buckets.values()].map(({ bucket }) => ({ store: bucketStore(kind),
    key: [generation, `${kind}:${bucket.bucket}`] as [string, string], value: bucket })), ...overflow];
}
