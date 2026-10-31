import type { Backup } from './repository';
import type { HistoryLayout } from './history-codec';
import { collectHistory, decodeLayout } from './history-codec';
import { identifier, object } from './decode';
import { StorageFailure } from './transaction';

export interface PhysicalBackup {
  physicalExportVersion: 1;
  base: Omit<Backup, 'receipts' | 'issued'>;
  history: { generation: string; layout: HistoryLayout; receiptRows: unknown[]; receiptKeys: IDBValidKey[];
    issuedRows: unknown[]; issuedKeys: IDBValidKey[]; receiptBuckets: unknown[]; receiptBucketKeys: IDBValidKey[];
    issuedBuckets: unknown[]; issuedBucketKeys: IDBValidKey[] };
}
const bad = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason: `physical-backup-${reason}` }); };
function exact(value: Record<string, unknown>, names: string[]): void {
  if (Object.keys(value).length !== names.length || names.some(name => !Object.hasOwn(value, name))) bad('fields');
}
function list(value: unknown, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length > maximum || Reflect.ownKeys(value).length !== value.length + 1) return bad('array');
  const copy: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    if (!Object.prototype.propertyIsEnumerable.call(value, index)) bad('array-hole');
    copy[index] = value[index];
  }
  return copy;
}
/** Internal worker input only. Downloaded backups retain the canonical schemaVersion1 format. */
export function materializeBackup(input: unknown): unknown {
  const envelope = object(input);
  if (!Object.hasOwn(envelope, 'physicalExportVersion')) {
    if (!Object.hasOwn(envelope, 'schemaVersion') || envelope.application !== 'toadodu') return bad('family');
    return input;
  }
  if (envelope.physicalExportVersion !== 1) throw new StorageFailure({ kind: 'unsupported-future', reason: 'physical-backup' });
  exact(envelope, ['physicalExportVersion', 'base', 'history']);
  const base = object(envelope.base), history = object(envelope.history);
  exact(base, ['schemaVersion', 'application', 'preferences', 'profile', 'roles', 'attempts', 'pools', 'intents']);
  exact(history, ['generation', 'layout', 'receiptRows', 'receiptKeys', 'issuedRows', 'issuedKeys', 'receiptBuckets', 'receiptBucketKeys', 'issuedBuckets', 'issuedBucketKeys']);
  const generation = identifier(history.generation), layout = decodeLayout({ generation, layout: history.layout }, generation);
  for (const role of list(base.roles, 3)) if (object(role).generation !== generation) bad('generation');
  const receipts = collectHistory(layout, generation, 'receipt', list(history.receiptRows, 200_000), list(history.receiptKeys, 200_000) as IDBValidKey[],
    list(history.receiptBuckets, 256), list(history.receiptBucketKeys, 256) as IDBValidKey[]);
  const issued = collectHistory(layout, generation, 'issued', list(history.issuedRows, 400_000), list(history.issuedKeys, 400_000) as IDBValidKey[],
    list(history.issuedBuckets, 512), list(history.issuedBucketKeys, 512) as IDBValidKey[]);
  return { ...base, receipts, issued };
}
