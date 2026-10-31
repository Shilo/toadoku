import type { Attempt, CellChange, EditPatch } from '../gameplay/contracts.ts';
import { decodeBoard, decodeGrid, PEERS } from '../sudoku/index.ts';

export type SessionCommand =
  | { type: 'select'; cell: number }
  | { type: 'toggle-notes' }
  | { type: 'enter'; digit: number }
  | { type: 'erase' }
  | { type: 'undo' }
  | { type: 'restart' }
  | { type: 'checkpoint'; elapsedMs: number };
export type SessionResult =
  | { kind: 'changed'; attempt: Attempt; primaryCell?: number }
  | { kind: 'noop' }
  | { kind: 'rejected'; reason: 'cell' | 'digit' | 'clue' | 'filled-notes' | 'frozen' | 'time' }
  | { kind: 'integrity'; reason: 'state' | 'history' | 'overflow' };

export function getValues(attempt: Attempt): number[] {
  const givens = decodeGrid(attempt.definition.givens);
  const entries = decodeBoard(attempt.entries);
  if (!givens.ok || !entries.ok) throw new RangeError('Invalid session values');
  return givens.board.map((value, cell) => value || entries.board[cell]);
}

function validCell(cell: number): boolean { return Number.isInteger(cell) && cell >= 0 && cell < 81; }
function validNotes(notes: number[]): boolean {
  if (!Array.isArray(notes) || notes.length !== 81) return false;
  for (let cell = 0; cell < 81; cell++) if (!Object.hasOwn(notes, cell) || !Number.isInteger(notes[cell]) || notes[cell] < 0 || notes[cell] > 511) return false;
  return true;
}

/** Storage revisions/writer epochs belong to the repository, not the input reducer. */
export function reduceAttempt(attempt: Attempt, command: SessionCommand): SessionResult {
  const givens = decodeGrid(attempt.definition.givens);
  if (!givens.ok || !decodeBoard(attempt.entries).ok || !validNotes(attempt.notes) ||
      !validCell(attempt.selection) || !Array.isArray(attempt.undo) || attempt.undo.length > 512 ||
      !Number.isSafeInteger(attempt.commandSeq) || attempt.commandSeq < 0 ||
      !Number.isSafeInteger(attempt.logicalRevision) || attempt.logicalRevision < 0 ||
      !Number.isSafeInteger(attempt.elapsedMs) || attempt.elapsedMs < 0 ||
      givens.board.some((value, cell) => (value !== 0 && (attempt.entries[cell] !== 0 || attempt.notes[cell] !== 0)) ||
        (attempt.entries[cell] !== 0 && attempt.notes[cell] !== 0))) return { kind: 'integrity', reason: 'state' };

  function changed(fields: Partial<Attempt>, valuesChanged = false, primaryCell?: number): SessionResult {
    if (attempt.commandSeq === Number.MAX_SAFE_INTEGER || valuesChanged && attempt.logicalRevision === Number.MAX_SAFE_INTEGER) {
      return { kind: 'integrity', reason: 'overflow' };
    }
    return { kind: 'changed', attempt: { ...attempt, ...fields, commandSeq: attempt.commandSeq + 1,
      logicalRevision: attempt.logicalRevision + (valuesChanged ? 1 : 0) }, ...(primaryCell === undefined ? {} : { primaryCell }) };
  }
  if (command.type === 'select') {
    if (!validCell(command.cell)) return { kind: 'rejected', reason: 'cell' };
    return command.cell === attempt.selection ? { kind: 'noop' } : changed({ selection: command.cell });
  }
  if (attempt.status !== 'playing') return { kind: 'rejected', reason: 'frozen' };
  if (command.type === 'checkpoint') {
    if (!Number.isSafeInteger(command.elapsedMs) || command.elapsedMs < 0) return { kind: 'rejected', reason: 'time' };
    return command.elapsedMs <= attempt.elapsedMs ? { kind: 'noop' } : changed({ elapsedMs: command.elapsedMs });
  }
  if (command.type === 'toggle-notes') return changed({ notesMode: !attempt.notesMode });
  if (command.type === 'restart') {
    const valuesChanged = attempt.entries.some(Boolean);
    if (!valuesChanged && !attempt.notes.some(Boolean) && !attempt.undo.length) return { kind: 'noop' };
    return changed({ entries: Array(81).fill(0), notes: Array(81).fill(0), undo: [] }, valuesChanged);
  }
  if (command.type === 'undo') {
    const patch = attempt.undo.at(-1);
    if (!patch) return attempt.undo.length ? { kind: 'integrity', reason: 'history' } : { kind: 'noop' };
    if (!validCell(patch.cell) || !Array.isArray(patch.changes) || !patch.changes.length || patch.changes.length > 21) return { kind: 'integrity', reason: 'history' };
    const seen = new Set<number>();
    for (let index = 0; index < patch.changes.length; index++) {
      const change = patch.changes[index];
      if (!Object.hasOwn(patch.changes, index) || !change || typeof change !== 'object' ||
          !validCell(change.cell) || seen.has(change.cell) || givens.board[change.cell] !== 0 ||
          ![change.beforeValue, change.afterValue].every(n => Number.isInteger(n) && n >= 0 && n <= 9) ||
          ![change.beforeNotes, change.afterNotes].every(n => Number.isInteger(n) && n >= 0 && n <= 511) ||
          change.beforeValue !== 0 && change.beforeNotes !== 0 || change.afterValue !== 0 && change.afterNotes !== 0 ||
          attempt.entries[change.cell] !== change.afterValue || attempt.notes[change.cell] !== change.afterNotes) return { kind: 'integrity', reason: 'history' };
      seen.add(change.cell);
    }
    if (!seen.has(patch.cell)) return { kind: 'integrity', reason: 'history' };
    const entries = attempt.entries.slice(), notes = attempt.notes.slice();
    let valuesChanged = false;
    for (const change of patch.changes) {
      valuesChanged ||= change.beforeValue !== change.afterValue;
      entries[change.cell] = change.beforeValue; notes[change.cell] = change.beforeNotes;
    }
    return changed({ entries, notes, undo: attempt.undo.slice(0, -1), selection: patch.cell }, valuesChanged, patch.cell);
  }
  const cell = attempt.selection;
  if (givens.board[cell]) return { kind: 'rejected', reason: 'clue' };
  const entries = attempt.entries.slice(), notes = attempt.notes.slice();
  if (command.type === 'enter') {
    if (!Number.isInteger(command.digit) || command.digit < 1 || command.digit > 9) return { kind: 'rejected', reason: 'digit' };
    const bit = 1 << (command.digit - 1);
    if (attempt.notesMode) {
      if (entries[cell]) return { kind: 'rejected', reason: 'filled-notes' };
      notes[cell] ^= bit;
    } else {
      if (entries[cell] === command.digit) return { kind: 'noop' };
      entries[cell] = command.digit; notes[cell] = 0;
      for (const peer of PEERS[cell]) if (!givens.board[peer] && !entries[peer]) notes[peer] &= ~bit;
    }
  } else {
    if (!entries[cell] && !notes[cell]) return { kind: 'noop' };
    entries[cell] = 0; notes[cell] = 0;
  }
  const changes: CellChange[] = [];
  let valuesChanged = false;
  for (let index = 0; index < 81; index++) if (entries[index] !== attempt.entries[index] || notes[index] !== attempt.notes[index]) {
    changes.push({ cell: index, beforeValue: attempt.entries[index], afterValue: entries[index],
      beforeNotes: attempt.notes[index], afterNotes: notes[index] });
    valuesChanged ||= entries[index] !== attempt.entries[index];
  }
  const patch: EditPatch = { cell, changes };
  return changed({ entries, notes, undo: [...attempt.undo.slice(-511), patch] }, valuesChanged, cell);
}
