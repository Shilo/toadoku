import { describe, expect, it } from 'vitest';
import original from '../fixtures/techniques/original.v1.json';
import type { Deduction, Technique } from '../../src/lib/gameplay/contracts.ts';
import { findDeduction, validateWitness } from '../../src/lib/hints/index.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';

const fixtures = original.fixtures as { technique: Technique; values: string; deduction: Deduction }[];
function house(unit: number): number[] {
  const cells: number[] = [];
  for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
    if (unit < 9 ? row === unit : unit < 18 ? column === unit - 9 : 3 * Math.floor(row / 3) + Math.floor(column / 3) === unit - 18) cells.push(9 * row + column);
  }
  return cells;
}

function translated(fixture: typeof fixtures[number], digitShift: number, bandShift: number, stackShift: number) {
  const digitMap = (digit: number) => digit ? (digit - 1 + digitShift) % 9 + 1 : 0;
  const cellMap = (cell: number) => {
    const row = Math.floor(cell / 9), column = cell % 9;
    const nextRow = 3 * ((Math.floor(row / 3) + bandShift) % 3) + row % 3;
    const nextColumn = 3 * ((Math.floor(column / 3) + stackShift) % 3) + column % 3;
    return 9 * nextRow + nextColumn;
  };
  const unitMap = (unit: number) => {
    const mapped = house(unit).map(cellMap);
    const found = Array.from({ length: 27 }, (_, candidate) => candidate).find(candidate => house(candidate).every(cell => mapped.includes(cell)));
    if (found === undefined) throw Error('Transformation did not preserve a complete house');
    return found;
  };
  expect(new Set(Array.from({ length: 81 }, (_, cell) => cellMap(cell))).size).toBe(81);
  const values = Array(81).fill(0);
  for (let cell = 0; cell < 81; cell++) values[cellMap(cell)] = digitMap(Number(fixture.values[cell]));
  const proof = structuredClone(fixture.deduction);
  proof.witness = { units: proof.witness.units.map(unitMap), cells: proof.witness.cells.map(cellMap), digits: proof.witness.digits.map(digitMap) };
  for (const field of ['placements', 'eliminations'] as const) proof[field] = proof[field].map(({ cell, digit }) => ({ cell: cellMap(cell), digit: digitMap(digit) }));
  return { values, proof };
}

function prove(values: number[], deduction: Deduction): void {
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
}

describe('independent positive hint expansions', () => {
  it('retains every original fixture across nine digit cycles and nine band/stack translations', () => {
    expect(fixtures).toHaveLength(21);
    let cases = 0;
    const kinds = new Set<Technique>(), claimedDigits = new Set<number>(), claimedUnits = new Set<number>();
    const transformations = [
      ...Array.from({ length: 9 }, (_, shift) => ({ digit: shift, band: 0, stack: 0 })),
      ...Array.from({ length: 9 }, (_, index) => ({ digit: 0, band: Math.floor(index / 3), stack: index % 3 })),
    ];
    for (const fixture of fixtures) for (const transformation of transformations) {
      const { values, proof } = translated(fixture, transformation.digit, transformation.band, transformation.stack);
      const independent = exactCover(values.join(''));
      expect(independent.kind === 'complete' && independent.count > 0).toBe(true);
      prove(values, proof);
      const detected = findDeduction(values, 0, fixture.technique);
      expect(detected?.technique).toBe(fixture.technique);
      if (!detected) throw Error('A preserved named technique disappeared');
      prove(values, detected);
      kinds.add(detected.technique); detected.witness.digits.forEach(digit => claimedDigits.add(digit)); detected.witness.units.forEach(unit => claimedUnits.add(unit));
      cases++;
    }
    // Two independent 9-case families, not their Cartesian product. Identity appears in both.
    expect(cases).toBe(378); expect(kinds.size).toBe(9);
    expect([...claimedDigits].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(claimedUnits.size).toBe(27);
  });
});
