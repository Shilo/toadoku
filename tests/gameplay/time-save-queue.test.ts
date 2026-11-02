import { describe, expect, it } from 'vitest';
import type { Attempt, StorageResult } from '../../src/lib/gameplay/contracts';
import { AttemptSaveQueue } from '../../src/lib/gameplay/controller';
import { attemptFixture } from '../session/fixtures';

function deferred<T>() {
  let resolve!: (value: T) => void;
  return { promise: new Promise<T>(done => { resolve = done; }), resolve };
}
const committed = (attempt: Attempt, revision: number): StorageResult<Attempt> => ({ kind: 'committed', value: { ...attempt, revision } });
const snapshot = (base: Attempt, sequence: number, fields: Partial<Attempt> = {}): Attempt => ({ ...base, commandSeq: sequence, elapsedMs: sequence * 1000, ...fields });

describe('compact time provenance in the save queue', () => {
  it('coalesces only clock samples and sends primitive metadata against the actual committed sequence', async () => {
    const initial = attemptFixture(), calls: unknown[][] = [], full: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, {
      save: async input => { full.push(input); return committed(input, 1); },
      saveTime: async (metadata, revision, sequence) => {
        calls.push([metadata, revision, sequence]);
        return committed({ ...initial, ...metadata }, revision + 1);
      },
    }, () => {}, () => {});
    queue.enqueueTime(snapshot(initial, 1)); queue.enqueueTime(snapshot(initial, 2)); queue.enqueueTime(snapshot(initial, 3));
    expect((await queue.flush()).kind).toBe('committed');
    expect(full).toEqual([]);
    expect(calls).toEqual([[{ id: initial.id, generation: initial.generation, writer: initial.writer, commandSeq: 3, elapsedMs: 3000 }, initial.revision, initial.commandSeq]]);
    queue.close();
  });

  it.each([false, true])('keeps a pending full intent when a later time sample arrives; selection=%s', async selectionOnly => {
    const initial = attemptFixture(), full: Attempt[] = [], time: Attempt[] = [];
    const edited = snapshot(initial, 1, { selection: 2, entries: initial.entries.map((value, cell) => cell === 1 ? 3 : value) });
    const latest = snapshot(edited, 2);
    const queue = new AttemptSaveQueue(initial, {
      save: async input => { full.push(input); return committed(input, 1); },
      saveTime: async metadata => { time.push({ ...initial, ...metadata }); throw Error('Must preserve full intent'); },
    }, () => {}, () => {});
    queue.enqueue(edited, selectionOnly); queue.enqueueTime(latest);
    await queue.flush();
    expect(full).toHaveLength(1); expect(full[0]).toMatchObject({ commandSeq: 2, elapsedMs: 2000, selection: 2 });
    expect(full[0].entries[1]).toBe(3); expect(time).toEqual([]); queue.close();
  });

  it('uses the acknowledged full base when a time sample follows an in-flight edit', async () => {
    const initial = attemptFixture(), gate = deferred<StorageResult<Attempt>>(), time: number[][] = [];
    const edited = snapshot(initial, 1, { entries: initial.entries.map((v, c) => c === 1 ? 3 : v) });
    const queue = new AttemptSaveQueue(initial, {
      save: () => gate.promise,
      saveTime: async (metadata, revision, sequence) => { time.push([revision, sequence, metadata.commandSeq]); return committed({ ...edited, ...metadata }, revision + 1); },
    }, () => {}, () => {});
    queue.enqueue(edited); await Promise.resolve(); queue.enqueueTime(snapshot(edited, 3));
    gate.resolve(committed(edited, 1));
    const saved = await queue.flush(); expect(saved.kind).toBe('committed');
    if (saved.kind === 'committed') expect(saved.value.entries[1]).toBe(3);
    expect(time).toEqual([[1, 1, 3]]); queue.close();
  });

  it('promotes the newest time sample to full after an in-flight edit fails, preserving the edit on Retry', async () => {
    const initial = attemptFixture(), gate = deferred<StorageResult<Attempt>>(), full: Attempt[] = [], time: unknown[] = [];
    const edited = snapshot(initial, 1, { selection: 2, entries: initial.entries.map((v, c) => c === 1 ? 3 : v) });
    const queue = new AttemptSaveQueue(initial, {
      save: input => { full.push(input); return full.length === 1 ? gate.promise : Promise.resolve(committed(input, 1)); },
      saveTime: async metadata => { time.push(metadata); throw Error('Retry must preserve the failed board edit'); },
    }, () => {}, () => {});
    queue.enqueue(edited); await Promise.resolve(); queue.enqueueTime(snapshot(edited, 2));
    gate.resolve({ kind: 'unavailable', reason: 'quota' });
    expect(await queue.flush()).toMatchObject({ kind: 'unavailable', reason: 'quota' });
    expect((await queue.retry()).kind).toBe('committed');
    expect(full.map(a => a.commandSeq)).toEqual([1, 2]); expect(full[1].entries[1]).toBe(3); expect(full[1].selection).toBe(2);
    expect(full[1].elapsedMs).toBe(2000); expect(time).toEqual([]); queue.close();
  });

  it('preserves a newer board edit when an in-flight compact operation fails', async () => {
    const initial = attemptFixture(), gate = deferred<StorageResult<Attempt>>(), full: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, {
      save: async input => { full.push(input); return committed(input, 1); }, saveTime: () => gate.promise,
    }, () => {}, () => {});
    queue.enqueueTime(snapshot(initial, 1)); await Promise.resolve();
    const edited = snapshot(initial, 2, { entries: initial.entries.map((v, c) => c === 1 ? 5 : v) });
    queue.enqueue(edited); gate.resolve({ kind: 'unavailable', reason: 'quota' });
    await queue.flush(); await queue.retry();
    expect(full).toHaveLength(1); expect(full[0].entries[1]).toBe(5); expect(full[0].commandSeq).toBe(2); queue.close();
  });

  it('falls back to full snapshots when the repository has no compact capability', async () => {
    const initial = attemptFixture(), full: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { save: async input => { full.push(input); return committed(input, 1); } }, () => {}, () => {});
    queue.enqueueTime(snapshot(initial, 1)); await queue.flush(); expect(full).toHaveLength(1); queue.close();
  });

  it('rejects a mismatched compact acknowledgement and retains recoverable latest state', async () => {
    const initial = attemptFixture(), gate = deferred<StorageResult<Attempt>>(), acknowledgements: Attempt[] = [];
    const queue = new AttemptSaveQueue(initial, { save: async input => committed(input, 1), saveTime: () => gate.promise }, a => acknowledgements.push(a), () => {});
    queue.enqueueTime(snapshot(initial, 1)); await Promise.resolve(); queue.enqueueTime(snapshot(initial, 2));
    gate.resolve(committed(snapshot(initial, 9), 1));
    expect(await queue.flush()).toMatchObject({ kind: 'corrupt', reason: 'invalid-save-acknowledgement' });
    expect(queue.state.pending).toBe(true); expect(acknowledgements).toEqual([]);
  });
});
