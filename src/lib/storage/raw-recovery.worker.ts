import { encodeRawRecovery } from './raw-recovery-codec';
import { readRawSnapshot } from './raw-recovery-snapshot';
import { storageFailure } from './transaction';
import type { StorageResult } from '../gameplay/contracts';
import type { RawRecoverySummary } from './raw-recovery';

const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<{ id: number; name: string }>) => void;
  postMessage: (message: unknown, transfer?: Transferable[]) => void;
};
scope.onmessage = async event => {
  let result: StorageResult<{ buffer: ArrayBuffer; summary: RawRecoverySummary }>;
  try {
    if (event.data.id !== 1) throw new TypeError('Invalid recovery request');
    const started = performance.now(), snapshot = await readRawSnapshot(event.data.name), capturedAt = performance.now();
    if (snapshot.kind !== 'committed') { scope.postMessage({ id: event.data.id, result: snapshot }); return; }
    const summary = { databaseName: snapshot.value.databaseName, databaseVersion: snapshot.value.databaseVersion,
      stores: snapshot.value.stores.length, records: snapshot.value.records, snapshotMs: capturedAt - started };
    const encoded = await encodeRawRecovery(snapshot.value);
    result = { kind: 'committed', value: { buffer: encoded.bytes.buffer, summary: { ...summary, bytes: encoded.bytes.byteLength,
      nodes: encoded.nodes, visits: encoded.visits, encodingMs: performance.now() - capturedAt } } };
  } catch (error) { result = storageFailure(error).issue; }
  scope.postMessage({ id: event.data.id, result }, result.kind === 'committed' ? [result.value.buffer] : []);
};
