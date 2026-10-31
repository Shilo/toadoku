import { decodeBoard } from './rules.ts';
import { ALL_DIGITS } from './topology.ts';
import type { CountResult, SolverOptions } from './types.ts';

/** Exact MRV search. A second solution saturates the result; budget/abort never imply uniqueness. */
export function countSolutions(input: unknown, options: SolverOptions = {}): CountResult {
  const decoded = decodeBoard(input);
  if (!decoded.ok) return { kind: 'invalid', reason: decoded.reason };
  const budget = options.nodeBudget ?? 1_000_000;
  if (!Number.isSafeInteger(budget) || budget < 0 ||
      (options.shouldAbort !== undefined && typeof options.shouldAbort !== 'function')) {
    return { kind: 'invalid', reason: 'solver-options' };
  }
  const board = [...decoded.board];
  const rows = new Uint16Array(9);
  const columns = new Uint16Array(9);
  const boxes = new Uint16Array(9);
  for (let cell = 0; cell < 81; cell++) if (board[cell]) {
    const row = Math.floor(cell / 9), col = cell % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    const bit = 1 << (board[cell] - 1);
    if ((rows[row] | columns[col] | boxes[box]) & bit) return { kind: 'invalid', reason: 'contradictory-clues' };
    rows[row] |= bit; columns[col] |= bit; boxes[box] |= bit;
  }
  let nodes = 0;
  let count: 0 | 1 | 2 = 0;
  let solution: readonly number[] | undefined;
  let stopped: 'aborted' | 'budget' | 'callback' | undefined;
  function search(): void {
    try {
      if (options.shouldAbort?.()) { stopped = 'aborted'; return; }
    } catch { stopped = 'callback'; return; }
    if (nodes >= budget) { stopped = 'budget'; return; }
    nodes++;
    let target = -1, candidates = 0, minimum = 10;
    for (let cell = 0; cell < 81; cell++) if (board[cell] === 0) {
      const row = Math.floor(cell / 9), col = cell % 9;
      const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
      const mask = ALL_DIGITS & ~(rows[row] | columns[col] | boxes[box]);
      if (mask === 0) return;
      let size = 0;
      for (let bits = mask; bits; bits &= bits - 1) size++;
      if (size < minimum) { target = cell; candidates = mask; minimum = size; }
      if (size === 1) break;
    }
    if (target === -1) {
      count = count === 0 ? 1 : 2;
      if (!solution) solution = Object.freeze(board.slice());
      return;
    }
    const row = Math.floor(target / 9), col = target % 9;
    const box = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    for (let bits = candidates; bits !== 0; bits &= bits - 1) {
      const bit = bits & -bits;
      board[target] = 32 - Math.clz32(bit);
      rows[row] |= bit; columns[col] |= bit; boxes[box] |= bit;
      search();
      // Restore every assumption even when search was canceled or exhausted its budget.
      rows[row] &= ~bit; columns[col] &= ~bit; boxes[box] &= ~bit;
      board[target] = 0;
      if (stopped || count === 2) return;
    }
  }
  search();
  if (stopped === 'aborted') return { kind: 'aborted', nodes };
  if (stopped) return { kind: 'unknown', reason: stopped, nodes };
  return { kind: 'complete', count, ...(solution ? { solution } : {}), nodes };
}
