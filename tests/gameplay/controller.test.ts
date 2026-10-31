import { describe, expect, it } from 'vitest';
import type { Attempt, StorageResult } from '../../src/lib/gameplay/contracts.ts';
import { AttemptSaveQueue } from '../../src/lib/gameplay/controller.ts';

// Queue tests use typed inert definitions; catalog trust is exercised in repository tests.
const attempt = (): Attempt => ({
  schemaVersion: 1, id: 'attempt', generation: 'generation', role: 'quick', revision: 0,
  commandSeq: 0, logicalRevision: 0, writer: { token: 'writer', epoch: 1 },
  definition: { id: 'puzzle', groupId: 'group', sourceId: 'source', sourceFile: 'easy.txt',
    givens: '0'.repeat(81), solution: '1'.repeat(81), ratingTenths: 12,
    catalogVersion: '1', certificationVersion: '1', sourceRevision: 'source-revision', pool: 'easy',
    attestation: { version: 1, shardStart: 0, recordCount: 1, recordIndex: 0, recordSiblings: [], shardIndex: 0, shardCount: 1, shardSiblings: [] } },
  policy: { rewardVersion: 2, scheduleVersion: 1, band: 'easy', base: 100, targetMs: 600000 },
  entries: Array(81).fill(0), notes: Array(81).fill(0), selection: 0, notesMode: false,
  undo: [], elapsedMs: 0, assistance: { used: false, exposed: [] }, status: 'playing', scored: true,
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const saved = (input: Attempt, revision: number): StorageResult<Attempt> => ({ kind: 'committed', value: { ...input, revision } });

describe('bounded attempt persistence coordinator', () => {
  it('coalesces new edits while preserving in-flight acknowledgement order', async () => {
    const initial = attempt(), gate = deferred<StorageResult<Attempt>>();
    const sent: Attempt[] = [], acknowledgements: number[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) {
      sent.push(snapshot);
      return sent.length === 1 ? gate.promise : Promise.resolve(saved(snapshot, 2));
    } }, value => acknowledgements.push(value.commandSeq), () => {});
    queue.enqueue({ ...initial, commandSeq: 1 });
    await Promise.resolve();
    expect(() => queue.enqueue({ ...initial, commandSeq: 1 })).toThrow('Out-of-order');
    for (let seq = 2; seq <= 100; seq++) queue.enqueue({ ...initial, commandSeq: seq, elapsedMs: seq });
    expect(sent).toHaveLength(1);
    expect(() => queue.enqueue({ ...initial, commandSeq: 99 })).toThrow('Out-of-order');
    gate.resolve(saved(sent[0], 1));
    expect((await queue.flush()).kind).toBe('committed');
    expect(sent.map(a => [a.commandSeq, a.revision])).toEqual([[1, 0], [100, 1]]);
    expect(acknowledgements).toEqual([1, 100]);
    expect(queue.state).toEqual({ committedSeq: 100, pending: false });
    queue.close();
    expect(() => queue.enqueue(initial)).toThrow('Closed');
  });

  it('retains the newest unsaved state across failure and explicit retry', async () => {
    const initial = attempt(), gate = deferred<StorageResult<Attempt>>();
    const sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) {
      sent.push(snapshot);
      return sent.length === 1 ? gate.promise : Promise.resolve(saved(snapshot, 1));
    } }, () => {}, () => {});
    queue.enqueue({ ...initial, commandSeq: 1 }); await Promise.resolve();
    queue.enqueue({ ...initial, commandSeq: 2 });
    gate.resolve({ kind: 'unavailable', reason: 'quota' });
    expect(await queue.flush()).toEqual({ kind: 'unavailable', reason: 'quota' });
    expect(queue.state.pending).toBe(true);
    expect(() => queue.close()).toThrow('dirty');
    expect((await queue.retry()).kind).toBe('committed');
    expect(sent.map(a => a.commandSeq)).toEqual([1, 2]);
  });

  it('starts a save enqueued between pump completion and its finalizer', async () => {
    const initial = attempt(); let calls = 0, queue: AttemptSaveQueue;
    queue = new AttemptSaveQueue(initial, { async save(snapshot) { return saved(snapshot, ++calls); } }, value => {
      if (value.commandSeq === 1) queueMicrotask(() => queue.enqueue({ ...value, commandSeq: 2 }));
    }, () => {});
    queue.enqueue({ ...initial, commandSeq: 1 });
    await queue.flush();
    expect(calls).toBe(2);
    expect(queue.state).toEqual({ committedSeq: 2, pending: false });
  });

  it('does not create two pumps if a synchronous notification enqueues work', async () => {
    const initial = attempt(); let queue: AttemptSaveQueue, calls = 0, queued = false;
    queue = new AttemptSaveQueue(initial, { async save(snapshot) { return saved(snapshot, ++calls); } }, () => {}, state => {
      if (!state.pending && state.committedSeq === 1 && !queued) {
        queued = true; queue.enqueue({ ...initial, commandSeq: 2 });
      }
    });
    queue.enqueue({ ...initial, commandSeq: 1 }); await queue.flush();
    expect(calls).toBe(2);
    expect(queue.state).toEqual({ committedSeq: 2, pending: false });
  });

  it('rejects role/writer changes, backward commands and invalid acknowledgements', async () => {
    const initial = attempt();
    const queue = new AttemptSaveQueue(initial, { async save(snapshot) { return saved(snapshot, 0); } }, () => {}, () => {});
    expect(() => queue.enqueue({ ...initial, id: 'other-role' })).toThrow('Flush');
    expect(() => queue.enqueue({ ...initial, writer: { token: 'other', epoch: 2 } })).toThrow('Flush');
    expect(() => queue.enqueue({ ...initial, commandSeq: -1 })).toThrow('Out-of-order');
    queue.enqueue({ ...initial, commandSeq: 1 });
    expect(await queue.flush()).toEqual({ kind: 'corrupt', reason: 'invalid-save-acknowledgement' });
    expect(await queue.retry()).toEqual({ kind: 'corrupt', reason: 'invalid-save-acknowledgement' });
  });
});
