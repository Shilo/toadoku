import type { StorageResult } from '../gameplay/contracts';
import { RECOVERY_LIMITS, recoveryLimit, recoveryLimits } from './raw-recovery-codec';
import type { RecoveryLimits } from './raw-recovery-codec';
import { StorageFailure, storageFailure, transact } from './transaction';
import { recoveryDatabaseName } from './namespace';

export interface RawStore {
  name: string; keyPath: string | string[] | null; autoIncrement: boolean;
  indexes: { name: string; keyPath: string | string[]; unique: boolean; multiEntry: boolean }[];
  keys: IDBValidKey[]; values: unknown[];
}
export interface RawSnapshot { databaseName: string; databaseVersion: number; capturedAt: string; records: number; stores: RawStore[] }
async function snapshot(database: IDBDatabase, limits: RecoveryLimits): Promise<StorageResult<RawSnapshot>> {
  const names = Array.from(database.objectStoreNames);
  if (names.length > limits.stores) recoveryLimit('stores');
  const header = { databaseName: database.name, databaseVersion: database.version, capturedAt: new Date().toISOString() };
  if (!names.length) return { kind: 'committed', value: { ...header, records: 0, stores: [] } };
  return transact<RawSnapshot>(database, names, 'readonly', context => {
    const stores: RawStore[] = names.map(name => {
      const store = context.store(name), indexNames = Array.from(store.indexNames);
      if (indexNames.length > limits.indexes) recoveryLimit('indexes');
      return { name, keyPath: store.keyPath, autoIncrement: store.autoIncrement,
        indexes: indexNames.map(name => { const index = store.index(name); return { name, keyPath: index.keyPath, unique: index.unique, multiEntry: index.multiEntry }; }),
        keys: [], values: [] };
    });
    let counted = 0, records = 0;
    for (const store of stores) context.request(context.store(store.name).count(), count => {
      records += count; if (records > limits.records) recoveryLimit('records');
      if (++counted !== stores.length) return;
      let remaining = stores.length * 2;
      const received = () => {
        if (--remaining) return;
        if (stores.some(store => store.keys.length !== store.values.length) || stores.reduce((sum, store) => sum + store.keys.length, 0) !== records) {
          throw new StorageFailure({ kind: 'corrupt', reason: 'raw-recovery-snapshot-count' });
        }
        context.result({ ...header, records, stores });
      };
      for (const store of stores) {
        context.request(context.store(store.name).getAllKeys(), keys => { store.keys = keys; received(); });
        context.request(context.store(store.name).getAll(), values => { store.values = values; received(); });
      }
    });
  });
}

/** Existing application namespace only. An absent database's creation transaction is aborted. */
export async function readRawSnapshot(name: string, factory: IDBFactory = indexedDB, overrides: Partial<RecoveryLimits> = {}): Promise<StorageResult<RawSnapshot>> {
  let limits: RecoveryLimits;
  try { recoveryDatabaseName(name); limits = recoveryLimits(overrides); } catch (error) { return storageFailure(error).issue; }
  return new Promise(resolve => {
    let settled = false, missing = false, request: IDBOpenDBRequest;
    const finish = (result: StorageResult<RawSnapshot>) => { if (!settled) { settled = true; resolve(result); } };
    try { request = factory.open(name); } catch (error) { finish(storageFailure(error).issue); return; }
    request.onupgradeneeded = () => { missing = true; request.transaction!.abort(); };
    request.onblocked = () => finish({ kind: 'unavailable', reason: 'blocked' });
    request.onerror = () => finish(missing ? { kind: 'unavailable', reason: 'closed', detail: 'raw-recovery-database-missing' } : storageFailure(request.error).issue);
    request.onsuccess = () => {
      const database = request.result;
      if (settled) { database.close(); return; }
      database.onversionchange = () => database.close();
      void snapshot(database, limits).then(result => { database.close(); finish(result); }, error => { database.close(); finish(storageFailure(error).issue); });
    };
  });
}

export { RECOVERY_LIMITS };
