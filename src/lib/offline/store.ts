import { databaseName } from '../storage/namespace';
import { transact } from '../storage/transaction';
import { OFFLINE_LIMITS, recordKey } from './plan';
import type { AttestedRecord, PoolId } from '../catalog/types';
import type { OfflineStore } from './types';

const encodedSize = (value: string) => new TextEncoder().encode(value).byteLength;
const validRevision = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
function jsonRow(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return;
  const json = (value as { json?: unknown }).json;
  return typeof json === 'string' && encodedSize(json) <= OFFLINE_LIMITS.individualRecordBytes ? json : undefined;
}
export function offlineDatabaseName(base: URL): string { return databaseName(base) + ':offline-v1'; }

export async function openOfflineStore(base: URL, factory: IDBFactory = indexedDB): Promise<OfflineStore> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    let settled = false;
    const request = factory.open(offlineDatabaseName(base), 1);
    const timer = setTimeout(() => fail(new Error('offline-storage-timeout')), 2000);
    const fail = (error: unknown) => { if (!settled) { settled = true; clearTimeout(timer); reject(error); } };
    request.onblocked = () => fail(new Error('offline-storage-blocked'));
    request.onerror = () => fail(request.error);
    request.onupgradeneeded = () => { request.result.createObjectStore('records'); request.result.createObjectStore('meta'); };
    request.onsuccess = () => { if (settled) request.result.close(); else { settled = true; clearTimeout(timer); resolve(request.result); } };
  });
  database.onversionchange = () => database.close();
  return {
    async getManifest() {
      const result = await transact<Uint8Array | undefined>(database, ['meta'], 'readonly', context => {
        context.request(context.store('meta').get('manifest'), value => context.result(value instanceof Uint8Array && value.byteLength <= OFFLINE_LIMITS.manifestBytes ? value : undefined));
      });
      return result.kind === 'committed' ? result.value : undefined;
    },
    async putManifest(bytes) {
      if (bytes.byteLength > OFFLINE_LIMITS.manifestBytes) return false;
      const result = await transact<boolean>(database, ['meta'], 'readwrite', context => {
        context.store('meta').put(new Uint8Array(bytes), 'manifest'); context.result(true);
      }, true);
      return result.kind === 'committed';
    },
    async getRecord(pool: PoolId, ordinal: number) {
      const result = await transact<unknown>(database, ['records'], 'readonly', context => {
        context.request(context.store('records').get(recordKey(pool, ordinal)), value => context.result(value));
      });
      if (result.kind !== 'committed') return undefined;
      const json = jsonRow(result.value);
      if (!json) return undefined;
      try {
        const record = JSON.parse(json) as AttestedRecord;
        return record.pool === pool && record.attestation?.shardStart + record.attestation?.recordIndex === ordinal ? record : undefined;
      } catch { return undefined; }
    },
    async getRevision() {
      const result = await transact<number>(database, ['meta'], 'readonly', context => {
        context.request(context.store('meta').get('clear-revision'), value => {
          const revision = value === undefined ? 0 : value;
          if (!validRevision(revision)) throw new Error('offline-clear-revision');
          context.result(revision);
        });
      });
      if (result.kind !== 'committed') throw new Error('offline-revision-unavailable');
      return result.value;
    },
    async putRecord(record, expectedRevision) {
      if (!validRevision(expectedRevision)) return false;
      const json = JSON.stringify(record), size = encodedSize(json);
      if (size > OFFLINE_LIMITS.individualRecordBytes) return false;
      const id = recordKey(record.pool, record.attestation.shardStart + record.attestation.recordIndex);
      const result = await transact<boolean>(database, ['records','meta'], 'readwrite', context => {
        context.request(context.store('meta').get('clear-revision'), value => {
          const revision = value === undefined ? 0 : value;
          if (!validRevision(revision) || revision !== expectedRevision) { context.result(false); return; }
          context.request(context.store('records').getAll(undefined, OFFLINE_LIMITS.records + 1), rows => {
            if (rows.length > OFFLINE_LIMITS.records || rows.some(row => !jsonRow(row))) { context.result(false); return; }
            context.request(context.store('records').get(id), previous => {
              const old = jsonRow(previous);
              const used = rows.reduce((sum, row) => sum + encodedSize(jsonRow(row) ?? ''), 0);
              if ((!previous && rows.length >= OFFLINE_LIMITS.records) || used - (old ? encodedSize(old) : 0) + size > OFFLINE_LIMITS.recordBytes) {
                context.result(false); return;
              }
              context.store('records').put({ json }, id); context.result(true);
            });
          });
        });
      }, true);
      return result.kind === 'committed' && result.value;
    },
    async inventory() {
      const result = await transact<{ keys: string[]; bytes: number; revision: number }>(database, ['records','meta'], 'readonly', context => {
        context.request(context.store('records').getAll(undefined, OFFLINE_LIMITS.records + 1), values => {
          if (values.length > OFFLINE_LIMITS.records || values.some(row => !jsonRow(row))) throw new Error('offline-count-limit');
          context.request(context.store('records').getAllKeys(undefined, OFFLINE_LIMITS.records + 1), keys => {
            context.request(context.store('meta').get('clear-revision'), value => {
              const revision = value === undefined ? 0 : value;
              if (!validRevision(revision)) throw new Error('offline-clear-revision');
              context.result({ keys: keys.map(String), bytes: values.reduce((sum, row) => sum + encodedSize(jsonRow(row) ?? ''), 0), revision });
            });
          });
        });
      });
      if (result.kind !== 'committed') throw new Error('offline-inventory-unavailable');
      return result.value;
    },
    async replacePins(keys, expectedRevision) {
      if (!validRevision(expectedRevision) || keys.length > OFFLINE_LIMITS.records || new Set(keys).size !== keys.length) return false;
      const result = await transact<boolean>(database, ['records','meta'], 'readwrite', context => {
        context.request(context.store('meta').get('clear-revision'), value => {
          const revision = value === undefined ? 0 : value;
          if (!validRevision(revision) || revision !== expectedRevision) { context.result(false); return; }
          let remaining = keys.length, present = true;
          if (!remaining) { context.store('meta').put([], 'pins'); context.result(true); return; }
          for (const key of keys) context.request(context.store('records').get(key), value => {
            present &&= !!jsonRow(value);
            if (--remaining === 0) {
              if (present) context.store('meta').put([...keys], 'pins');
              context.result(present);
            }
          });
        });
      }, true);
      return result.kind === 'committed' && result.value;
    },
    async clear() {
      const result = await transact<boolean>(database, ['records','meta'], 'readwrite', context => {
        context.request(context.store('meta').get('clear-revision'), value => {
          const revision = value === undefined ? 0 : value;
          if (!validRevision(revision) || revision === Number.MAX_SAFE_INTEGER) throw new Error('offline-clear-revision');
          context.store('records').clear(); context.store('meta').delete('pins');
          context.store('meta').put(revision + 1, 'clear-revision'); context.result(true);
        });
      }, true);
      return result.kind === 'committed';
    },
    close() { database.close(); },
  };
}

