import { describe, expect, it } from 'vitest';
import data from './residuals.v1.json';
import type { Conclusion, Deduction } from '../../src/lib/gameplay/contracts.ts';
import { findDeduction } from '../../src/lib/hints/detect.ts';
import { validateWitness } from '../../src/lib/hints/witness.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';

function consistent(values: number[]): boolean {
  for (let unit = 0; unit < 27; unit++) {
    const digits: number[] = [];
    for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
      if (unit < 9 ? row === unit : unit < 18 ? column === unit - 9
        : 3 * Math.floor(row / 3) + Math.floor(column / 3) === unit - 18) {
        const digit = values[9 * row + column]; if (digit) digits.push(digit);
      }
    }
    if (new Set(digits).size !== digits.length) return false;
  }
  return true;
}

function impossible(values: number[], conclusion: Conclusion): boolean {
  const forced = values.slice(); forced[conclusion.cell] = conclusion.digit;
  const result = exactCover(forced.join(''));
  return result.kind === 'invalid' || result.kind === 'complete' && result.count === 0;
}
function candidates(values: number[], cell: number): number[] {
  if (values[cell]) return [];
  const row = Math.floor(cell / 9), column = cell % 9, blocked = new Set<number>();
  for (let other = 0; other < 81; other++) {
    const otherRow = Math.floor(other / 9), otherColumn = other % 9;
    if (row === otherRow || column === otherColumn || Math.floor(row / 3) === Math.floor(otherRow / 3)
      && Math.floor(column / 3) === Math.floor(otherColumn / 3)) blocked.add(values[other]);
  }
  return Array.from({ length: 9 }, (_, index) => index + 1).filter(digit => !blocked.has(digit));
}

describe('strict witness residual regressions', () => {
  for (const fixture of data.cases) it(fixture.name, () => {
    const values = [...fixture.values].map(Number);
    // Protocol-negative cases deliberately cross the typed boundary with one malformed field.
    const deduction = structuredClone(fixture.deduction) as unknown as Deduction;
    const before = structuredClone({ values, deduction });
    expect(consistent(values)).toBe(true);
    const independent = exactCover(fixture.values);
    expect(independent.kind).toBe('complete');
    if (independent.kind !== 'complete') throw Error('Independent oracle did not finish');

    if ('control' in fixture) {
      const control = structuredClone(fixture.control) as unknown as Deduction;
      const controlBefore = structuredClone(control);
      expect(validateWitness(values, control)).toBe(true);
      for (const placement of control.placements) {
        const retained = values.slice(); retained[placement.cell] = placement.digit;
        const result = exactCover(retained.join(''));
        expect(result.kind === 'complete' && result.count > 0).toBe(true);
      }
      expect(control).toEqual(controlBefore);
    }
    if (fixture.category === 'hall-negative') {
      // These certify only rejection of a malformed local witness on globally unsatisfiable premises.
      // A zero-solution board cannot certify an elimination or a placement.
      expect(independent.count).toBe(0);
      if (fixture.name === 'unused-naked-digit-Hall') {
        expect(deduction.witness.digits).toContain(3);
        expect(deduction.witness.cells.every(cell => !candidates(values, cell).includes(3))).toBe(true);
      } else if (fixture.name === 'outside-hidden-house') {
        expect(deduction.witness.units).toEqual([0]); expect(deduction.witness.cells).toContain(9);
        expect(deduction.witness.cells.every(cell => Math.floor(cell / 9) === deduction.witness.units[0])).toBe(false);
      } else {
        expect(fixture.name).toBe('empty-hidden-member'); expect(deduction.witness.cells).toContain(2);
        expect(candidates(values, 2).some(digit => deduction.witness.digits.includes(digit))).toBe(false);
      }
    } else {
      expect(independent.count).toBeGreaterThan(0);
      if (!independent.solution) throw Error('Expected an independent completion');
      if (fixture.category === 'valid' || fixture.category === 'wrong-name') {
        expect(deduction.placements.length + deduction.eliminations.length).toBeGreaterThan(0);
        for (const conclusion of deduction.eliminations) expect(impossible(values, conclusion)).toBe(true);
        for (const { cell, digit } of deduction.placements) {
          const retained = values.slice(); retained[cell] = digit;
          const result = exactCover(retained.join(''));
          expect(result.kind === 'complete' && result.count > 0).toBe(true);
          for (let other = 1; other <= 9; other++) if (other !== digit)
            expect(impossible(values, { cell, digit: other })).toBe(true);
        }
      } else if (fixture.category === 'false-deduction') {
        const falseElimination = deduction.eliminations.some(({ cell, digit }) => {
          const forced = values.slice(); forced[cell] = digit;
          const result = exactCover(forced.join(''));
          return result.kind === 'complete' && result.count > 0;
        });
        const falsePlacement = deduction.placements.some(({ cell, digit }) => Number(independent.solution![cell]) !== digit);
        expect(falseElimination || falsePlacement).toBe(true);
      }
    }
    expect(validateWitness(values, deduction)).toBe(fixture.category === 'valid');
    expect({ values, deduction }).toEqual(before);
  });

  // Original algebraic completions provide constructive models; neither board is claimed unique.
  for (const fixture of [
    { name: 'detects three-site pointing with real outside candidates', technique: 'pointing', firstRow: '891234567',
      givens: [[9, 2], [10, 3], [11, 4], [18, 5], [19, 6], [20, 7]],
      sourceCells: [0, 1, 2, 9, 10, 11, 18, 19, 20], units: [18, 0], removed: [3, 4, 5, 6, 7, 8] },
    { name: 'detects claiming into the top-left box', technique: 'claiming', firstRow: '123456789',
      givens: [[3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9]],
      sourceCells: [0, 1, 2, 3, 4, 5, 6, 7, 8], units: [0, 18], removed: [9, 10, 11, 18, 19, 20] },
  ] as const) it(fixture.name, () => {
    const shifts = [0, 3, 6, 1, 4, 7, 2, 5, 8];
    const completion = Array.from({ length: 81 }, (_, cell) => Number(fixture.firstRow[(cell % 9 + shifts[Math.floor(cell / 9)]) % 9]));
    const values = Array<number>(81).fill(0);
    for (const [cell, digit] of fixture.givens) values[cell] = digit;
    expect(completion).toHaveLength(81);
    expect(completion.every(digit => Number.isInteger(digit) && digit >= 1 && digit <= 9)).toBe(true);
    expect(consistent(completion)).toBe(true);
    expect(values.every((digit, cell) => digit === 0 || digit === completion[cell])).toBe(true);
    expect(fixture.sourceCells.filter(cell => candidates(values, cell).includes(1))).toEqual([0, 1, 2]);
    for (const cell of fixture.removed) expect(candidates(values, cell)).toContain(1);
    const valuesBefore = values.slice(); Object.freeze(values);
    const deduction = findDeduction(values, 0, fixture.technique);
    expect(deduction).toBeDefined();
    if (!deduction) throw Error('Expected the named intersection deduction');
    const proofBefore = structuredClone(deduction);
    expect(deduction.technique).toBe(fixture.technique);
    expect(deduction.witness.units).toEqual(fixture.units);
    expect(new Set(deduction.witness.cells)).toEqual(new Set([0, 1, 2]));
    expect(deduction.witness.cells).toHaveLength(3); expect(deduction.witness.digits).toEqual([1]);
    expect(deduction.placements).toEqual([]); expect(deduction.eliminations).toHaveLength(6);
    expect(new Set(deduction.eliminations.map(({ cell, digit }) => cell + ':' + digit)))
      .toEqual(new Set(fixture.removed.map(cell => cell + ':1')));
    expect(validateWitness(values, deduction)).toBe(true);
    for (const conclusion of deduction.eliminations) expect(impossible(values, conclusion)).toBe(true);
    expect(values).toEqual(valuesBefore); expect(deduction).toEqual(proofBefore);
  });

});
