import { describe, expect, it } from 'vitest';
import data from '../fixtures/techniques/default.v1.json';
import type { Technique } from '../../src/lib/gameplay/contracts.ts';
import { findDeduction } from '../../src/lib/hints/detect.ts';
import { validateWitness } from '../../src/lib/hints/witness.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';

describe('normal hint dispatcher on independently certified value states', () => {
  for (const fixture of data.fixtures) it(`reaches ${fixture.technique} without a technique override`, () => {
    const values = [...fixture.values].map(Number);
    expect(fixture.solution).toMatch(/^[1-9]{81}$/);
    for (let cell = 0; cell < 81; cell++) {
      if (fixture.givens[cell] !== '0') expect(fixture.values[cell]).toBe(fixture.givens[cell]);
      if (values[cell]) expect(String(values[cell])).toBe(fixture.solution[cell]);
    }
    // The Algorithm X implementation builds its own constraints and has no Sudoku imports.
    const independent = exactCover(fixture.values);
    expect(independent.kind === 'complete' && independent.count > 0).toBe(true);
    const deduction = findDeduction(values, 0);
    expect(deduction?.technique).toBe(fixture.technique as Technique);
    if (!deduction) throw Error('Expected a supported normal-dispatch deduction');
    expect(validateWitness(values, deduction)).toBe(true);
    for (const { cell, digit } of deduction.eliminations) {
      const forced = values.slice(); forced[cell] = digit;
      const result = exactCover(forced.join(''));
      expect(result.kind === 'invalid' || result.kind === 'complete' && result.count === 0).toBe(true);
    }
    for (const { cell, digit } of deduction.placements) for (let other = 1; other <= 9; other++) if (other !== digit) {
      const forced = values.slice(); forced[cell] = other;
      const result = exactCover(forced.join(''));
      expect(result.kind === 'invalid' || result.kind === 'complete' && result.count === 0).toBe(true);
    }
  });
});
