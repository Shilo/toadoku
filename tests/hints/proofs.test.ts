import { describe, expect, it, vi } from 'vitest';
import original from '../fixtures/techniques/original.v1.json';
import fallback from '../fixtures/techniques/fallback.v1.json';
import type { Deduction, Technique } from '../../src/lib/gameplay/contracts.ts';
import { computeHint, findDeduction, validateWitness } from '../../src/lib/hints/index.ts';
import { getCandidates } from '../../src/lib/sudoku/index.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';
import * as detector from '../../src/lib/hints/detect.ts';

const fixtures = original.fixtures as { technique: Technique; category: string; values: string; deduction: Deduction }[];
const techniques: Technique[] = ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing'];
function impossible(values: number[], cell: number, digit: number): void {
  const forced = values.slice(); forced[cell] = digit;
  const result = exactCover(forced.join(''));
  // A forced duplicate is independently rejected by exact-cover constraint collisions.
  expect(result.kind === 'invalid' || result.kind === 'complete' && result.count === 0, `Not impossible ${cell}:${digit}`).toBe(true);
}
function transform(values: number[], proof: Deduction, operation: number): { values: number[]; proof: Deduction } {
  const cellMap = (cell: number) => {
    let row = Math.floor(cell / 9), col = cell % 9;
    if (operation >= 4) col = 8 - col;
    for (let n = 0; n < operation % 4; n++) [row, col] = [col, 8 - row];
    return row * 9 + col;
  };
  const digitMap = (digit: number) => digit === 0 ? 0 : digit % 9 + 1;
  const unitCells = (unit: number) => Array.from({ length: 81 }, (_, n) => n).filter(n => unit < 9 ? Math.floor(n / 9) === unit : unit < 18 ? n % 9 === unit - 9 : Math.floor(n / 27) * 3 + Math.floor(n % 9 / 3) === unit - 18);
  const unitMap = (unit: number) => {
    const cells = unitCells(unit).map(cellMap);
    for (let next = 0; next < 27; next++) if (unitCells(next).every(cell => cells.includes(cell))) return next;
    throw new Error('Invalid mapped unit');
  };
  const mapped = Array(81).fill(0);
  for (let cell = 0; cell < 81; cell++) mapped[cellMap(cell)] = digitMap(values[cell]);
  const conclusionMap = ({ cell, digit }: { cell: number; digit: number }) => ({ cell: cellMap(cell), digit: digitMap(digit) });
  return { values: mapped, proof: { ...proof,
    witness: { cells: proof.witness.cells.map(cellMap), units: proof.witness.units.map(unitMap), digits: proof.witness.digits.map(digitMap) },
    placements: proof.placements.map(conclusionMap), eliminations: proof.eliminations.map(conclusionMap) } };
}

describe('independent named-technique and exact-cover proof gates', () => {
  it('covers all required techniques and subset house orientations using real satisfiable values', () => {
    for (const technique of techniques) expect(fixtures.some(fixture => fixture.technique === technique)).toBe(true);
    for (const technique of ['naked-pair', 'naked-triple', 'hidden-pair', 'hidden-triple', 'hidden-single']) for (const category of ['row', 'column', 'box']) expect(fixtures.some(fixture => fixture.technique === technique && fixture.category === category)).toBe(true);
    for (const category of ['row', 'column']) expect(fixtures.some(fixture => fixture.technique === 'x-wing' && fixture.category === category)).toBe(true);
    expect(fixtures.filter(fixture => fixture.technique === 'naked-triple').some(fixture => {
      const values = [...fixture.values].map(Number);
      return new Set(fixture.deduction.witness.cells.map(cell => getCandidates(values, cell))).size > 1;
    })).toBe(true);
  });
  it('checks the actual premises, all conclusions and eight transformed orientations', () => {
    for (const fixture of fixtures) for (let operation = 0; operation < 8; operation++) {
      const transformed = transform([...fixture.values].map(Number), fixture.deduction, operation);
      const values = transformed.values, proof = transformed.proof;
      const originalResult = exactCover(values.join(''));
      expect(originalResult.kind).toBe('complete');
      if (originalResult.kind !== 'complete' || originalResult.count === 0) throw new Error('Anti-vacuity failed');
      expect(validateWitness(values, proof), `${fixture.technique} operation=${operation}`).toBe(true);
      for (const conclusion of proof.eliminations) impossible(values, conclusion.cell, conclusion.digit);
      for (const conclusion of proof.placements) {
        const retained = values.slice(); retained[conclusion.cell] = conclusion.digit;
        const satisfiable = exactCover(retained.join(''));
        expect(satisfiable.kind === 'complete' && satisfiable.count > 0).toBe(true);
        for (let digit = 1; digit <= 9; digit++) if (digit !== conclusion.digit) impossible(values, conclusion.cell, digit);
      }
      const detected = findDeduction(values, 30, fixture.technique);
      expect(detected?.logicalRevision).toBe(30);
      expect(detected && validateWitness(values, detected)).toBe(true);
    }
  });
  it('rejects globally correct answers under absent/forged technique labels and near-miss witnesses', () => {
    for (const fixture of fixtures) {
      const values = [...fixture.values].map(Number);
      const proof = structuredClone(fixture.deduction);
      proof.technique = proof.technique === 'x-wing' ? 'naked-triple' : 'x-wing';
      expect(validateWitness(values, proof)).toBe(false);
      for (const field of ['units', 'cells', 'digits'] as const) {
        for (const replacement of [Array(1), [NaN], [999], [0, 0]]) {
          const malformed = structuredClone(fixture.deduction); malformed.witness[field] = replacement;
          expect(validateWitness(values, malformed)).toBe(false);
        }
      }
      const absent = structuredClone(fixture.deduction); absent.eliminations = []; absent.placements = [];
      expect(validateWitness(values, absent)).toBe(false);
      const duplicate = structuredClone(fixture.deduction);
      if (duplicate.eliminations.length) duplicate.eliminations.push(duplicate.eliminations[0]);
      else duplicate.placements.push(duplicate.placements[0]);
      expect(validateWitness(values, duplicate)).toBe(false);
    }
    const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);
    const values = solved.slice(); values[80] = 0;
    const falseFish: Deduction = { kind: 'deduction', technique: 'x-wing', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [0, 1, 9, 10], cells: [0, 1, 9, 10], digits: [solved[80]] }, placements: [{ cell: 80, digit: solved[80] }], eliminations: [] };
    expect(exactCover(values.join('')).kind).toBe('complete');
    expect(validateWitness(values, falseFish)).toBe(false);
  });
  it('rejects finned/extra-base fish and expanded subset/intersection premises on satisfiable values', () => {
    const row = (cell: number) => Math.floor(cell / 9), col = (cell: number) => cell % 9;
    const box = (cell: number) => Math.floor(row(cell) / 3) * 3 + Math.floor(col(cell) / 3);
    function allowCandidate(values: number[], cell: number, digit: number): number[] {
      const next = values.slice(); next[cell] = 0;
      for (let other = 0; other < 81; other++) if (next[other] === digit && (row(other) === row(cell) || col(other) === col(cell) || box(other) === box(cell))) next[other] = 0;
      return next;
    }
    const house = (unit: number) => Array.from({ length: 81 }, (_, n) => n).filter(n => unit < 9 ? row(n) === unit : unit < 18 ? col(n) === unit - 9 : box(n) === unit - 18);
    for (const fixture of fixtures.filter(item => item.technique === 'x-wing' || item.technique === 'pointing' || item.technique === 'claiming' || item.technique.startsWith('hidden-'))) {
      const values = [...fixture.values].map(Number), proof = fixture.deduction;
      const source = proof.witness.units[0];
      if (source === undefined) continue;
      const target = house(source).find(cell => !proof.witness.cells.includes(cell));
      if (target === undefined) throw new Error('Missing near-miss target');
      const changed = allowCandidate(values, target, proof.witness.digits[0]);
      const sat = exactCover(changed.join(''));
      expect(sat.kind === 'complete' && sat.count > 0).toBe(true);
      expect(validateWitness(changed, proof), `Extra candidate ${fixture.technique} ${fixture.category}`).toBe(false);
    }
    for (const fixture of fixtures.filter(item => item.technique.startsWith('naked-'))) {
      const values = [...fixture.values].map(Number), proof = fixture.deduction;
      const extraDigit = Array.from({ length: 9 }, (_, n) => n + 1).find(digit => !proof.witness.digits.includes(digit))!;
      const changed = allowCandidate(values, proof.witness.cells[0], extraDigit);
      const sat = exactCover(changed.join(''));
      expect(sat.kind === 'complete' && sat.count > 0).toBe(true);
      expect(validateWitness(changed, proof), `Expanded naked premise ${fixture.technique}`).toBe(false);
    }
  });
  it('rejects malformed conclusions, wrong house orientation and degenerate witness cardinalities', () => {
    for (const fixture of fixtures) {
      const malformed = structuredClone(fixture.deduction);
      if (malformed.placements.length) malformed.placements[0] = null as never;
      else malformed.eliminations[0] = { cell: 0.5, digit: 1 };
      expect(validateWitness([...fixture.values].map(Number), malformed)).toBe(false);
    }
    for (const technique of ['pointing', 'claiming', 'x-wing'] as const) {
      const fixture = fixtures.find(item => item.technique === technique)!;
      const malformed = structuredClone(fixture.deduction);
      malformed.witness.units = technique === 'pointing' ? [0, 9] : technique === 'claiming' ? [18, 0] : [0, 1, 2, 3];
      expect(validateWitness([...fixture.values].map(Number), malformed)).toBe(false);
    }
    // Negative raw witness states deliberately violate satisfiability. They must never pass a
    // named witness even before computeHint's independent anti-vacuity barrier rejects them.
    const deficient = Array(81).fill(0); for (let col = 3; col < 9; col++) deficient[col] = col; deficient[9] = 9;
    const naked: Deduction = { kind: 'deduction', technique: 'naked-triple', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [0], cells: [0, 1, 2], digits: [1, 2, 3] }, placements: [], eliminations: [{ cell: 9, digit: 1 }] };
    expect(validateWitness(deficient, naked)).toBe(false);
    const duplicate = Array(81).fill(0); [4, 4, 5, 6, 7, 8, 9].forEach((digit, offset) => { duplicate[offset + 2] = digit; });
    const hidden = { ...naked, technique: 'hidden-triple' as const };
    expect(validateWitness(duplicate, hidden)).toBe(false);
  });
  it('distinguishes technical unknown/abort, full, clue corruption and explicit inconsistency', () => {
    const values = [...fixtures[0].values].map(Number);
    const input = { values, givens: values, logicalRevision: 5, target: values.indexOf(0) };
    const helpful = computeHint(input);
    expect(helpful.kind).toBe('ready');
    if (helpful.kind !== 'ready' || helpful.payload.kind !== 'deduction') throw new Error('Expected an actual logical proof');
    expect(helpful.payload.logicalRevision).toBe(5); expect(validateWitness(values, helpful.payload)).toBe(true);
    expect(computeHint(input, { nodeBudget: 0 })).toEqual({ kind: 'unavailable', reason: 'budget' });
    expect(computeHint(input, { nodeBudget: -1 })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    expect(computeHint(input, { shouldAbort: () => true })).toEqual({ kind: 'unavailable', reason: 'aborted' });
    expect(computeHint(input, { shouldAbort: () => { throw new Error('callback'); } })).toEqual({ kind: 'unavailable', reason: 'callback' });
    expect(computeHint({ ...input, values: [] })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    expect(computeHint({ ...input, target: 81 })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    const corruptClues = values.slice(); corruptClues[0] = values[0] === 9 ? 8 : 9;
    expect(computeHint({ ...input, givens: corruptClues })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    const unsat = Array(81).fill(0); for (let i = 0; i < 8; i++) unsat[i] = i + 1; unsat[17] = 9;
    expect(computeHint({ values: unsat, givens: Array(81).fill(0), logicalRevision: 7, target: 8 })).toEqual({ kind: 'ready', payload: { kind: 'inconsistent', logicalRevision: 7 } });
    unsat[1] = 1;
    expect(computeHint({ values: unsat, givens: Array(81).fill(0), logicalRevision: 7, target: 8 })).toEqual({ kind: 'ready', payload: { kind: 'inconsistent', logicalRevision: 7 } });
    const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);
    expect(computeHint({ values: solved, givens: solved, logicalRevision: 9, target: 0 })).toEqual({ kind: 'unavailable', reason: 'full' });
    expect(findDeduction(solved, 0)).toBeUndefined();
  });
  it('offers an honestly classified reveal after original verified singles exhaust the supported techniques', () => {
    const givens = [...fallback.givens].map(Number), values = givens.slice();
    const original = exactCover(fallback.givens);
    expect(original.kind === 'complete' && original.count === 1 && original.solution === fallback.solution).toBe(true);
    for (const step of fallback.steps as Deduction[]) {
      expect(validateWitness(values, step)).toBe(true);
      const sat = exactCover(values.join('')); expect(sat.kind === 'complete' && sat.count === 1).toBe(true);
      for (const placement of step.placements) {
        expect(givens[placement.cell]).toBe(0);
        expect(String(placement.digit)).toBe(fallback.solution[placement.cell]);
        values[placement.cell] = placement.digit;
      }
    }
    expect(values.join('')).toBe(fallback.values);
    expect(findDeduction(values, 22)).toBeUndefined();
    const target = values.indexOf(0);
    const result = computeHint({ values, givens, logicalRevision: 22, target });
    expect(result).toEqual({ kind: 'ready', payload: { kind: 'reveal', logicalRevision: 22, cell: target, digit: Number(fallback.solution[target]) } });
    expect(computeHint({ values, givens, logicalRevision: 22, target: values.findIndex(Boolean) })).toEqual({ kind: 'unavailable', reason: 'no-target' });
    expect(computeHint({ values: Array(81).fill(0), givens: Array(81).fill(0), logicalRevision: 0, target: 80 })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    // Notes are intentionally absent from the API: wrong/missing notes cannot manufacture a premise.
    const withWrongNotes = { values, givens, logicalRevision: 22, target, notes: Array(81).fill(1) };
    expect(computeHint(withWrongNotes)).toEqual(result);
    expect(computeHint({ values, givens, logicalRevision: 22, target }, { nodeBudget: 48 })).toEqual({ kind: 'unavailable', reason: 'budget' });
    let calls = 0;
    expect(computeHint({ values, givens, logicalRevision: 22, target }, { shouldAbort: () => ++calls > 100 })).toEqual({ kind: 'unavailable', reason: 'aborted' });
    calls = 0;
    expect(computeHint({ values, givens, logicalRevision: 22, target }, { shouldAbort: () => { if (++calls > 100) throw new Error('callback'); return false; } })).toEqual({ kind: 'unavailable', reason: 'callback' });
  });
  it('rejects a faulty detector result at the separately validated compute boundary', () => {
    const fixture = fixtures[0], values = [...fixture.values].map(Number);
    const falseProof = structuredClone(fixture.deduction); falseProof.technique = 'x-wing';
    const fault = vi.spyOn(detector, 'findDeduction').mockReturnValue(falseProof);
    try { expect(computeHint({ values, givens: values, logicalRevision: 0, target: values.indexOf(0) })).toEqual({ kind: 'unavailable', reason: 'invalid' }); }
    finally { fault.mockRestore(); }
  });
});
