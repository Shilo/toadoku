import { describe, expect, it } from 'vitest';
import original from '../fixtures/techniques/original.v1.json';
import fallback from '../fixtures/techniques/fallback.v1.json';
import type { Deduction, Technique } from '../../src/lib/gameplay/contracts.ts';
import { computeHint, findDeduction, validateWitness } from '../../src/lib/hints/index.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';

const fixtures = original.fixtures as { technique: Technique; values: string; deduction: Deduction }[];
// Deliberately malformed protocol inputs cross the typed API only in these negative tests.
const rejects = (values: unknown, proof: unknown) => expect(validateWitness(values as never, proof as never)).toBe(false);
const arrayLike = (array: readonly unknown[]) => Object.assign({}, array, { length: array.length });

describe('independent hint protocol boundaries', () => {
  it('rejects wrong protocol tags and invalid revisions without changing any logical premise', () => {
    for (const fixture of fixtures) {
      const values = [...fixture.values].map(Number);
      expect(validateWitness(values, fixture.deduction)).toBe(true);
      for (const invalid of [{ kind: 'reveal' }, { techniqueVersion: 2 }, { techniqueVersion: '1' },
        { logicalRevision: -1 }, { logicalRevision: NaN }, { logicalRevision: 0.5 }, { logicalRevision: Number.MAX_SAFE_INTEGER + 1 }]) {
        rejects(values, { ...fixture.deduction, ...invalid });
      }
      expect(findDeduction(values, -1, fixture.technique)).toBeUndefined();
    }
  });

  it('requires actual dense 81-cell numeric arrays independently of the proof geometry', () => {
    for (const fixture of fixtures) {
      const values = [...fixture.values].map(Number);
      rejects(arrayLike(values), fixture.deduction);
      const trailingHole = Array(82); for (let cell = 0; cell < 81; cell++) trailingHole[cell] = values[cell];
      rejects(trailingHole, fixture.deduction);
      for (let cell = 0; cell < 81; cell++) for (const invalid of [-1, 10, 0.5, NaN, String(values[cell])]) {
        const malformed = values.slice(); Object.assign(malformed, { [cell]: invalid });
        rejects(malformed, fixture.deduction);
      }
    }
  });

  it('requires actual arrays and primitive conclusion fields at every proof boundary', () => {
    for (const fixture of fixtures) {
      const values = [...fixture.values].map(Number);
      for (const field of ['units', 'cells', 'digits'] as const) {
        const proof = structuredClone(fixture.deduction);
        Object.assign(proof.witness, { [field]: arrayLike(proof.witness[field]) }); rejects(values, proof);
      }
      for (const field of ['placements', 'eliminations'] as const) {
        const proof = structuredClone(fixture.deduction); Object.assign(proof, { [field]: arrayLike(proof[field]) }); rejects(values, proof);
        if (!fixture.deduction[field].length) continue;
        const conclusion = fixture.deduction[field][0];
        const callable = Object.assign(() => undefined, conclusion);
        const callableProof = structuredClone(fixture.deduction);
        Object.assign(callableProof[field], { 0: callable }); rejects(values, callableProof);
        for (const invalid of [{ cell: -1 }, { cell: 81 }, { cell: 0.5 }, { cell: NaN }, { cell: String(conclusion.cell) },
          { digit: 0 }, { digit: 10 }, { digit: 0.5 }, { digit: NaN }, { digit: String(conclusion.digit) }]) {
          const changed = structuredClone(fixture.deduction); Object.assign(changed[field][0], invalid); rejects(values, changed);
        }
      }
    }
  });

  it('keeps fallback revision/target validation separate from logical hints and original uniqueness', () => {
    const values = [...fallback.values].map(Number), givens = [...fallback.givens].map(Number);
    const unique = exactCover(fallback.givens);
    expect(unique.kind).toBe('complete');
    if (unique.kind !== 'complete' || unique.count !== 1 || !unique.solution) throw Error('Expected independently unique original fallback givens');
    expect(findDeduction(values, 0)).toBeUndefined();
    const target = values.indexOf(0); expect(target).toBeGreaterThanOrEqual(0);
    const input = { values, givens, logicalRevision: 0, target };
    expect(computeHint(input)).toMatchObject({ kind: 'ready', payload: { kind: 'reveal', cell: target, digit: Number(unique.solution[target]) } });
    for (const logicalRevision of [-1, 0.5, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(computeHint({ ...input, logicalRevision })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    for (const invalid of [-1, 81, 0.5, NaN]) expect(computeHint({ ...input, target: invalid })).toEqual({ kind: 'unavailable', reason: 'invalid' });
    const filledOriginalBlank = values.findIndex((digit, cell) => digit !== 0 && givens[cell] === 0);
    expect(filledOriginalBlank).toBeGreaterThanOrEqual(0);
    expect(computeHint({ ...input, target: filledOriginalBlank })).toEqual({ kind: 'unavailable', reason: 'no-target' });
  });
});
