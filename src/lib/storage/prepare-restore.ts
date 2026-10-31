import type { Backup } from './repository';
import { frontierGrantId } from '../modes';
import { identifier, object } from './decode';
import { packHistory } from './history-codec';
import { StorageFailure } from './transaction';
import { POOLS } from '../catalog/types';

const STORES = ['settings', 'profile', 'roles', 'attempts', 'pools', 'receipts', 'receiptBuckets', 'grants', 'intents', 'issued', 'issuedBuckets'] as const;
export interface RestoreRow { store: typeof STORES[number]; key: IDBValidKey; value: unknown }
export interface PreparedRestore { preparedRestoreVersion: 1; generation: string; rows: RestoreRow[]; packingMs: number }
export interface RestoreCounts { receipt: number; id: number; group: number; grants: number; intents: number; attempts: number }
const key = (generation: string, id: string): [string, string] => [generation, id];
/** Receives the canonical, fully validated backup in the existing validation worker. */
export function prepareRestoreRows(backup: Backup, generation: string): PreparedRestore {
  identifier(generation); const started = performance.now();
  const rewrite = <T extends { generation: string }>(item: T): T => ({ ...item, generation });
  const receipts = backup.receipts.map(receipt => ({ ...rewrite(receipt),
    ...(receipt.grantId ? { grantId: frontierGrantId(generation, receipt.binding!) } : {}) }));
  const rows = [
    { store: 'settings', key: generation, value: { ...backup.preferences, generation } },
    { store: 'profile', key: generation, value: { ...backup.profile, generation } },
    ...backup.roles.map(item => ({ store: 'roles', key: key(generation, item.role), value: rewrite(item) })),
    ...backup.attempts.map(item => ({ store: 'attempts', key: key(generation, item.id), value: rewrite(item) })),
    ...backup.pools.map(item => ({ store: 'pools', key: key(generation, item.pool), value: { ...item, generation } })),
    ...packHistory(generation, 'receipt', receipts),
    ...receipts.filter(item => item.grantId).map(item => ({ store: 'grants', key: key(generation, item.grantId!), value: { generation, grantId: item.grantId, attemptId: item.attemptId } })),
    ...backup.intents.map(item => ({ store: 'intents', key: key(generation, item.id), value: rewrite(item) })),
    ...packHistory(generation, 'id', backup.issued.map(rewrite)),
    ...packHistory(generation, 'group', backup.issued.map(rewrite)),
  ] as RestoreRow[];
  return { preparedRestoreVersion: 1, generation, rows, packingMs: performance.now() - started };
}

export function captureRestoreCounts(backup: Backup): RestoreCounts {
  const count = (value: unknown): unknown[] => {
    if (!Array.isArray(value) || value.length > 200_000 || Reflect.ownKeys(value).length !== value.length + 1) throw new StorageFailure({ kind: 'corrupt', reason: 'restore-source-count' });
    for (let index = 0; index < value.length; index++) if (!Object.prototype.propertyIsEnumerable.call(value, index)) throw new StorageFailure({ kind: 'corrupt', reason: 'restore-source-hole' });
    return value;
  };
  const receipts = count(backup.receipts), issued = count(backup.issued), intents = count(backup.intents), attempts = count(backup.attempts);
  let grants = 0;
  for (let index = 0; index < receipts.length; index++) if (object(receipts[index]).grantId !== undefined) grants++;
  return { receipt: receipts.length, id: issued.length, group: issued.length, grants, intents: intents.length, attempts: attempts.length };
}

/** Check the request's generation before creating even an inactive stage header. */
export function validatePreparedRestore(input: unknown, generation: string, expected: RestoreCounts): PreparedRestore {
  const bad = (): never => { throw new StorageFailure({ kind: 'corrupt', reason: 'prepared-restore-binding' }); };
  const value = object(input);
  if (value.preparedRestoreVersion !== 1 || value.generation !== generation || typeof value.packingMs !== 'number' || !Number.isFinite(value.packingMs) || value.packingMs < 0
    || Object.keys(value).some(name => !['preparedRestoreVersion', 'generation', 'rows', 'packingMs'].includes(name))) bad();
  if (!Array.isArray(value.rows) || value.rows.length > 1_001_000 || Reflect.ownKeys(value.rows).length !== value.rows.length + 1) return bad();
  const rows = value.rows as unknown[];
  const seen = new Set<string>(), essential = new Set(['settings', 'profile', 'roles:quick', 'roles:frontier', 'roles:replay', ...POOLS.map(pool => `pools:${pool}`)]);
  const counts: RestoreCounts = { receipt: 0, id: 0, group: 0, grants: 0, intents: 0, attempts: 0 };
  for (let index = 0; index < rows.length; index++) {
    if (!Object.prototype.propertyIsEnumerable.call(rows, index)) bad();
    const row = object(rows[index]);
    if (!STORES.includes(row.store as typeof STORES[number]) || Object.keys(row).length !== 3 || !Object.hasOwn(row, 'key') || !Object.hasOwn(row, 'value')
      || object(row.value).generation !== generation) bad();
    const record = object(row.value);
    if (row.store === 'settings' || row.store === 'profile') { if (row.key !== generation) bad(); essential.delete(row.store); }
    else {
      if (!Array.isArray(row.key) || row.key.length !== 2 || Reflect.ownKeys(row.key).length !== 3
      || !Object.prototype.propertyIsEnumerable.call(row.key, 0) || !Object.prototype.propertyIsEnumerable.call(row.key, 1)
      || row.key[0] !== generation || typeof row.key[1] !== 'string') bad();
      const id = (row.key as IDBValidKey[])[1] as string;
      if (row.store === 'roles' || row.store === 'pools') {
        const address = `${row.store}:${id}`;
        if (!essential.has(address) || id !== record[row.store === 'roles' ? 'role' : 'pool']) bad(); essential.delete(address);
      } else if (row.store === 'issuedBuckets' || row.store === 'receiptBuckets') {
        const kind = record.kind;
        if (record.physicalVersion !== 1 || (row.store === 'receiptBuckets' ? kind !== 'receipt' : kind !== 'id' && kind !== 'group')
          || !Array.isArray(record.items) || record.items.length > 1024 || id !== `${kind}:${record.bucket}`) bad();
        counts[kind as 'id' | 'group' | 'receipt'] += (record.items as unknown[]).length;
      } else if (row.store === 'issued' || row.store === 'receipts') {
        const kind = record.kind;
        if (record.physicalVersion !== 1 || (row.store === 'receipts' ? kind !== 'receipt' : kind !== 'id' && kind !== 'group') || id !== `overflow:${kind}:${record.id}`) bad();
        counts[kind as 'id' | 'group' | 'receipt']++;
      } else {
        if (id !== record[row.store === 'grants' ? 'grantId' : 'id']) bad(); counts[row.store as 'grants' | 'intents' | 'attempts']++;
      }
    }
    const address = `${row.store}:${JSON.stringify(row.key)}`;
    if (seen.has(address)) bad(); seen.add(address);
  }
  if (essential.size || (Object.keys(counts) as (keyof RestoreCounts)[]).some(kind => counts[kind] !== expected[kind])) bad();
  return value as unknown as PreparedRestore;
}
