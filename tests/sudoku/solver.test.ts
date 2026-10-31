import { describe, expect, it } from 'vitest';
import { countSolutions, isComplete } from '../../src/lib/sudoku';
import { exactCover, independentlyValidSolution } from '../../tools/catalog/oracle-exact-cover.ts';

const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);

describe('bounded exact MRV solver', () => {
  it('retains the declared MRV resource floor on an original independently certified subset', () => {
    // Original algebraic-grid subset, generator seed 0x5397 sample 0. No first-witness promise.
    // Dropping candidate cardinality or breaking on a nonsingleton exceeds this bound.
    const grid = '103406009400089003780123056004000801007800034000034507340670002670902345910345678';
    const independent = exactCover(grid, { nodeBudget: 1000000 });
    expect(independent.kind).toBe('complete'); if (independent.kind === 'complete') expect(independent.count).toBe(2);
    const result = countSolutions([...grid].map(Number), { nodeBudget: 42 });
    expect(result.kind).toBe('complete');
    if (result.kind === 'complete') {
      expect(result.count).toBe(2); expect(result.nodes).toBeLessThanOrEqual(42);
      expect(independentlyValidSolution(grid, result.solution!.join(''))).toBe(true);
    }
  });
  it('distinguishes valid full, unique, unsatisfiable, ambiguous and invalid', () => {
    expect(countSolutions(solved)).toEqual({ kind: 'complete', count: 1, solution: solved, nodes: 1 });
    const unique = [...solved]; unique[80] = 0;
    expect(countSolutions(unique)).toEqual({ kind: 'complete', count: 1, solution: solved, nodes: 2 });
    const unsat = Array(81).fill(0); for (let i = 0; i < 8; i++) unsat[i] = i + 1; unsat[17] = 9;
    expect(countSolutions(unsat)).toEqual({ kind: 'complete', count: 0, nodes: 1 });
    const ambiguous = solved.map(digit => digit <= 2 ? 0 : digit);
    const result = countSolutions(ambiguous);
    expect(result.kind).toBe('complete');
    if (result.kind === 'complete') { expect(result.count).toBe(2); expect(isComplete(result.solution, ambiguous)).toBe(true); }
    const invalid = [...solved]; invalid[80] = invalid[79];
    expect(countSolutions(invalid)).toEqual({ kind: 'invalid', reason: 'contradictory-clues' });
    expect(countSolutions([NaN])).toEqual({ kind: 'invalid', reason: 'board-length' });
  });
  it('saturates even the empty grid at two within a bounded traversal', () => {
    const result = countSolutions(Array(81).fill(0), { nodeBudget: 1000 });
    expect(result.kind).toBe('complete');
    if (result.kind === 'complete') { expect(result.count).toBe(2); expect(result.nodes).toBeLessThan(1000); expect(isComplete(result.solution)).toBe(true); }
  });
  it('reports unknown/aborted without leaked multiplicity and never mutates input', () => {
    const input = Object.freeze(Array(81).fill(0));
    expect(countSolutions(input, { nodeBudget: 0 })).toEqual({ kind: 'unknown', reason: 'budget', nodes: 0 });
    expect(countSolutions(input, { shouldAbort: () => true })).toEqual({ kind: 'aborted', nodes: 0 });
    expect(countSolutions(input, { shouldAbort: () => { throw new Error('cancel source failed'); } })).toEqual({ kind: 'unknown', reason: 'callback', nodes: 0 });
    let calls = 0;
    const result = countSolutions(input, { shouldAbort: () => ++calls > 20 });
    expect(result).toEqual({ kind: 'aborted', nodes: 20 });
    expect(input).toEqual(Array(81).fill(0));
    // The first completion is reached before this budget, but the search is not finished.
    const limited = countSolutions(input, { nodeBudget: 82 });
    expect(limited).toEqual({ kind: 'unknown', reason: 'budget', nodes: 82 });
    expect('count' in limited).toBe(false);
    expect(countSolutions(input).kind).toBe('complete');
  });
  it('validates options without coercion and respects budget on filled boards too', () => {
    for (const nodeBudget of [-1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER + 1]) expect(countSolutions(solved, { nodeBudget })).toEqual({ kind: 'invalid', reason: 'solver-options' });
    expect(countSolutions(solved, { shouldAbort: 3 as never })).toEqual({ kind: 'invalid', reason: 'solver-options' });
    expect(countSolutions(solved, { nodeBudget: 0 })).toEqual({ kind: 'unknown', reason: 'budget', nodes: 0 });
  });
  it('preserves multiplicity under digit/D4 and legal row/column transforms', () => {
    const input = solved.map(digit => digit <= 2 ? 0 : digit);
    for (let transform = 0; transform < 8; transform++) {
      const mapped = Array(81).fill(0);
      for (let cell = 0; cell < 81; cell++) {
        let row = Math.floor(cell / 9), col = cell % 9;
        if (transform >= 4) col = 8 - col;
        for (let rotation = 0; rotation < transform % 4; rotation++) [row, col] = [col, 8 - row];
        mapped[row * 9 + col] = input[cell] ? 10 - input[cell] : 0;
      }
      const result = countSolutions(mapped);
      expect(result.kind).toBe('complete'); if (result.kind === 'complete') expect(result.count).toBe(2);
    }
    for (const permutation of [[1, 0, 2, 3, 4, 5, 6, 7, 8], [3, 4, 5, 0, 1, 2, 6, 7, 8]]) {
      const mappedRows = Array.from({ length: 81 }, (_, c) => input[permutation[Math.floor(c / 9)] * 9 + c % 9]);
      const mappedCols = Array.from({ length: 81 }, (_, c) => input[Math.floor(c / 9) * 9 + permutation[c % 9]]);
      for (const mapped of [mappedRows, mappedCols]) {
        const result = countSolutions(mapped);
        expect(result.kind).toBe('complete'); if (result.kind === 'complete') expect(result.count).toBe(2);
      }
    }
  });
});
