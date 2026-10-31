import { decodeBackup } from './backup';
import { BACKUP_LIMITS, parseBoundedJson } from './json';
import { verifyAttestedRecord } from '../catalog/attestation';
import { StorageFailure, storageFailure } from './transaction';
import type { Backup } from './repository';
import type { StorageResult } from '../gameplay/contracts';

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{ id: number; bytes?: ArrayBuffer; backup?: Backup; serialize?: boolean }>) => void;
  postMessage: (value: unknown) => void;
};
scope.onmessage = async event => {
  const started = performance.now(); let decodedAt = started; let bytes = 0;
  let result: StorageResult<Backup | string>;
  try {
    const input = event.data;
    if (!Number.isSafeInteger(input.id) || input.id < 1) throw new StorageFailure({ kind: 'corrupt', reason: 'worker-request' });
    let backup: Backup;
    if (input.bytes instanceof ArrayBuffer) {
      if (input.bytes.byteLength > BACKUP_LIMITS.bytes) throw new StorageFailure({ kind: 'corrupt', reason: 'backup-bytes' });
      bytes = input.bytes.byteLength;
      backup = decodeBackup(parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(input.bytes)));
    } else backup = decodeBackup(input.backup);
    decodedAt = performance.now();
    const checked = new Set<string>();
    for (const item of [...backup.attempts, ...backup.receipts]) {
      const identity = JSON.stringify(item.definition);
      if (!checked.has(identity) && !await verifyAttestedRecord(item.definition)) throw new StorageFailure({ kind: 'corrupt', reason: 'backup-provenance' });
      checked.add(identity);
    }
    let text: string | undefined;
    if (!bytes || input.serialize) {
      text = JSON.stringify(backup);
      bytes = new TextEncoder().encode(text).byteLength;
      if (bytes > BACKUP_LIMITS.bytes) throw new StorageFailure({ kind: 'corrupt', reason: 'backup-bytes' });
    }
    result = { kind: 'committed', value: input.serialize ? text! : backup };
  } catch (error) { result = storageFailure(error).issue; }
  scope.postMessage({ id: event.data.id, result, decodeMs: decodedAt - started, proofMs: performance.now() - decodedAt, bytes });
};
