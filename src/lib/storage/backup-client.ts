import type { Backup } from './repository';
import type { Definition, StorageResult } from '../gameplay/contracts';
import { BACKUP_LIMITS, parseBoundedJson } from './json';
import { storageFailure } from './transaction';
import { decodeBackup } from './backup';
import { materializeBackup } from './physical-backup';
import type { PhysicalBackup } from './physical-backup';
import { prepareRestoreRows } from './prepare-restore';
import type { PreparedRestore } from './prepare-restore';

export interface BackupTiming { encodeMs: number; roundTripMs: number; workerDecodeMs: number; workerProofMs: number; bytes: number; worker: boolean }
export class BackupValidationClient {
  private sequence = 0;
  private pending = new Set<() => void>();
  timing?: BackupTiming;
  cancel(): void { for (const cancel of [...this.pending]) cancel(); }
  validate(input: string | Backup, verify: (definition: Definition) => Promise<boolean>): Promise<StorageResult<Backup>> {
    return this.execute<Backup>(input, verify, false);
  }
  serialize(input: Backup | PhysicalBackup, verify: (definition: Definition) => Promise<boolean>): Promise<StorageResult<string>> {
    return this.execute<string>(input, verify, true);
  }
  prepare(input: Backup, generation: string, verify: (definition: Definition) => Promise<boolean>): Promise<StorageResult<PreparedRestore>> {
    return this.execute<PreparedRestore>(input, verify, false, generation);
  }
  private async execute<T extends Backup | string | PreparedRestore>(input: string | Backup | PhysicalBackup, verify: (definition: Definition) => Promise<boolean>, serialize: boolean, prepareGeneration?: string): Promise<StorageResult<T>> {
    const started = performance.now();
    if (typeof input === 'string' && input.length > BACKUP_LIMITS.bytes) return { kind: 'corrupt', reason: 'backup-bytes' };
    // Explicit Node-only path for pure tools/tests. Browser acceptance always uses Worker.
    if (typeof Worker === 'undefined') {
      try {
        const backup = decodeBackup(typeof input === 'string' ? parseBoundedJson(input) : materializeBackup(structuredClone(input)));
        const checked = new Set<string>();
        for (const item of [...backup.attempts, ...backup.receipts]) {
          const identity = JSON.stringify(item.definition);
          if (!checked.has(identity) && !await verify(item.definition)) return { kind: 'corrupt', reason: 'backup-provenance' };
          checked.add(identity);
        }
        this.timing = { encodeMs: 0, roundTripMs: performance.now() - started, workerDecodeMs: 0, workerProofMs: 0, bytes: 0, worker: false };
        const text = JSON.stringify(backup);
        if (new TextEncoder().encode(text).byteLength > BACKUP_LIMITS.bytes) return { kind: 'corrupt', reason: 'backup-bytes' };
        const value = prepareGeneration !== undefined ? prepareRestoreRows(backup, prepareGeneration) : serialize ? text : backup;
        return { kind: 'committed', value: value as T };
      } catch (error) { return storageFailure(error).issue; }
    }
    const id = ++this.sequence;
    let bytes: Uint8Array<ArrayBuffer> | undefined;
    if (typeof input === 'string') {
      bytes = new TextEncoder().encode(input);
      if (bytes.byteLength > BACKUP_LIMITS.bytes) return { kind: 'corrupt', reason: 'backup-bytes' };
    }
    const encodedAt = performance.now(); const byteCount = bytes?.byteLength ?? 0;
    return new Promise(resolve => {
      let worker: Worker;
      try { worker = new Worker(new URL('./backup.worker.ts', import.meta.url), { type: 'module' }); }
      catch (error) { resolve(storageFailure(error).issue); return; }
      let finished = false;
      const finish = (result: StorageResult<T>) => {
        if (finished) return; finished = true; worker.terminate(); this.pending.delete(cancel); resolve(result);
      };
      const cancel = () => finish({ kind: 'unavailable', reason: 'abort', detail: 'backup-cancelled' });
      this.pending.add(cancel);
      worker.onerror = () => finish({ kind: 'unavailable', reason: 'abort', detail: 'backup-worker-error' });
      worker.onmessage = (event: MessageEvent<{ id: number; result: StorageResult<T>; decodeMs: number; proofMs: number; bytes: number }>) => {
        if (event.data.id !== id) return;
        this.timing = { encodeMs: encodedAt - started, roundTripMs: performance.now() - started,
          workerDecodeMs: event.data.decodeMs, workerProofMs: event.data.proofMs, bytes: event.data.bytes || byteCount, worker: true };
        finish(event.data.result);
      };
      try {
        if (bytes) worker.postMessage({ id, bytes: bytes.buffer, serialize, prepareGeneration }, [bytes.buffer]);
        else worker.postMessage({ id, backup: input, serialize, prepareGeneration });
      } catch (error) { finish(storageFailure(error).issue); }
    });
  }
}
