import { describe, expect, it } from 'vitest';
import { decodeTuple } from '../../src/lib/catalog/decode.ts';

// Original algebraic construction. These are schema fixtures, never certified catalog records.
// Unit constraint reference: https://www.norvig.com/sudoku.html
const solved = Array.from({ length: 81 }, (_, cell) => {
  const row = Math.floor(cell / 9), column = cell % 9;
  return (3 * (row % 3) + Math.floor(row / 3) + column) % 9 + 1;
});

/** Independent one-pass coordinate scan; imports no production rules or topology helpers. */
function brokenUnits(values: readonly number[]) {
  const rows: number[][] = Array.from({ length: 9 }, () => []);
  const columns: number[][] = Array.from({ length: 9 }, () => []);
  const boxes: number[][] = Array.from({ length: 9 }, () => []);
  for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
    const value = values[9 * row + column];
    rows[row].push(value);
    columns[column].push(value);
    boxes[3 * Math.floor(row / 3) + Math.floor(column / 3)].push(value);
  }
  const invalid = (units: number[][]) => units.filter(unit => new Set(unit).size !== 9).length;
  return { rows: invalid(rows), columns: invalid(columns), boxes: invalid(boxes) };
}

function tuple(solution: readonly number[]) {
  // IDs have valid transport shape only. No identity, uniqueness or provenance claim is made.
  return ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(12), '0'.repeat(81), solution.join(''), 10, 0];
}

describe('independent catalog solution-unit isolation', () => {
  it('accepts the original complete grid with all 27 units independently valid', () => {
    expect(brokenUnits(solved)).toEqual({ rows: 0, columns: 0, boxes: 0 });
    expect(decodeTuple(tuple(solved), 'easy').solution).toBe(solved.join(''));
  });

  it.each([
    ['rows', 0, 9, { rows: 2, columns: 0, boxes: 0 }],
    ['columns', 0, 1, { rows: 0, columns: 2, boxes: 0 }],
  ] as const)('rejects a solution invalid only in %s', (_kind, first, second, expected) => {
    const values = solved.slice();
    [values[first], values[second]] = [values[second], values[first]];
    expect(brokenUnits(values)).toEqual(expected);
    expect(() => decodeTuple(tuple(values), 'easy')).toThrow();
  });

  it('rejects a solution invalid only in boxes', () => {
    const values = solved.slice();
    for (let column = 0; column < 9; column++) {
      [values[column], values[27 + column]] = [values[27 + column], values[column]];
    }
    expect(brokenUnits(values)).toEqual({ rows: 0, columns: 0, boxes: 6 });
    expect(() => decodeTuple(tuple(values), 'easy')).toThrow();
  });
});
