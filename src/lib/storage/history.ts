import type { TransactionContext } from './transaction';
import { StorageFailure } from './transaction';
import {
  bucketKey, bucketStore, decodeBucket, decodeHistoryRecord, decodeLayout, decodeOverflow,
  overflowKey, overflowRecord, putInBucket, recordId, rowKey, rowStore,
} from './history-codec';
import type { HistoryKind, HistoryLayout, HistoryRecord } from './history-codec';

export interface HistorySlot {
  value?: HistoryRecord;
  put(record: HistoryRecord, add?: boolean): void;
}
export function historyLayout<T>(context: TransactionContext<T>, generation: string, accept: (layout: HistoryLayout) => void): void {
  context.request(context.store('meta').get([generation, 'layout']), value => accept(decodeLayout(value, generation)));
}
/** All reads and whole-bucket writes stay inside the caller's existing atomic transaction. */
export function historySlot<T>(context: TransactionContext<T>, generation: string, kind: HistoryKind, id: string,
  accept: (slot: HistorySlot) => void, layout?: HistoryLayout): void {
  if (!layout) { historyLayout(context, generation, value => historySlot(context, generation, kind, id, accept, value)); return; }
  const rows = context.store(rowStore(kind));
  if (layout === 'rows-v1') {
    context.request(rows.get(rowKey(generation, kind, id)), value => accept({
      value: value === undefined ? undefined : decodeHistoryRecord(value, generation, kind, id),
      put: (record, add) => { if (add) rows.add(record, rowKey(generation, kind, id)); else rows.put(record, rowKey(generation, kind, id)); },
    }));
    return;
  }
  const buckets = context.store(bucketStore(kind));
  context.request(buckets.get(bucketKey(generation, kind, id)), rawBucket => {
    const bucket = decodeBucket(rawBucket, generation, kind, id);
    context.request(rows.get(overflowKey(generation, kind, id)), rawOverflow => {
      const overflow = decodeOverflow(rawOverflow, generation, kind, id);
      const contained = bucket.items.find(item => recordId(kind, item) === id);
      if (contained && overflow) throw new StorageFailure({ kind: 'corrupt', reason: 'history-duplicate-location' });
      accept({ value: contained ?? overflow, put: (record, add) => {
        if (record.generation !== generation || recordId(kind, record) !== id) throw new StorageFailure({ kind: 'corrupt', reason: 'history-write-binding' });
        if (add && (contained || overflow)) throw new StorageFailure({ kind: 'corrupt', reason: 'history-duplicate-add' });
        if (overflow) { rows.put(overflowRecord(generation, kind, record), overflowKey(generation, kind, id)); return; }
        const next = putInBucket(bucket, record);
        if (next.bucket) buckets.put(next.bucket, bucketKey(generation, kind, id));
        if (next.overflow) rows.put(next.overflow, overflowKey(generation, kind, id));
      } });
    });
  });
}
