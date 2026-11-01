import { expect, it } from 'vitest';
import { exportRawRecovery, exportRawRecoveryName } from '../../src/lib/storage/raw-recovery';
import { databaseName } from '../../src/lib/storage/namespace';

it('fails closed on malformed worker replies and ignores stale completion before allocation', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
  let deliver: (worker: FakeWorker) => void = () => {}, terminated = 0;
  class FakeWorker {
    onmessage?: (event: any) => void; onerror?: () => void;
    postMessage() { queueMicrotask(() => deliver(this)); }
    terminate() { terminated++; }
  }
  Object.defineProperty(globalThis, 'Worker', { value: FakeWorker, configurable: true });
  const name = databaseName('https://example.test/frog/');
  const valid = () => ({ id: 1, result: { kind: 'committed', value: { buffer: new ArrayBuffer(3), summary: {
    databaseName: name, databaseVersion: 7, stores: 0, records: 0, bytes: 3, nodes: 0, visits: 0, snapshotMs: 0, encodingMs: 1,
  } } } });
  try {
    const malformed: unknown[] = [null, 1, {}, { id: '1' }, { id: 1 }, { id: 1, result: { kind: 'what', reason: 'x' } },
      { id: 1, result: { kind: 'unavailable', reason: 'what' } }, { id: 1, result: { kind: 'corrupt', reason: 1 } }];
    for (const field of ['bytes', 'nodes', 'visits', 'records', 'stores', 'databaseVersion', 'snapshotMs', 'encodingMs']) {
      const reply = valid(); (reply.result.value.summary as any)[field] = NaN; malformed.push(reply);
    }
    const wrongName = valid(); wrongName.result.value.summary.databaseName = 'elsewhere'; malformed.push(wrongName);
    const mismatchedBytes = valid(); mismatchedBytes.result.value.summary.bytes = 4; malformed.push(mismatchedBytes);
    for (const data of malformed) { deliver = worker => worker.onmessage!({ data }); expect((await exportRawRecoveryName(name)).kind).toBe('corrupt'); }
    deliver = worker => worker.onmessage!({ get data() { throw new Error('getter'); } }); expect((await exportRawRecoveryName(name)).kind).toBe('corrupt');
    for (const result of [{ kind: 'corrupt', reason: 'x' }, { kind: 'unsupported-future', reason: 'x' }, { kind: 'unavailable', reason: 'closed' }, { kind: 'unavailable', reason: 'abort', detail: 'cancel' }]) {
      deliver = worker => worker.onmessage!({ data: { id: 1, result } }); expect(await exportRawRecoveryName(name)).toEqual(result);
    }
    deliver = worker => { worker.onmessage!({ data: valid() }); worker.onmessage!({ get data() { throw new Error('stale-read'); } }); };
    const result = await exportRawRecoveryName(name); expect(result.kind).toBe('committed'); if (result.kind === 'committed') expect(result.value.blob.size).toBe(3);
    const cancel = new AbortController(); deliver = worker => { worker.onmessage!({ data: { id: 2 } }); cancel.abort(); };
    expect(await exportRawRecoveryName(name, { signal: cancel.signal })).toMatchObject({ kind: 'unavailable', detail: 'raw-recovery-cancelled' });
    expect(await exportRawRecoveryName(name, { signal: cancel.signal })).toMatchObject({ kind: 'unavailable', reason: 'abort' });
    deliver = worker => worker.onerror!(); expect(await exportRawRecoveryName(name)).toMatchObject({ kind: 'unavailable', detail: 'raw-recovery-worker-error' });
    expect(terminated).toBeGreaterThan(malformed.length);
    Object.defineProperty(globalThis, 'Worker', { value: undefined, configurable: true });
    expect(await exportRawRecoveryName(name)).toMatchObject({ kind: 'unavailable', detail: 'raw-recovery-worker-unavailable' });
    expect((await exportRawRecovery('file:///invalid/')).kind).toBe('unavailable'); expect((await exportRawRecoveryName('other')).kind).toBe('corrupt');
  } finally { if (original) Object.defineProperty(globalThis, 'Worker', original); else Reflect.deleteProperty(globalThis, 'Worker'); }
});
