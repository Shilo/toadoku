import { describe, expect, it } from 'vitest';
import { AttemptSaveQueue } from '../../src/lib/gameplay/controller.ts';
import type { SaveState } from '../../src/lib/gameplay/controller.ts';
import type { Attempt, StorageResult } from '../../src/lib/gameplay/contracts.ts';
import { attemptFixture } from '../session/fixtures.ts';

const committed = (snapshot: Attempt, revision = 1): StorageResult<Attempt> => ({ kind: 'committed', value: { ...snapshot, revision } });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

describe('independent save queue fault boundaries', () => {
  it('rejects each changed identity independently without consuming the local sequence', async () => {
    const changes = [
      (value: Attempt) => { value.id = 'different'; },
      (value: Attempt) => { value.generation = 'different'; },
      (value: Attempt) => { value.writer.token = 'different'; },
      (value: Attempt) => { value.writer.epoch++; },
    ];
    for (const change of changes) {
      const initial = attemptFixture(), sends: Attempt[] = [];
      const queue = new AttemptSaveQueue(initial, { async save(snapshot) { sends.push(snapshot); return committed(snapshot); } }, () => {}, () => {});
      const invalid = structuredClone(initial); invalid.commandSeq = 1; change(invalid);
      expect(() => queue.enqueue(invalid)).toThrow();
      queue.enqueue({ ...initial, commandSeq: 1 }); expect((await queue.flush()).kind).toBe('committed');
      expect(sends).toHaveLength(1); expect(sends[0].id).toBe(initial.id); expect(sends[0].writer).toEqual(initial.writer);
    }
  });
  it('rejects one-field bad acknowledgements, retains dirty state and never acknowledges them', async () => {
    const changes = [
      (value: Attempt) => { value.id = 'different'; },
      (value: Attempt) => { value.generation = 'different'; },
      (value: Attempt) => { value.writer.token = 'different'; },
      (value: Attempt) => { value.writer.epoch++; },
      (value: Attempt) => { value.commandSeq = 0; },
      (value: Attempt) => { value.revision = 0; },
    ];
    for (const change of changes) {
      const initial = attemptFixture(), acknowledgements: Attempt[] = []; let sends = 0;
      const queue = new AttemptSaveQueue(initial, { async save(snapshot) {
        sends++; const invalid = structuredClone(snapshot); invalid.revision = 1; change(invalid); return { kind: 'committed', value: invalid };
      } }, value => acknowledgements.push(value), () => {});
      queue.enqueue({ ...initial, commandSeq: 1 }); expect((await queue.flush()).kind).toBe('corrupt');
      expect(acknowledgements).toEqual([]); expect(queue.state.pending).toBe(true); expect(queue.state.committedSeq).toBe(0);
      expect((await queue.retry()).kind).toBe('corrupt'); expect(sends).toBe(1);
    }
  });
  it('never retries permanent authority/integrity failures and permits harmless clean retry', async () => {
    for (const issue of [{ kind: 'conflict', reason: 'owner' }, { kind: 'corrupt', reason: 'state' }, { kind: 'unsupported-future', reason: 'schema' }] as const) {
      const initial = attemptFixture(); let sends = 0;
      const queue = new AttemptSaveQueue(initial, { async save(snapshot) { return ++sends === 1 ? issue : committed(snapshot); } }, () => {}, () => {});
      queue.enqueue({ ...initial, commandSeq: 1 }); expect(await queue.flush()).toEqual(issue);
      expect(await queue.retry()).toEqual(issue); expect(await queue.retry()).toEqual(issue); expect(sends).toBe(1);
    }
    const initial = attemptFixture(); let sends = 0;
    const clean = new AttemptSaveQueue(initial, { async save(snapshot) { sends++; return committed(snapshot); } }, () => {}, () => {});
    expect((await clean.retry()).kind).toBe('committed'); expect(sends).toBe(0);
    clean.enqueue({ ...initial, commandSeq: 1 }); await clean.flush(); expect((await clean.retry()).kind).toBe('committed'); expect(sends).toBe(1);
  });
  it('flushes one running save before the next and publishes its acknowledgement while the next remains pending', async () => {
    const initial = attemptFixture(), first = deferred<StorageResult<Attempt>>(), second = deferred<StorageResult<Attempt>>();
    const sends: Attempt[] = [], states: SaveState[] = [], order: string[] = [];
    const queue = new AttemptSaveQueue(initial, { save(snapshot) { sends.push(snapshot); order.push(`save${snapshot.commandSeq}`); return sends.length === 1 ? first.promise : second.promise; } },
      value => { order.push(`ack${value.commandSeq}`); }, state => { states.push(structuredClone(state)); });
    queue.enqueue({ ...initial, commandSeq: 1 }); await Promise.resolve();
    queue.enqueue({ ...initial, commandSeq: 2 }); const flushed = queue.flush(); await Promise.resolve();
    expect(sends).toHaveLength(1); expect(states.some(state => state.pending && state.committedSeq === 0)).toBe(true);
    first.resolve(committed(sends[0], 1));
    for (let n = 0; n < 20 && sends.length < 2; n++) await Promise.resolve();
    expect(sends).toHaveLength(2); expect(sends[1].revision).toBe(1);
    expect(order).toEqual(['save1', 'ack1', 'save2']); expect(states.some(state => state.pending && state.committedSeq === 1)).toBe(true);
    second.resolve(committed(sends[1], 2)); expect((await flushed).kind).toBe('committed');
    expect(states.at(-1)).toEqual({ committedSeq: 2, pending: false });
  });
  it('publishes retry as pending without the cleared failure before its delayed acknowledgement', async () => {
    const initial = attemptFixture(), gate = deferred<StorageResult<Attempt>>(), states: SaveState[] = [];
    let sends = 0, latest: Attempt | undefined;
    const queue = new AttemptSaveQueue(initial, { async save(snapshot) {
      latest = snapshot; return ++sends === 1 ? { kind: 'unavailable', reason: 'quota' } : gate.promise;
    } }, () => {}, state => { states.push(structuredClone(state)); });
    queue.enqueue({ ...initial, commandSeq: 1 }); expect((await queue.flush()).kind).toBe('unavailable');
    expect(states.at(-1)?.failure?.kind).toBe('unavailable'); const before = states.length;
    const retried = queue.retry(); await Promise.resolve();
    expect(sends).toBe(2); expect(states.slice(before).some(state => state.pending && state.failure === undefined)).toBe(true);
    gate.resolve(committed(latest!)); expect((await retried).kind).toBe('committed');
    expect(states.at(-1)).toEqual({ committedSeq: 1, pending: false });
  });
});
