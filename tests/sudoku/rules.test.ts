import { describe, expect, it } from 'vitest';
import { ALL_DIGITS, CELL_UNITS, decodeBoard, decodeGrid, digitBit, findConflicts, getCandidates, isComplete, PEERS, UNITS } from '../../src/lib/sudoku';

// Original algebraic Latin-grid construction, no redistributed benchmark puzzles.
const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);

describe('strict Sudoku decoding', () => {
  it('copies and freezes exactly 81 integer values', () => {
    const input = Array(81).fill(0);
    const result = decodeBoard(input);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(Object.isFrozen(result.board)).toBe(true);
      input[0] = 9;
      expect(result.board[0]).toBe(0);
    }
    for (const value of [null, undefined, '0'.repeat(81), {}, Array(80).fill(0), Array(82).fill(0), Array(81)]) expect(decodeBoard(value).ok).toBe(false);
    for (const value of [NaN, Infinity, -1, 10, 1.5, true, false, undefined, '1', null]) {
      for (const cell of [0, 8, 26, 27, 53, 54, 80]) {
        const input = Array(81).fill(0); input[cell] = value;
        expect(decodeBoard(input).ok).toBe(false);
      }
    }
    const extra = Object.assign(Array(81).fill(0), { extra: 1 });
    expect(decodeBoard(extra)).toEqual({ ok: false, reason: 'board-properties' });
    const inherited = Array(81).fill(0); delete inherited[4];
    expect(decodeBoard(inherited).ok).toBe(false);
  });
  it('does not strip punctuation, spaces, dots or non-ASCII digits', () => {
    expect(decodeGrid(solved.join(''))).toEqual({ ok: true, board: solved });
    for (const input of [null, solved, '0'.repeat(80), '0'.repeat(82), '.'.repeat(81), ' '.repeat(81), '０'.repeat(81), '0'.repeat(81) + '\n']) {
      expect(decodeGrid(input).ok).toBe(false);
    }
  });
});

describe('independently expected topology and rules', () => {
  it('has exact memberships and every symmetric non-self peer', () => {
    expect(UNITS).toHaveLength(27);
    expect(Object.isFrozen(UNITS)).toBe(true);
    for (let cell = 0; cell < 81; cell++) {
      const row = Math.floor(cell / 9), column = cell % 9;
      const sameBox = (other: number) => Math.floor(Math.floor(other / 9) / 3) === Math.floor(row / 3) && Math.floor(other % 9 / 3) === Math.floor(column / 3);
      const peers = Array.from({ length: 81 }, (_, n) => n).filter(other => other !== cell && (Math.floor(other / 9) === row || other % 9 === column || sameBox(other)));
      expect(PEERS[cell]).toEqual(peers);
      expect(peers).toHaveLength(20);
      expect(CELL_UNITS[cell]).toHaveLength(3);
      for (const unit of CELL_UNITS[cell]) expect(UNITS[unit]).toContain(cell);
      for (const peer of PEERS[cell]) expect(PEERS[peer]).toContain(cell);
      expect(Object.isFrozen(PEERS[cell])).toBe(true);
    }
    for (const unit of UNITS) {
      expect(unit).toHaveLength(9);
      expect(new Set(unit).size).toBe(9);
      expect(Object.isFrozen(unit)).toBe(true);
    }
  });
  it('maps every blank/digit boundary with direct candidate reference', () => {
    expect(ALL_DIGITS).toBe(511);
    for (let digit = 1; digit <= 9; digit++) expect(digitBit(digit)).toBe(2 ** (digit - 1));
    for (const digit of [0, -1, 10, 1.5, NaN, Infinity]) expect(() => digitBit(digit)).toThrow(RangeError);
    let seed = 0x7531;
    for (let sample = 0; sample < 100; sample++) {
      const board = solved.map(value => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % 3 ? value : 0; });
      for (let cell = 0; cell < 81; cell++) {
        const row = Math.floor(cell / 9), col = cell % 9;
        let expected = 0;
        if (!board[cell]) for (let digit = 1; digit <= 9; digit++) {
          let allowed = true;
          for (let other = 0; other < 81; other++) if (board[other] === digit &&
            (Math.floor(other / 9) === row || other % 9 === col ||
             Math.floor(other / 27) === Math.floor(cell / 27) && Math.floor(other % 9 / 3) === Math.floor(col / 3))) allowed = false;
          if (allowed) expected += 2 ** (digit - 1);
        }
        expect(getCandidates(board, cell)).toBe(expected);
      }
    }
    for (const cell of [-1, 81, 0.5, NaN, Infinity]) expect(() => getCandidates(solved, cell)).toThrow(RangeError);
    expect(() => getCandidates([1], 0)).toThrow(RangeError);
    expect(() => findConflicts([NaN])).toThrow(RangeError);
    expect(getCandidates(Array(81).fill(0), 80)).toBe(511);
  });
  it('returns all duplicate participants per unit, not hidden solution errors', () => {
    const board = Array(81).fill(0);
    board[0] = 9; board[1] = 9; board[2] = 9; board[9] = 9;
    const actual = findConflicts(board);
    expect(actual).toEqual([
      { unit: 0, kind: 'row', index: 0, digit: 9, cells: [0, 1, 2] },
      { unit: 9, kind: 'column', index: 0, digit: 9, cells: [0, 9] },
      { unit: 18, kind: 'box', index: 0, digit: 9, cells: [0, 1, 2, 9] },
    ]);
    board.fill(0); board[80] = 8;
    expect(findConflicts(board)).toEqual([]);
    expect(findConflicts(solved)).toEqual([]);
  });
  it('checks all units and givens rather than only fullness', () => {
    expect(isComplete(solved)).toBe(true);
    expect(isComplete(solved, solved.map((n, i) => i % 2 ? n : 0))).toBe(true);
    expect(isComplete(Array(81).fill(1))).toBe(false);
    expect(isComplete(Array(81).fill(0))).toBe(false);
    expect(isComplete(solved.slice(1))).toBe(false);
    const wrong = [...solved]; wrong[80] = wrong[79];
    expect(isComplete(wrong)).toBe(false);
    const clue = Array(81).fill(0); clue[0] = 9;
    expect(isComplete(solved, clue)).toBe(false);
    expect(isComplete(solved, Array(81))).toBe(false);
    expect(isComplete(solved, {})).toBe(false);
    // Row/column-valid Latin square with invalid 3x3 boxes.
    const latin = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) + cell % 9) % 9 + 1);
    expect(isComplete(latin)).toBe(false);
  });
});
