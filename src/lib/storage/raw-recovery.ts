import type { StorageResult } from '../gameplay/contracts';
import { databaseName, recoveryDatabaseName } from './namespace';
import { RECOVERY_LIMITS } from './raw-recovery-codec';
import { storageFailure } from './transaction';

export interface RawRecoverySummary { databaseName: string; databaseVersion: number; stores: number; records: number; bytes: number; nodes: number; visits: number; snapshotMs: number; encodingMs: number }
export interface RawRecoveryArtifact { blob: Blob; summary: RawRecoverySummary }
export interface RawRecoveryOptions { signal?: AbortSignal }
export async function exportRawRecovery(baseUrl: URL | string, options: RawRecoveryOptions = {}): Promise<StorageResult<RawRecoveryArtifact>> {
  try { return exportRawRecoveryName(databaseName(baseUrl), options); } catch (error) { return storageFailure(error).issue; }
}

/** Internal repository delegation. Standalone callers use the base-URL scoped public function. */
export async function exportRawRecoveryName(name: string, { signal }: RawRecoveryOptions = {}): Promise<StorageResult<RawRecoveryArtifact>> {
  try { recoveryDatabaseName(name); } catch (error) { return storageFailure(error).issue; }
  if (signal?.aborted) return { kind: 'unavailable', reason: 'abort', detail: 'raw-recovery-cancelled' };
  if (typeof Worker === 'undefined') return { kind: 'unavailable', reason: 'closed', detail: 'raw-recovery-worker-unavailable' };
  return new Promise(resolve => {
    let worker: Worker;
    try { worker = new Worker(new URL('./raw-recovery.worker.ts', import.meta.url), { type: 'module' }); }
    catch (error) { resolve(storageFailure(error).issue); return; }
    let finished = false;
    const finish = (result: StorageResult<RawRecoveryArtifact>) => {
      if (finished) return; finished = true; signal?.removeEventListener('abort', cancel); worker.terminate(); resolve(result);
    };
    const cancel = () => finish({ kind: 'unavailable', reason: 'abort', detail: 'raw-recovery-cancelled' });
    signal?.addEventListener('abort', cancel, { once: true });
    worker.onerror = () => finish({ kind: 'unavailable', reason: 'abort', detail: 'raw-recovery-worker-error' });
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (finished) return;
      const invalid = () => finish({ kind: 'corrupt', reason: 'raw-recovery-worker-result' });
      try {
        const data = event.data as { id?: unknown; result?: any } | null;
        if (!data || typeof data !== 'object') { invalid(); return; }
        if (typeof data.id === 'number' && data.id !== 1) return;
        if (data.id !== 1 || !data.result || typeof data.result !== 'object') { invalid(); return; }
        const result = data.result;
        if (result.kind !== 'committed') {
          if (typeof result.reason !== 'string' || result.reason.length > RECOVERY_LIMITS.string) { invalid(); return; }
          if (result.kind === 'unavailable' && ['blocked', 'closed', 'quota', 'denied', 'abort'].includes(result.reason)
            && (result.detail === undefined || typeof result.detail === 'string' && result.detail.length <= RECOVERY_LIMITS.string)) {
            finish({ kind: 'unavailable', reason: result.reason, ...(result.detail === undefined ? {} : { detail: result.detail }) }); return;
          }
          if (result.kind === 'corrupt' || result.kind === 'unsupported-future') { finish({ kind: result.kind, reason: result.reason }); return; }
          invalid(); return;
        }
        const value = result.value, summary = value?.summary;
        const integer = (value: unknown, max = Number.MAX_SAFE_INTEGER) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
        if (!(value?.buffer instanceof ArrayBuffer) || !summary || summary.databaseName !== name
          || !integer(summary.databaseVersion) || summary.databaseVersion === 0 || !integer(summary.stores, RECOVERY_LIMITS.stores)
          || !integer(summary.records, RECOVERY_LIMITS.records) || !integer(summary.nodes, RECOVERY_LIMITS.nodes) || !integer(summary.visits, RECOVERY_LIMITS.nodes)
          || !integer(summary.bytes, RECOVERY_LIMITS.bytes) || value.buffer.byteLength !== summary.bytes
          || ![summary.snapshotMs, summary.encodingMs].every(time => typeof time === 'number' && Number.isFinite(time) && time >= 0)) { invalid(); return; }
        finish({ kind: 'committed', value: { blob: new Blob([value.buffer], { type: 'application/json' }), summary: { databaseName: name,
          databaseVersion: summary.databaseVersion, stores: summary.stores, records: summary.records, nodes: summary.nodes, visits: summary.visits,
          bytes: summary.bytes, snapshotMs: summary.snapshotMs, encodingMs: summary.encodingMs } } });
      } catch { invalid(); }
    };
    try { worker.postMessage({ id: 1, name }); } catch (error) { finish(storageFailure(error).issue); }
  });
}
