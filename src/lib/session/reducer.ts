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
  | { kind: 'changed'; attempt: Attempt }
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
function copyNotes(notes: number[]): number[] | undefined {
  if (!Array.isArray(notes) || notes.length !== 81 || Reflect.ownKeys(notes).length !== 82) return;
  const copy: number[] = [];
  for (let cell = 0; cell < 81; cell++) {
    if (!Object.prototype.propertyIsEnumerable.call(notes, cell)) return;
    const value = notes[cell];
    if (!Number.isInteger(value) || value < 0 || value > 511) return;
    copy.push(value);
  }
  return copy;
}

/** Storage revisions/writer epochs belong to the repository, not the input reducer. */
export function reduceAttempt(attempt: Attempt, command: SessionCommand): SessionResult {
  const givens = decodeGrid(attempt.definition.givens);
  if (!givens.ok) return { kind: 'integrity', reason: 'state' };
  const decodedEntries = decodeBoard(attempt.entries);
  if (!decodedEntries.ok) return { kind: 'integrity', reason: 'state' };
  const previousEntries = decodedEntries.board, previousNotes = copyNotes(attempt.notes), originalUndo = attempt.undo;
  if (!previousNotes || !validCell(attempt.selection) || !Array.isArray(originalUndo) || originalUndo.length > 512 ||
      !Number.isSafeInteger(attempt.commandSeq) || attempt.commandSeq < 0 ||
      !Number.isSafeInteger(attempt.logicalRevision) || attempt.logicalRevision < 0 ||
      !Number.isSafeInteger(attempt.elapsedMs) || attempt.elapsedMs < 0 ||
      givens.board.some((value, cell) => (value !== 0 && (previousEntries[cell] !== 0 || previousNotes[cell] !== 0)) ||
        (previousEntries[cell] !== 0 && previousNotes[cell] !== 0))) return { kind: 'integrity', reason: 'state' };
  if (Reflect.ownKeys(originalUndo).length !== originalUndo.length + 1) return { kind: 'integrity', reason: 'history' };
  const history: EditPatch[] = [];
  for (let index = 0; index < originalUndo.length; index++) {
    if (!Object.prototype.propertyIsEnumerable.call(originalUndo, index)) return { kind: 'integrity', reason: 'history' };
    history.push(originalUndo[index]);
  }

  function changed(fields: Partial<Attempt>, valuesChanged = false): SessionResult {
    if (attempt.commandSeq === Number.MAX_SAFE_INTEGER || valuesChanged && attempt.logicalRevision === Number.MAX_SAFE_INTEGER) {
      return { kind: 'integrity', reason: 'overflow' };
    }
    return { kind: 'changed', attempt: { ...attempt, ...fields, commandSeq: attempt.commandSeq + 1,
      logicalRevision: attempt.logicalRevision + (valuesChanged ? 1 : 0) } };
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
    const valuesChanged = previousEntries.some(Boolean);
    if (!valuesChanged && !previousNotes.some(Boolean) && !history.length) return { kind: 'noop' };
    return changed({ entries: Array(81).fill(0), notes: Array(81).fill(0), undo: [] }, valuesChanged);
  }
  if (command.type === 'undo') {
    const patch = history[history.length - 1];
    if (!patch) return history.length ? { kind: 'integrity', reason: 'history' } : { kind: 'noop' };
    const primaryCell = patch.cell, originalChanges = patch.changes;
    if (!validCell(primaryCell) || !Array.isArray(originalChanges) || !originalChanges.length || originalChanges.length > 21 || Reflect.ownKeys(originalChanges).length !== originalChanges.length + 1) return { kind: 'integrity', reason: 'history' };
    const seen = new Set<number>(), validatedChanges: CellChange[] = [];
    for (let index = 0; index < originalChanges.length; index++) {
      if (!Object.prototype.propertyIsEnumerable.call(originalChanges, index)) return { kind: 'integrity', reason: 'history' };
      const originalChange = originalChanges[index];
      if (!originalChange || typeof originalChange !== 'object') return { kind: 'integrity', reason: 'history' };
      // Capture the checked data once; caller iterators/methods must not retarget an undo.
      const change: CellChange = { cell: originalChange.cell, beforeValue: originalChange.beforeValue, afterValue: originalChange.afterValue,
        beforeNotes: originalChange.beforeNotes, afterNotes: originalChange.afterNotes };
      if (!validCell(change.cell) || seen.has(change.cell) || givens.board[change.cell] !== 0 ||
          ![change.beforeValue, change.afterValue].every(n => Number.isInteger(n) && n >= 0 && n <= 9) ||
          ![change.beforeNotes, change.afterNotes].every(n => Number.isInteger(n) && n >= 0 && n <= 511) ||
          change.beforeValue !== 0 && change.beforeNotes !== 0 || change.afterValue !== 0 && change.afterNotes !== 0 ||
          previousEntries[change.cell] !== change.afterValue || previousNotes[change.cell] !== change.afterNotes) return { kind: 'integrity', reason: 'history' };
      seen.add(change.cell);
      validatedChanges.push(change);
    }
    if (!seen.has(primaryCell)) return { kind: 'integrity', reason: 'history' };
    const entries = previousEntries.slice(), notes = previousNotes.slice();
    let valuesChanged = false;
    for (const change of validatedChanges) {
      valuesChanged ||= change.beforeValue !== change.afterValue;
      entries[change.cell] = change.beforeValue; notes[change.cell] = change.beforeNotes;
    }
    return changed({ entries, notes, undo: history.slice(0, -1), selection: primaryCell }, valuesChanged);
  }
  const cell = attempt.selection;
  if (givens.board[cell]) return { kind: 'rejected', reason: 'clue' };
  const entries = previousEntries.slice(), notes = previousNotes.slice();
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
  for (let index = 0; index < 81; index++) if (entries[index] !== previousEntries[index] || notes[index] !== previousNotes[index]) {
    changes.push({ cell: index, beforeValue: previousEntries[index], afterValue: entries[index],
      beforeNotes: previousNotes[index], afterNotes: notes[index] });
    valuesChanged ||= entries[index] !== previousEntries[index];
  }
  const patch: EditPatch = { cell, changes };
  return changed({ entries, notes, undo: [...history.slice(-511), patch] }, valuesChanged);
}
