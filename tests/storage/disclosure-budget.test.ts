import { expect, it, vi } from 'vitest';
import * as sudoku from '../../src/lib/sudoku';
import { computeHint } from '../../src/lib/hints';
import type { Disclosure } from '../../src/lib/gameplay/contracts';
import { validateDisclosureProof } from '../../src/lib/storage/disclosure';
import { attempt } from './fixtures';

it('caps injected proof work at one million while preserving a real zero budget', () => {
  const game = attempt(), givens = [...game.definition.givens].map(Number);
  const hint = computeHint({ values: givens, givens, logicalRevision: 0, target: 0 });
  if (hint.kind !== 'ready' || hint.payload.kind !== 'deduction') throw Error('Expected original single fixture');
  const disclosure: Disclosure = { id: 'bounded-proof', attemptId: game.id, logicalRevision: 0, information: true,
    payload: hint.payload, exposed: hint.payload.placements.map(placement => placement.cell) };
  const before = structuredClone(game);
  // Observe the production import without replacing the solver or its return values.
  const solver = vi.spyOn(sudoku, 'countSolutions');
  try {
    expect(validateDisclosureProof(game, disclosure, { nodeBudget: Number.MAX_SAFE_INTEGER })).toEqual({ kind: 'committed', value: true });
    expect(solver).toHaveBeenCalledTimes(1);
    expect(solver).toHaveBeenLastCalledWith(givens, { nodeBudget: 1_000_000 });
    expect(solver.mock.results[0].value).toMatchObject({ kind: 'complete', count: 1 });
    solver.mockClear();
    expect(validateDisclosureProof(game, disclosure, { nodeBudget: 0 })).toMatchObject({ kind: 'unavailable', reason: 'abort' });
    expect(solver).toHaveBeenCalledTimes(1);
    expect(solver).toHaveBeenLastCalledWith(givens, { nodeBudget: 0 });
    expect(solver.mock.results[0].value).toMatchObject({ kind: 'unknown', reason: 'budget' });
    expect(game).toEqual(before);
  } finally { solver.mockRestore(); }
});
