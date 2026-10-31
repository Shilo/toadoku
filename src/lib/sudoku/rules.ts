import type { Board, Conflict, DecodeResult } from './types.ts';
import { ALL_DIGITS, assertCell, PEERS, UNITS } from './topology.ts';

export function decodeBoard(input: unknown): DecodeResult {
  if (!Array.isArray(input) || input.length !== 81) return { ok: false, reason: 'board-length' };
  if (Reflect.ownKeys(input).length !== 82) return { ok: false, reason: 'board-properties' };
  const board: number[] = Array(81);
  for (let cell = 0; cell < 81; cell++) {
    const value = input[cell];
    if (!Object.prototype.propertyIsEnumerable.call(input, cell) || !Number.isInteger(value) || value < 0 || value > 9) {
      return { ok: false, reason: 'board-cell' };
    }
    board[cell] = value;
  }
  // Caller array subclasses may override slice/species/iteration; copy only validated indices.
  return { ok: true, board: Object.freeze(board) };
}

/** Transport strings are deliberately stricter than friendly keyboard parsing. */
export function decodeGrid(input: unknown): DecodeResult {
  if (typeof input !== 'string' || !/^[0-9]{81}$/.test(input)) return { ok: false, reason: 'grid-format' };
  return { ok: true, board: Object.freeze(Array.from(input, char => char.charCodeAt(0) - 48)) };
}

function assertBoard(board: Board): void {
  if (!decodeBoard(board).ok) throw new RangeError('Invalid board');
}

/** Filled cells have no candidate bits. Conflicting but well-shaped boards are supported. */
export function getCandidates(board: Board, cell: number): number {
  assertBoard(board);
  assertCell(cell);
  if (board[cell] !== 0) return 0;
  let used = 0;
  for (const peer of PEERS[cell]) if (board[peer] !== 0) used |= 1 << (board[peer] - 1);
  return ALL_DIGITS & ~used;
}

export function findConflicts(board: Board): readonly Conflict[] {
  assertBoard(board);
  const conflicts: Conflict[] = [];
  for (let unit = 0; unit < UNITS.length; unit++) {
    const byDigit = Array.from({ length: 10 }, () => [] as number[]);
    for (const cell of UNITS[unit]) if (board[cell]) byDigit[board[cell]].push(cell);
    for (let digit = 1; digit <= 9; digit++) if (byDigit[digit].length > 1) {
      conflicts.push(Object.freeze({
        unit, kind: unit < 9 ? 'row' : unit < 18 ? 'column' : 'box',
        index: unit % 9, digit, cells: Object.freeze(byDigit[digit]),
      }));
    }
  }
  return Object.freeze(conflicts);
}

/** Validity checks original clues as well as every row, column and box. */
export function isComplete(input: unknown, givens?: unknown): boolean {
  const decoded = decodeBoard(input);
  if (!decoded.ok || decoded.board.includes(0)) return false;
  if (givens !== undefined) {
    const original = decodeBoard(givens);
    if (!original.ok || original.board.some((digit, cell) => digit !== 0 && digit !== decoded.board[cell])) return false;
  }
  for (const unit of UNITS) {
    let mask = 0;
    for (const cell of unit) mask |= 1 << (decoded.board[cell] - 1);
    if (mask !== ALL_DIGITS) return false;
  }
  return true;
}
