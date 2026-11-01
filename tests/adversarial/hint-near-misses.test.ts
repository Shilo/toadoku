import { describe, expect, it } from 'vitest';
import original from '../fixtures/techniques/original.v1.json';
import defaults from '../fixtures/techniques/default.v1.json';
import type { Deduction, Technique } from '../../src/lib/gameplay/contracts.ts';
import { validateWitness } from '../../src/lib/hints/witness.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';

const fixtures = original.fixtures as { technique: Technique; values: string; deduction: Deduction }[];
const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);
const house = (unit: number) => Array.from({ length: 81 }, (_, cell) => cell).filter(cell => unit < 9 ? Math.floor(cell / 9) === unit : unit < 18 ? cell % 9 === unit - 9 : 3 * Math.floor(cell / 27) + Math.floor(cell % 9 / 3) === unit - 18);
function candidates(values: number[], cell: number): number[] {
  if (values[cell]) return [];
  const used = new Set<number>(), row = Math.floor(cell / 9), column = cell % 9;
  for (let other = 0; other < 81; other++) if (Math.floor(other / 9) === row || other % 9 === column || Math.floor(other / 27) === Math.floor(row / 3) && Math.floor(other % 9 / 3) === Math.floor(column / 3)) used.add(values[other]);
  return Array.from({ length: 9 }, (_, n) => n + 1).filter(digit => !used.has(digit));
}
const removals = (values: number[], cells: number[], digits: number[]) => cells.flatMap(cell => candidates(values, cell).filter(digit => digits.includes(digit)).map(digit => ({ cell, digit })));
function solution(values: number[]): string {
  const independent = exactCover(values.join(''));
  expect(independent.kind === 'complete' && independent.count > 0).toBe(true);
  if (independent.kind !== 'complete' || !independent.solution) throw Error('Expected a satisfiable value-state fixture');
  return independent.solution;
}
function rejectsFalseClaim(values: number[], proof: Deduction): void {
  const actual = solution(values);
  expect(proof.eliminations.some(({ cell, digit }) => Number(actual[cell]) === digit) || proof.placements.some(({ cell, digit }) => Number(actual[cell]) !== digit)).toBe(true);
  expect(validateWitness(values, proof)).toBe(false);
}

describe('coherent named-hint near misses', () => {
  it('rejects unsupported metadata and unsafe mixed conclusions on otherwise valid premises', () => {
    for (const fixture of fixtures) {
      const values = [...fixture.values].map(Number), actual = solution(values);
      expect(validateWitness(values, fixture.deduction)).toBe(true);
      const proof = structuredClone(fixture.deduction);
      if (fixture.technique.endsWith('single')) {
        proof.eliminations = [{ ...proof.placements[0] }];
        rejectsFalseClaim(values, proof);
        proof.eliminations = []; proof.placements = [];
        expect(validateWitness(values, proof)).toBe(false);
      } else {
        const cell = proof.witness.cells[0], digit = Number(actual[cell]) % 9 + 1;
        proof.placements = [{ cell, digit }]; rejectsFalseClaim(values, proof);
      }
      if (fixture.technique !== 'x-wing') {
        const extra = structuredClone(fixture.deduction);
        extra.witness.units.push(Array.from({ length: 27 }, (_, n) => n).find(unit => !extra.witness.units.includes(unit))!);
        expect(validateWitness(values, extra)).toBe(false);
      }
      for (const [field, minimum, count] of [['units', 0, 27], ['cells', 0, 81], ['digits', 1, 9]] as const) {
        const originalItems = fixture.deduction.witness[field];
        const unused = Array.from({ length: count }, (_, index) => index + minimum).find(item => !originalItems.includes(item));
        if (unused === undefined) throw Error('Expected an unused in-domain witness item');
        const changedItems = [[...originalItems, unused], ...(originalItems.length ? [originalItems.slice(1)] : [])];
        for (const items of changedItems) {
          const changed = structuredClone(fixture.deduction); changed.witness[field] = items;
          if (field === 'cells' && (fixture.technique === 'pointing' || fixture.technique === 'claiming')) {
            const sites = house(fixture.deduction.witness.units[0]).filter(cell => candidates(values, cell).includes(fixture.deduction.witness.digits[0]));
            expect([...sites].sort((a, b) => a - b)).toEqual([...originalItems].sort((a, b) => a - b));
            expect([...items].sort((a, b) => a - b)).not.toEqual([...sites].sort((a, b) => a - b));
          }
          expect(validateWitness(values, changed)).toBe(false);
        }
      }
    }
  });

  it('rejects a one-cell naked pair and one-digit hidden pair with complete false conclusions', () => {
    const values = solved.map(digit => digit <= 2 ? 0 : digit); values[2] = 0;
    const valid: Deduction = { kind: 'deduction', technique: 'naked-pair', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [0], cells: [0, 1], digits: [1, 2] }, placements: [], eliminations: removals(values, house(0).filter(cell => cell > 1), [1, 2]) };
    expect(validateWitness(values, valid)).toBe(true); solution(values);
    const falsePair = structuredClone(valid); falsePair.witness.cells = [0];
    falsePair.eliminations = removals(values, house(0).filter(cell => cell !== 0), [1, 2]); rejectsFalseClaim(values, falsePair);
    const hidden = fixtures.find(fixture => fixture.technique === 'hidden-pair')!, hiddenValues = [...hidden.values].map(Number);
    const falseHidden = structuredClone(hidden.deduction); falseHidden.witness.digits = [falseHidden.witness.digits[0]];
    falseHidden.eliminations = removals(hiddenValues, falseHidden.witness.cells, Array.from({ length: 9 }, (_, n) => n + 1).filter(digit => !falseHidden.witness.digits.includes(digit)));
    rejectsFalseClaim(hiddenValues, falseHidden);
    const extraDigit = solved.map(digit => digit <= 3 ? 0 : digit); extraDigit[73] = 1; extraDigit[54] = 3;
    expect(candidates(extraDigit, 0)).toEqual([1, 2]); expect(candidates(extraDigit, 1)).toEqual([2, 3]);
    const threeDigits = { ...valid, witness: { units: [0], cells: [0, 1], digits: [1, 2, 3] },
      eliminations: removals(extraDigit, house(0).filter(cell => cell > 1), [1, 2, 3]) };
    rejectsFalseClaim(extraDigit, threeDigits);
    const extraCell = solved.map(digit => digit <= 3 ? 0 : digit); extraCell[47] = 1; extraCell[27] = 2;
    expect(house(0).filter(cell => candidates(extraCell, cell).includes(1))).toEqual([0, 1]);
    expect(house(0).filter(cell => candidates(extraCell, cell).includes(2))).toEqual([1, 2]);
    const threeCells: Deduction = { ...valid, technique: 'hidden-pair', witness: { units: [0], cells: [0, 1, 2], digits: [1, 2] },
      eliminations: removals(extraCell, [0, 1, 2], [3]) };
    rejectsFalseClaim(extraCell, threeCells);

    // Singleton-containing subsets have sound eliminations but fail these stricter named premises.
    const nakedSingleton = values.slice(); nakedSingleton[73] = 1;
    expect(candidates(nakedSingleton, 0)).toEqual([1, 2]); expect(candidates(nakedSingleton, 1)).toEqual([2]);
    const hiddenSingleton = solved.map(digit => digit <= 3 ? 0 : digit);
    hiddenSingleton[73] = 1; hiddenSingleton[47] = 1; hiddenSingleton[74] = 2;
    expect(house(0).filter(cell => candidates(hiddenSingleton, cell).includes(1))).toEqual([0]);
    expect(house(0).filter(cell => candidates(hiddenSingleton, cell).includes(2))).toEqual([0, 1]);
    for (const [board, proof] of [
      [nakedSingleton, { ...valid, eliminations: removals(nakedSingleton, house(0).filter(cell => cell > 1), [1, 2]) }],
      [hiddenSingleton, { ...valid, technique: 'hidden-pair', eliminations: removals(hiddenSingleton, [0, 1], [3]) }],
    ] as [number[], Deduction][]) {
      solution(board); expect(proof.eliminations.length).toBeGreaterThan(0);
      for (const { cell, digit } of proof.eliminations) {
        const forced = board.slice(); forced[cell] = digit;
        const result = exactCover(forced.join(''));
        expect(result.kind === 'invalid' || result.kind === 'complete' && result.count === 0).toBe(true);
      }
      expect(validateWitness(board, proof)).toBe(false);
    }
  });

  it('rejects mixed base houses and box covers masquerading as a classic XWing', () => {
    const transpose = (cell: number) => cell % 9 * 9 + Math.floor(cell / 9);
    const transposeUnit = (unit: number) => unit < 9 ? unit + 9 : unit < 18 ? unit - 9
      : 18 + (unit - 18) % 3 * 3 + Math.floor((unit - 18) / 3);
    const variants = (values: number[], proof: Deduction) => [
      { values, proof },
      { values: Array.from({ length: 81 }, (_, cell) => values[transpose(cell)]), proof: { ...proof,
        witness: { units: proof.witness.units.map(transposeUnit), cells: proof.witness.cells.map(transpose), digits: proof.witness.digits },
        eliminations: proof.eliminations.map(item => ({ ...item, cell: transpose(item.cell) })) } },
    ];
    // Row 0 and box 0 have the same two sites. Their overlap cannot be two disjoint bases.
    const overlap = Array(81).fill(0);
    for (const cell of [15, 21, 35, 41, 47, 61, 67]) overlap[cell] = 1;
    expect(house(0).filter(cell => candidates(overlap, cell).includes(1))).toEqual([0, 1]);
    expect(house(18).filter(cell => candidates(overlap, cell).includes(1))).toEqual([0, 1]);
    const mixed: Deduction = { kind: 'deduction', technique: 'x-wing', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [0, 18, 9, 10], cells: [0, 1, 2, 3], digits: [1] }, placements: [],
      eliminations: removals(overlap, [...house(9), ...house(10)].filter(cell => ![0, 1, 2, 3].includes(cell)), [1]) };
    for (const variant of variants(overlap, mixed)) rejectsFalseClaim(variant.values, variant.proof);

    // A sound row-to-box inference is still a different named pattern from a row/column XWing.
    const source = defaults.fixtures.find(item => item.technique === 'x-wing')!;
    // Digits 1 and 2 exercise later boxes and the first box (unit 18) boundary respectively.
    for (const digit of [1, 2]) {
      const boxes: number[] = [...source.solution].map((value, cell) => Math.floor(cell / 9) >= 3 && Number(value) === digit ? digit : 0);
      const columns = [source.solution.slice(0, 9).indexOf(String(digit)), source.solution.slice(9, 18).indexOf(String(digit))].sort((a, b) => a - b);
      const omittedColumn = source.solution.slice(18, 27).indexOf(String(digit));
      for (const cell of [omittedColumn, omittedColumn + 9]) boxes[cell] = Number(source.solution[cell]);
      expect(house(0).filter(cell => candidates(boxes, cell).includes(digit))).toEqual(columns);
      expect(house(1).filter(cell => candidates(boxes, cell).includes(digit))).toEqual(columns.map(column => column + 9));
      const cells = [...columns, ...columns.map(column => column + 9)];
      const covers = columns.map(column => 18 + Math.floor(column / 3));
      for (const units of [covers, [covers[0], columns[1] + 9], [columns[0] + 9, covers[1]]]) {
        const boxFish: Deduction = { kind: 'deduction', technique: 'x-wing', techniqueVersion: 1, logicalRevision: 0,
          witness: { units: [0, 1, ...units], cells, digits: [digit] }, placements: [],
          eliminations: removals(boxes, units.flatMap(house).filter(cell => !cells.includes(cell)), [digit]) };
        for (const variant of variants(boxes, boxFish)) {
          solution(variant.values); expect(variant.proof.eliminations.length).toBeGreaterThan(0);
          for (const { cell, digit } of variant.proof.eliminations) {
            const forced = variant.values.slice(); forced[cell] = digit;
            const result = exactCover(forced.join(''));
            expect(result.kind === 'invalid' || result.kind === 'complete' && result.count === 0).toBe(true);
          }
          expect(validateWitness(variant.values, variant.proof)).toBe(false);
        }
      }
    }
  });

  it('requires every naked-subset cell to belong to the claimed house', () => {
    const values = solved.map(digit => digit <= 2 ? 0 : digit); values[2] = 0;
    const proof: Deduction = { kind: 'deduction', technique: 'naked-pair', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [11], cells: [0, 1], digits: [1, 2] }, placements: [], eliminations: removals(values, house(11), [1, 2]) };
    rejectsFalseClaim(values, proof);
  });

  it('rejects zero-effect intersections, subsets and fish without an inconsistent baseline', () => {
    for (const technique of ['naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple'] as const) {
      const count = technique.endsWith('pair') ? 2 : 3, values = solved.map(digit => digit <= count ? 0 : digit);
      solution(values);
      const proof: Deduction = { kind: 'deduction', technique, techniqueVersion: 1, logicalRevision: 0,
        witness: { units: [0], cells: Array.from({ length: count }, (_, n) => n), digits: Array.from({ length: count }, (_, n) => n + 1) }, placements: [], eliminations: [] };
      expect(validateWitness(values, proof)).toBe(false);
    }
    for (const technique of ['pointing', 'claiming', 'x-wing'] as const) {
      const fixture = fixtures.find(item => item.technique === technique)!, values = [...fixture.values].map(Number), actual = solution(values);
      for (const { cell } of fixture.deduction.eliminations) values[cell] = Number(actual[cell]);
      solution(values);
      expect(validateWitness(values, { ...fixture.deduction, eliminations: [] })).toBe(false);
    }
  });

  it('rejects one-site intersections under the declared two-or-three-site named protocol', () => {
    for (const technique of ['pointing', 'claiming'] as const) {
      const values = solved.slice();
      const cells = technique === 'pointing' ? [0, 3, 21] : [0, 9, 15];
      for (const cell of cells) values[cell] = 0;
      solution(values);
      const target = technique === 'pointing' ? 0 : 18;
      const proof: Deduction = { kind: 'deduction', technique, techniqueVersion: 1, logicalRevision: 0,
        witness: { units: technique === 'pointing' ? [18, 0] : [0, 18], cells: [0], digits: [1] }, placements: [],
        eliminations: removals(values, house(target).filter(cell => !house(technique === 'pointing' ? 18 : 0).includes(cell)), [1]) };
      expect(proof.eliminations.length).toBeGreaterThan(0);
      expect(validateWitness(values, proof)).toBe(false);
    }
  });

  it('rejects a two-base three-cover fish with coherent conclusions and a real countermodel', () => {
    let checked = false;
    for (const fixture of fixtures) {
      const values = [...fixture.values].map(Number);
      for (let digit = 1; digit <= 9 && !checked; digit++) for (let first = 0; first < 9 && !checked; first++) for (let second = first + 1; second < 9 && !checked; second++) {
        const a = house(first).filter(cell => candidates(values, cell).includes(digit)), b = house(second).filter(cell => candidates(values, cell).includes(digit));
        const covers = [...new Set([...a, ...b].map(cell => 9 + cell % 9))];
        if (a.length !== 2 || b.length !== 2 || covers.length !== 3) continue;
        const cells = [...a, ...b], proof: Deduction = { kind: 'deduction', technique: 'x-wing', techniqueVersion: 1, logicalRevision: 0,
          witness: { units: [first, second, ...covers], cells, digits: [digit] }, placements: [],
          eliminations: removals(values, covers.flatMap(unit => house(unit).filter(cell => !cells.includes(cell))), [digit]) };
        rejectsFalseClaim(values, proof); checked = true;
      }
      if (checked) break;
    }
    expect(checked).toBe(true);
  });
});
