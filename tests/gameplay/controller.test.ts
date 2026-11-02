import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Attempt, StorageResult } from '../../src/lib/gameplay/contracts.ts';
import { AttemptSaveQueue, SELECTION_SAVE_DELAY_MS } from '../../src/lib/gameplay/controller.ts';

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

describe('selection persistence batching', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('reports pending immediately and saves the latest selection at the first fixed deadline', async () => {
    vi.useFakeTimers();
    const initial = attempt(), sent: Attempt[] = [], pending: boolean[] = [];
    const queue = new AttemptSaveQueue(initial, { async save(snapshot) {
      sent.push(snapshot); return saved(snapshot, sent.length);
    } }, () => {}, state => pending.push(state.pending));
    expect(SELECTION_SAVE_DELAY_MS).toBe(250);
    queue.enqueue({ ...initial, commandSeq: 1, selection: 1 }, true);
    expect(queue.state).toEqual({ committedSeq: 0, pending: true });
    expect(pending.at(-1)).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    queue.enqueue({ ...initial, commandSeq: 2, selection: 2 }, true);
    await vi.advanceTimersByTimeAsync(100);
    queue.enqueue({ ...initial, commandSeq: 3, selection: 3 }, true);
    await vi.advanceTimersByTimeAsync(49);
    expect(sent).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    expect(sent.map(snapshot => [snapshot.commandSeq, snapshot.selection])).toEqual([[3, 3]]);
    expect(queue.state).toEqual({ committedSeq: 3, pending: false });
    expect(vi.getTimerCount()).toBe(0);
    queue.close();
  });

  it('an immediate edit interrupts the selection delay without waiting for its timer', async () => {
    vi.useFakeTimers();
    const initial = attempt(), sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { async save(snapshot) {
      sent.push(snapshot); return saved(snapshot, sent.length);
    } }, () => {}, () => {});
    queue.enqueue({ ...initial, commandSeq: 1, selection: 1 }, true);
    await vi.advanceTimersByTimeAsync(100);
    const edited = { ...initial, commandSeq: 2, logicalRevision: 1, selection: 1, entries: initial.entries.map((value, cell) => cell === 1 ? 7 : value) };
    queue.enqueue(edited);
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ commandSeq: 2, entries: edited.entries });
    await queue.flush();
    await vi.advanceTimersByTimeAsync(SELECTION_SAVE_DELAY_MS);
    expect(sent).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a subsequent selection cannot re-defer an already urgent edit', async () => {
    vi.useFakeTimers();
    const initial = attempt(), sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { async save(snapshot) {
      sent.push(snapshot); return saved(snapshot, sent.length);
    } }, () => {}, () => {});
    const edited = { ...initial, commandSeq: 1, logicalRevision: 1, entries: initial.entries.map((value, cell) => cell === 0 ? 4 : value) };
    queue.enqueue(edited);
    queue.enqueue({ ...edited, commandSeq: 2, selection: 1 }, true);
    await Promise.resolve();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ commandSeq: 2, selection: 1, entries: edited.entries });
    await queue.flush();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flush drains a deferred selection immediately and leaves no orphan timer after close', async () => {
    vi.useFakeTimers();
    const initial = attempt(), sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { async save(snapshot) {
      sent.push(snapshot); return saved(snapshot, sent.length);
    } }, () => {}, () => {});
    queue.enqueue({ ...initial, commandSeq: 1, selection: 7 }, true);
    expect(() => queue.close()).toThrow('dirty');
    const result = await queue.flush();
    expect(result).toMatchObject({ kind: 'committed', value: { commandSeq: 1, selection: 7 } });
    expect(sent).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
    queue.close();
    await vi.advanceTimersByTimeAsync(SELECTION_SAVE_DELAY_MS * 2);
    expect(sent).toHaveLength(1);
  });

  it('a selection does not delay a queued urgent edit when an older save finishes', async () => {
    vi.useFakeTimers();
    const initial = attempt(), gate = deferred<StorageResult<Attempt>>(), sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) {
      sent.push(snapshot); return sent.length === 1 ? gate.promise : Promise.resolve(saved(snapshot, 2));
    } }, () => {}, () => {});
    queue.enqueue({ ...initial, commandSeq: 1 });
    await Promise.resolve();
    const edited = { ...initial, commandSeq: 2, logicalRevision: 1, entries: initial.entries.map((value, cell) => cell === 0 ? 8 : value) };
    queue.enqueue(edited);
    queue.enqueue({ ...edited, commandSeq: 3, selection: 1 }, true);
    gate.resolve(saved(sent[0], 1));
    // Do not flush or advance the batch deadline: the queued edit is already urgent.
    await vi.advanceTimersByTimeAsync(0);
    expect(sent).toHaveLength(2);
    expect(sent[1]).toMatchObject({ commandSeq: 3, selection: 1, entries: edited.entries, revision: 1 });
    expect(queue.state).toEqual({ committedSeq: 3, pending: false });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('coalesces newer selections while an older acknowledgement is in flight', async () => {
    vi.useFakeTimers();
    const initial = attempt(), gate = deferred<StorageResult<Attempt>>(), sent: Attempt[] = [], acknowledged: number[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) {
      sent.push(snapshot); return sent.length === 1 ? gate.promise : Promise.resolve(saved(snapshot, 2));
    } }, value => acknowledged.push(value.commandSeq), () => {});
    queue.enqueue({ ...initial, commandSeq: 1, selection: 1 }, true);
    await vi.advanceTimersByTimeAsync(SELECTION_SAVE_DELAY_MS);
    queue.enqueue({ ...initial, commandSeq: 2, selection: 2 }, true);
    queue.enqueue({ ...initial, commandSeq: 3, selection: 3 }, true);
    const flushed = queue.flush();
    expect(sent).toHaveLength(1);
    gate.resolve(saved(sent[0], 1));
    expect(await flushed).toMatchObject({ kind: 'committed', value: { commandSeq: 3, selection: 3 } });
    expect(sent.map(snapshot => [snapshot.commandSeq, snapshot.revision, snapshot.selection])).toEqual([[1, 0, 1], [3, 1, 3]]);
    expect(acknowledged).toEqual([1, 3]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('flush also drains a selection arriving while it awaits an older write', async () => {
    vi.useFakeTimers();
    const initial = attempt(), gate = deferred<StorageResult<Attempt>>(), sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) {
      sent.push(snapshot); return sent.length === 1 ? gate.promise : Promise.resolve(saved(snapshot, 2));
    } }, () => {}, () => {});
    queue.enqueue({ ...initial, commandSeq: 1 });
    await Promise.resolve();
    const flushed = queue.flush();
    queue.enqueue({ ...initial, commandSeq: 2, selection: 9 }, true);
    gate.resolve(saved(sent[0], 1));
    // Flush must not resolve an older ack while a newer cursor remains deferred.
    expect(await flushed).toMatchObject({ kind: 'committed', value: { commandSeq: 2, selection: 9 } });
    expect(sent.map(snapshot => snapshot.commandSeq)).toEqual([1, 2]);
    expect(queue.state).toEqual({ committedSeq: 2, pending: false });
    expect(vi.getTimerCount()).toBe(0);
    queue.close();
  });

  it('retains a failed batch without automatic retries and explicitly retries the newest selection', async () => {
    vi.useFakeTimers();
    const initial = attempt(), gate = deferred<StorageResult<Attempt>>(), sent: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) {
      sent.push(snapshot); return sent.length === 1 ? gate.promise : Promise.resolve(saved(snapshot, 1));
    } }, () => {}, () => {});
    queue.enqueue({ ...initial, commandSeq: 1, selection: 1 }, true);
    await vi.advanceTimersByTimeAsync(SELECTION_SAVE_DELAY_MS);
    queue.enqueue({ ...initial, commandSeq: 2, selection: 2 }, true);
    gate.resolve({ kind: 'unavailable', reason: 'quota' });
    expect(await queue.flush()).toEqual({ kind: 'unavailable', reason: 'quota' });
    queue.enqueue({ ...initial, commandSeq: 3, selection: 3 }, true);
    expect(queue.state).toMatchObject({ committedSeq: 0, pending: true, failure: { kind: 'unavailable', reason: 'quota' } });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(1000);
    expect(sent).toHaveLength(1);
    expect(await queue.retry()).toMatchObject({ kind: 'committed', value: { commandSeq: 3, selection: 3 } });
    expect(sent.map(snapshot => snapshot.commandSeq)).toEqual([1, 3]);
    expect(queue.state).toEqual({ committedSeq: 3, pending: false });
    expect(vi.getTimerCount()).toBe(0);
  });
});
