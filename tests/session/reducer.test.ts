import { describe, expect, it } from 'vitest';
import { getValues, reduceAttempt } from '../../src/lib/session/index.ts';
import type { Attempt } from '../../src/lib/gameplay/contracts.ts';
import type { SessionCommand } from '../../src/lib/session/index.ts';
import { attemptFixture } from './fixtures.ts';

function command(attempt: Attempt, input: SessionCommand): Attempt {
  const result = reduceAttempt(attempt, input);
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') throw new Error(result.kind);
  return result.attempt;
}

describe('session editing and monotone history', () => {
  it('does not mutate frozen compound-edit or inverse inputs', () => {
    function deepFreeze<T>(value: T): T {
      if (value && typeof value === 'object') { Object.freeze(value); for (const item of Object.values(value)) deepFreeze(item); }
      return value;
    }
    const original = attemptFixture(); original.notes[1] = 511; original.notes[2] = 511;
    const before = structuredClone(original); deepFreeze(original);
    const edited = command(original, { type: 'enter', digit: 9 });
    expect(original).toEqual(before);
    const editedBefore = structuredClone(edited); deepFreeze(edited);
    const undone = command(edited, { type: 'undo' });
    expect(edited).toEqual(editedBefore);
    expect(undone.entries).toEqual(before.entries); expect(undone.notes).toEqual(before.notes);
  });
  it('keeps clues separate, same values no-op, and filled cells refuse notes', () => {
    let state = attemptFixture();
    expect(getValues(state)[0]).toBe(1); expect(state.entries[0]).toBe(0);
    state = command(state, { type: 'select', cell: 0 });
    for (const input of [{ type: 'enter', digit: 9 }, { type: 'erase' }] as SessionCommand[]) {
      expect(reduceAttempt(state, input)).toEqual({ kind: 'rejected', reason: 'clue' });
    }
    expect(state.undo).toHaveLength(0);
    state = command(state, { type: 'select', cell: 80 });
    state = command(state, { type: 'enter', digit: 9 });
    expect(reduceAttempt(state, { type: 'enter', digit: 9 })).toEqual({ kind: 'noop' });
    state = command(state, { type: 'toggle-notes' });
    expect(reduceAttempt(state, { type: 'enter', digit: 3 })).toEqual({ kind: 'rejected', reason: 'filled-notes' });
    expect(state.notes[80]).toBe(0);
    expect(state.logicalRevision).toBe(1);
  });
  it('undo restores whole peer-note cleanup and overwritten value in one edit', () => {
    let state = attemptFixture();
    state.notes[1] = 511; state.notes[2] = 511; state.notes[10] = 511; state.notes[80] = 511;
    const before = structuredClone(state);
    state = command(state, { type: 'enter', digit: 9 });
    expect(state.notes[1]).toBe(0); expect(state.notes[2]).toBe(255); expect(state.notes[10]).toBe(255); expect(state.notes[80]).toBe(511);
    expect(state.undo).toHaveLength(1);
    state.assistance = { used: true, exposed: [1] }; state.elapsedMs = 10000;
    state = command(state, { type: 'undo' });
    expect(state.entries).toEqual(before.entries); expect(state.notes).toEqual(before.notes);
    expect(state.assistance).toEqual({ used: true, exposed: [1] }); expect(state.elapsedMs).toBe(10000);
    expect(state.logicalRevision).toBe(2); expect(state.selection).toBe(1);
    state.notes.fill(0);
    state = command(state, { type: 'enter', digit: 2 });
    state = command(state, { type: 'enter', digit: 8 });
    state = command(state, { type: 'undo' });
    expect(state.entries[1]).toBe(2);
  });
  it('notes toggle, erase and restart retain knowledge/time/pending disclosures', () => {
    let state = command(attemptFixture(), { type: 'toggle-notes' });
    for (let digit = 1; digit <= 9; digit++) state = command(state, { type: 'enter', digit });
    expect(state.notes[1]).toBe(511); expect(state.logicalRevision).toBe(0);
    state = command(state, { type: 'enter', digit: 9 }); expect(state.notes[1]).toBe(255);
    state = command(state, { type: 'erase' }); expect(state.notes[1]).toBe(0);
    state = command(state, { type: 'undo' }); expect(state.notes[1]).toBe(255);
    state.assistance = { used: true, exposed: [1] }; state.elapsedMs = 1234;
    state.pendingDisclosure = { id: 'help', attemptId: state.id, logicalRevision: 0, payload: { kind: 'reveal', logicalRevision: 0, cell: 1, digit: 2 }, exposed: [1], information: true };
    const disclosure = state.pendingDisclosure;
    state = command(state, { type: 'restart' });
    expect(state.undo).toHaveLength(0); expect(state.notes.every(n => n === 0)).toBe(true);
    expect(state.logicalRevision).toBe(0); expect(state.elapsedMs).toBe(1234);
    expect(state.assistance).toEqual({ used: true, exposed: [1] }); expect(state.pendingDisclosure).toBe(disclosure);
    expect(reduceAttempt(state, { type: 'restart' })).toEqual({ kind: 'noop' });
  });
  it('bounds undo at 511/512/513 edits and survives reload', () => {
    let state = attemptFixture();
    for (let edit = 1; edit <= 513; edit++) {
      state = command(state, { type: 'enter', digit: edit % 2 ? 1 : 2 });
      if (edit >= 511) expect(state.undo).toHaveLength(Math.min(512, edit));
    }
    state = structuredClone(state);
    for (let undo = 0; undo < 512; undo++) state = command(state, { type: 'undo' });
    expect(state.entries[1]).toBe(1); // oldest edit is outside the bounded window
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'noop' });
  });
  it('freezes solved barriers and refuses invalid input/corrupt inverse/overflow', () => {
    for (const status of ['pending-completion', 'completed', 'retired'] as const) {
      const state = attemptFixture(); state.status = status; state.elapsedMs = 500;
      for (const input of [{ type: 'enter', digit: 2 }, { type: 'undo' }, { type: 'restart' }, { type: 'checkpoint', elapsedMs: 1000 }, { type: 'toggle-notes' }] as SessionCommand[]) expect(reduceAttempt(state, input)).toEqual({ kind: 'rejected', reason: 'frozen' });
      expect(command(state, { type: 'select', cell: 80 }).elapsedMs).toBe(500);
    }
    for (const cell of [-1, 81, NaN, 0.5]) expect(reduceAttempt(attemptFixture(), { type: 'select', cell })).toEqual({ kind: 'rejected', reason: 'cell' });
    for (const digit of [-1, 0, 10, NaN, 0.5]) expect(reduceAttempt(attemptFixture(), { type: 'enter', digit })).toEqual({ kind: 'rejected', reason: 'digit' });
    let state = command(attemptFixture(), { type: 'enter', digit: 2 });
    state.entries[1] = 3;
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    for (const malformed of [Array(1), [undefined], [null], Array.from({ length: 22 }, (_, cell) => ({ cell: cell + 1, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 0 }))]) {
      state = attemptFixture(); state.undo = [{ cell: 1, changes: malformed as never }];
      expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    }
    state = attemptFixture(); state.undo = Array(1);
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    state = attemptFixture(); state.undo = [undefined as never];
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    state = command(attemptFixture(), { type: 'enter', digit: 2 }); state.undo[0].cell = 80;
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    state = attemptFixture(); state.commandSeq = Number.MAX_SAFE_INTEGER;
    expect(reduceAttempt(state, { type: 'enter', digit: 2 })).toEqual({ kind: 'integrity', reason: 'overflow' });
    state = attemptFixture(); state.logicalRevision = Number.MAX_SAFE_INTEGER;
    expect(reduceAttempt(state, { type: 'enter', digit: 2 })).toEqual({ kind: 'integrity', reason: 'overflow' });
    state = attemptFixture(); state.notes = Array(81);
    expect(reduceAttempt(state, { type: 'erase' })).toEqual({ kind: 'integrity', reason: 'state' });
    expect(() => getValues({ ...attemptFixture(), entries: [] })).toThrow(RangeError);
    state = attemptFixture();
    expect(reduceAttempt(state, { type: 'erase' })).toEqual({ kind: 'noop' });
    expect(reduceAttempt(state, { type: 'select', cell: 1 })).toEqual({ kind: 'noop' });
    expect(reduceAttempt(state, { type: 'checkpoint', elapsedMs: NaN })).toEqual({ kind: 'rejected', reason: 'time' });
    state = command(state, { type: 'checkpoint', elapsedMs: 3000 });
    expect(state.logicalRevision).toBe(0);
    expect(reduceAttempt(state, { type: 'checkpoint', elapsedMs: 2000 })).toEqual({ kind: 'noop' });
  });
  it('rejects malformed, hidden, symbolic and compensating history data without mutation', () => {
    const original = attemptFixture(), edited = command(original, { type: 'enter', digit: 2 });
    const editedBefore = structuredClone(edited), restored = command(edited, { type: 'undo' });
    expect(restored.entries).toEqual(original.entries); expect(restored.notes).toEqual(original.notes);
    expect(edited).toEqual(editedBefore);
    const callable = Object.freeze(Object.assign(() => undefined, { ...edited.undo[0].changes[0] }));
    for (const changes of [null, [callable]]) {
      const state = structuredClone(edited); state.undo[0].changes = changes as never;
      if (changes) Object.freeze(changes);
      Object.freeze(state.entries); Object.freeze(state.notes); Object.freeze(state.undo[0]); Object.freeze(state.undo); Object.freeze(state);
      expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
      expect(state).toEqual({ ...edited, undo: [{ ...edited.undo[0], changes }] });
    }
    for (const field of ['notes', 'undo', 'changes'] as const) for (const attack of ['hidden-index', 'hidden-extra', 'symbol', 'compensating'] as const) {
      const state = structuredClone(edited);
      const array = field === 'notes' ? state.notes : field === 'undo' ? state.undo : state.undo[0].changes;
      if (attack === 'hidden-index' || attack === 'compensating') Object.defineProperty(array, 0, { enumerable: false });
      if (attack === 'hidden-extra') Object.defineProperty(array, 'extra', { value: true });
      if (attack === 'symbol') Object.defineProperty(array, Symbol('extra'), { value: true });
      if (attack === 'compensating') Object.assign(array, { extra: true });
      expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: field === 'notes' ? 'state' : 'history' });
    }
  });
});
