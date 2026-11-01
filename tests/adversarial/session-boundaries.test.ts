import { describe, expect, it } from 'vitest';
import { reduceAttempt } from '../../src/lib/session/reducer.ts';
import type { Attempt, CellChange, EditPatch } from '../../src/lib/gameplay/contracts.ts';
import { attemptFixture } from '../session/fixtures.ts';

function edit(state: Attempt, digit: number): Attempt {
  const result = reduceAttempt(state, { type: 'enter', digit });
  expect(result.kind).toBe('changed');
  if (result.kind !== 'changed') throw Error('Fixture edit failed');
  return result.attempt;
}

describe('independent session integrity and inclusive boundaries', () => {
  it('rejects every isolated malformed state field before a harmless selection', () => {
    const changes: ((state: Attempt) => void)[] = [
      state => { state.notes[1] = -1; }, state => { state.notes[1] = 512; },
      state => { state.entries = Array(80).fill(0); }, state => { state.entries[1] = 10; },
      state => { state.definition = { ...state.definition, givens: '0'.repeat(80) }; },
      state => { state.commandSeq = -1; }, state => { state.logicalRevision = -1; }, state => { state.elapsedMs = -1; },
      state => { state.entries[0] = 2; }, state => { state.notes[0] = 1; },
      state => { state.entries[1] = 2; state.notes[1] = 1; },
      state => { state.notes = Array(82); for (let cell = 0; cell < 81; cell++) state.notes[cell] = 0; },
    ];
    for (const change of changes) {
      const state = attemptFixture(); change(state);
      expect(reduceAttempt(state, { type: 'select', cell: 80 })).toEqual({ kind: 'integrity', reason: 'state' });
    }
  });

  it('refuses an otherwise real 513-edit history before unrelated commands', () => {
    let state = attemptFixture(); const fullHistory: EditPatch[] = [];
    for (let index = 0; index < 513; index++) {
      state = edit(state, index % 2 ? 2 : 1); fullHistory.push(structuredClone(state.undo.at(-1)!));
    }
    expect(state.undo).toHaveLength(512);
    state.undo = fullHistory;
    expect(reduceAttempt(state, { type: 'select', cell: 80 })).toEqual({ kind: 'integrity', reason: 'state' });
    expect(state.undo).toHaveLength(513);
  });

  it('accepts a zero elapsed checkpoint and rejects a negative checkpoint', () => {
    const state = attemptFixture(); expect(state.elapsedMs).toBe(0);
    expect(reduceAttempt(state, { type: 'checkpoint', elapsedMs: 0 })).toEqual({ kind: 'noop' });
    expect(reduceAttempt(state, { type: 'checkpoint', elapsedMs: -1 })).toEqual({ kind: 'rejected', reason: 'time' });
  });

  it('clears notes-only progress without changing the logical value revision', () => {
    const state = attemptFixture(); state.notes[1] = 1;
    const result = reduceAttempt(state, { type: 'restart' });
    expect(result.kind).toBe('changed');
    if (result.kind !== 'changed') throw Error('Expected a notes-only restart');
    expect(result.attempt.notes).toEqual(Array(81).fill(0));
    expect(result.attempt.entries).toEqual(state.entries);
    expect(result.attempt.commandSeq).toBe(state.commandSeq + 1);
    expect(result.attempt.logicalRevision).toBe(state.logicalRevision);
  });

  it('applies and undoes the complete 21-cell cleanup at the inclusive compound-edit limit', () => {
    const state = attemptFixture();
    // Pure session fixture only: no claim that these zero clues have catalog certification.
    state.definition = { ...state.definition, givens: '0'.repeat(81) }; state.selection = 40;
    const peers: number[] = [], row = 4, column = 4;
    for (let otherRow = 0; otherRow < 9; otherRow++) for (let otherColumn = 0; otherColumn < 9; otherColumn++) {
      const cell = 9 * otherRow + otherColumn;
      if (cell !== 40 && (otherRow === row || otherColumn === column || Math.floor(otherRow / 3) === 1 && Math.floor(otherColumn / 3) === 1)) peers.push(cell);
    }
    expect(peers).toHaveLength(20); expect(new Set(peers).size).toBe(20);
    for (const cell of [40, ...peers]) state.notes[cell] = 16;
    const before = structuredClone(state), edited = edit(state, 5);
    expect(edited.undo.at(-1)?.changes).toHaveLength(21);
    expect(new Set(edited.undo.at(-1)?.changes.map(change => change.cell))).toEqual(new Set([40, ...peers]));
    expect(edited.entries[40]).toBe(5); expect(edited.notes).toEqual(Array(81).fill(0));
    const undone = reduceAttempt(edited, { type: 'undo' });
    expect(undone.kind).toBe('changed');
    if (undone.kind !== 'changed') throw Error('Expected inclusive maximum compound undo');
    expect(undone.attempt.entries).toEqual(before.entries); expect(undone.attempt.notes).toEqual(before.notes);
    expect(undone.attempt.selection).toBe(40); expect(undone.attempt.undo).toEqual([]);
  });

  it('checks inverse primitive values independently of matching current after-values', () => {
    for (const field of ['beforeValue', 'beforeNotes'] as const) for (const invalid of [-1, field === 'beforeValue' ? 10 : 512, NaN, 0.5]) {
      const state = edit(attemptFixture(), 2);
      expect(state.entries[1]).toBe(2); expect(state.notes[1]).toBe(0);
      state.undo.at(-1)!.changes[0][field] = invalid;
      expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    }
    const clue = attemptFixture();
    const change: CellChange = { cell: 0, beforeValue: 2, afterValue: 0, beforeNotes: 0, afterNotes: 0 };
    clue.undo = [{ cell: 0, changes: [change] }];
    expect(reduceAttempt(clue, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    const incoherentBefore = edit(attemptFixture(), 2);
    Object.assign(incoherentBefore.undo.at(-1)!.changes[0], { beforeValue: 1, beforeNotes: 1 });
    expect(reduceAttempt(incoherentBefore, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
    const notesMismatch = attemptFixture(); notesMismatch.notes[1] = 1;
    notesMismatch.undo = [{ cell: 1, changes: [{ cell: 1, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 2 }] }];
    expect(reduceAttempt(notesMismatch, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'history' });
  });
});
