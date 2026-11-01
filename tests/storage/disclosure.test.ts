import { describe, expect, it } from 'vitest';
import { validateDisclosureProof } from '../../src/lib/storage/disclosure';
import { computeHint } from '../../src/lib/hints';
import { attempt } from './fixtures';
import type { Disclosure } from '../../src/lib/gameplay/contracts';

describe('bounded proof preflight never mistakes technical failure for assistance', () => {
  function logical(): { game: ReturnType<typeof attempt>; disclosure: Disclosure } {
    const game = attempt(), givens = [...game.definition.givens].map(Number);
    const computed = computeHint({ values: givens, givens, logicalRevision: 0, target: 0 });
    if (computed.kind !== 'ready' || computed.payload.kind !== 'deduction') throw new Error('original single fixture');
    return { game, disclosure: { id: 'proof', attemptId: game.id, logicalRevision: 0, information: true, payload: computed.payload,
      exposed: computed.payload.placements.map(placement => placement.cell) } };
  }
  it('checks satisfiable witnesses and explicit reveals independently of wrong entries', () => {
    const { game, disclosure } = logical(); expect(validateDisclosureProof(game, disclosure).kind).toBe('committed');
    expect(validateDisclosureProof(game, disclosure, { nodeBudget: Number.MAX_SAFE_INTEGER }).kind).toBe('committed');
    expect(validateDisclosureProof(game, { ...disclosure, exposed: [] }).kind).toBe('corrupt');
    const falseWitness = structuredClone(disclosure);
    if (falseWitness.payload.kind === 'deduction') falseWitness.payload.technique = 'x-wing';
    expect(validateDisclosureProof(game, falseWitness).kind).toBe('corrupt');
    const inconsistent: Disclosure = { ...disclosure, exposed: [], payload: { kind: 'inconsistent', logicalRevision: 0 } };
    expect(validateDisclosureProof(game, inconsistent).kind).toBe('corrupt');
    game.entries[0] = 9;
    expect(validateDisclosureProof(game, inconsistent).kind).toBe('committed');
    expect(validateDisclosureProof(game, disclosure).kind).toBe('corrupt');
    expect(validateDisclosureProof(game, { ...disclosure, payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 1 } }).kind).toBe('committed');
  });
  it('treats real budget exhaustion, abort and invalid callbacks as technical outcomes', () => {
    const { game, disclosure } = logical();
    for (const options of [{ nodeBudget: 0 }, { shouldAbort: () => true }, { shouldAbort: () => { throw new Error('cancel'); } },
      ...[NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER + 1].map(nodeBudget => ({ nodeBudget })), { shouldAbort: false as never }]) {
      const original = structuredClone(game.assistance);
      expect(validateDisclosureProof(game, disclosure, options)).toMatchObject({ kind: 'unavailable', reason: 'abort' }); expect(game.assistance).toEqual(original);
    }
  });
});
