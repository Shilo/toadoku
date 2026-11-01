import { describe, expect, it } from 'vitest';
import { calculateReward, safeAdd, rewardForAttempt, validateRewardPolicy } from '../../src/lib/rewards/index.ts';
import { advanceFrontier, frontierGrantId, policyForBand, sameFrontier } from '../../src/lib/modes/index.ts';
import { createActivePlayClock, reduceAttempt } from '../../src/lib/session/index.ts';
import { findDeduction, validateWitness } from '../../src/lib/hints/index.ts';
import type { Deduction } from '../../src/lib/gameplay/contracts.ts';
import { attemptFixture } from '../session/fixtures.ts';
import { profile } from '../storage/fixtures.ts';
import { nextOrdinal, nextPool, permutation, seededUint32, uniformBelow } from '../../src/lib/catalog/select.ts';
import type { PoolState } from '../../src/lib/gameplay/contracts.ts';
import { AttemptSaveQueue } from '../../src/lib/gameplay/controller.ts';

describe('independent pure boundary attacks', () => {
  it('rejects malformed reward policies, input types and assistance states', () => {
    for (const value of [null, undefined, {}, { ...policyForBand('easy'), scheduleVersion: 2 }, { ...policyForBand('easy'), band: 'constructor' }]) expect(() => validateRewardPolicy(value as never)).toThrow(RangeError);
    for (const value of [null, undefined, {}, { blanks: NaN, exposed: 0, elapsedMs: 0, information: false }, { blanks: 1, exposed: 0.5, elapsedMs: 0, information: false }, { blanks: 1, exposed: 0, elapsedMs: 0, information: 1 }]) expect(() => calculateReward(policyForBand('easy'), value as never)).toThrow(RangeError);
    for (const field of ['scored', 'assistance'] as const) {
      const attempt = attemptFixture(); Object.assign(attempt, { [field]: field === 'scored' ? 'true' : { used: 'false', exposed: [] } });
      expect(() => rewardForAttempt(attempt)).toThrow(RangeError);
    }
    const malformed = attemptFixture(); malformed.definition = { ...malformed.definition, givens: '0'.repeat(80) };
    expect(() => rewardForAttempt(malformed)).toThrow(RangeError);
    const invalidNotes = attemptFixture(); invalidNotes.assistance = { used: true, exposed: null as never };
    expect(() => rewardForAttempt(invalidNotes)).toThrow(RangeError);
    for (const [a, b] of [[NaN, 1], [Infinity, 0], [0, -1], [0, Number.MAX_SAFE_INTEGER + 1]]) expect(() => safeAdd(a, b)).toThrow(RangeError);
  });
  it('keeps run identity, unlock and safe revision constraints explicit', () => {
    for (const binding of [null, {}, { ...profile.frontier, runId: '' }, { ...profile.frontier, runId: 'x'.repeat(257) }, { ...profile.frontier, metamorphosis: 0 }, { ...profile.frontier, metamorphosis: 1.5 }, { ...profile.frontier, scheduleVersion: 2 }]) expect(() => frontierGrantId('generation', binding as never)).toThrow(RangeError);
    for (const generation of ['', 'x'.repeat(257), null]) expect(() => frontierGrantId(generation as never, profile.frontier)).toThrow(RangeError);
    for (const highestCompletedLeap of [-1, 61, 0.5, NaN]) expect(() => advanceFrontier({ ...profile, highestCompletedLeap }, profile.frontier)).toThrow(RangeError);
    for (const property of ['runId', 'metamorphosis', 'leap', 'scheduleVersion'] as const) {
      const other = { ...profile.frontier, [property]: property === 'runId' ? 'different' : 2 };
      expect(sameFrontier(profile.frontier, other as never)).toBe(false);
    }
    const last = { ...profile.frontier, leap: 60 };
    expect(() => advanceFrontier({ ...profile, frontier: last }, last, 'x'.repeat(257))).toThrow(RangeError);
  });
  it('rejects invalid pool state and exercises explicit repeat-only weighting', () => {
    const base: PoolState = { selectionVersion: '1', catalogVersion: '1', pool: 'easy', revision: 0, seed: 17, epoch: 0, cursor: 0, lifetimeIssued: 1, count: 1 };
    expect(nextPool(['easy'], [base], () => 0)).toBe('easy');
    expect(() => nextPool(['easy'], [], () => 0)).toThrow(RangeError);
    expect(() => nextPool(['easy', 'easy'], [base], () => 0)).toThrow(RangeError);
    for (const delta of [{ count: 0 }, { lifetimeIssued: -1 }, { lifetimeIssued: 2 }, { count: 1.5 }, { lifetimeIssued: NaN }]) expect(() => nextPool(['easy'], [{ ...base, ...delta }], () => 0)).toThrow(RangeError);
    for (const seed of [-1, 2 ** 32, 0.5, NaN]) expect(() => seededUint32(seed)).toThrow(RangeError);
    for (const bound of [-1, 0.5, 2 ** 32 + 1, NaN]) expect(() => uniformBelow(bound, () => 0)).toThrow(RangeError);
    expect(uniformBelow(2 ** 32, () => 0xffffffff)).toBe(0xffffffff);
    for (const delta of [{ epoch: -1 }, { epoch: NaN }, { revision: -1 }, { cursor: -1 }]) expect(() => nextOrdinal({ ...base, ...delta })).toThrow(RangeError);
    expect(() => nextOrdinal({ ...base, epoch: Number.MAX_SAFE_INTEGER, cursor: 1 })).toThrow(RangeError);
    expect(() => permutation(1, 0, -1)).toThrow(RangeError);
  });
  it('keeps redundant clock activation and malformed session input harmless', () => {
    let now = 0; const clock = createActivePlayClock(0, () => now);
    expect(clock.setActive(false)).toBe(0); clock.setActive(true); now = 1;
    expect(clock.setActive(true)).toBe(1); clock.setActive(false); now = 2;
    expect(clock.setActive(false)).toBe(1); clock.dispose();
    const state = attemptFixture(); state.notes = [];
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'state' });
    state.notes = null as never;
    expect(reduceAttempt(state, { type: 'undo' })).toEqual({ kind: 'integrity', reason: 'state' });
  });
  it('makes malformed hint witnesses and detector inputs fail without inventing techniques', () => {
    expect(findDeduction([], 0)).toBeUndefined(); expect(findDeduction(Array(81).fill(0), -1)).toBeUndefined();
    expect(findDeduction(Array(81).fill(0), 0, 'unsupported' as never)).toBeUndefined();
    const proof: Deduction = { kind: 'deduction', technique: 'naked-single', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [], cells: [0], digits: [1] }, placements: [{ cell: 0, digit: 1 }], eliminations: [] };
    for (const input of [[], Array(81), Array(81).fill(NaN)]) expect(validateWitness(input, proof)).toBe(false);
    const blank = Array(81).fill(0);
    expect(validateWitness(blank, null as never)).toBe(false);
    expect(validateWitness(blank, { ...proof, technique: 'unsupported' as never })).toBe(false);
    expect(validateWitness(blank, { ...proof, witness: null as never })).toBe(false);
    expect(validateWitness(blank, { ...proof, placements: null as never })).toBe(false);
  });
  it('retains pending work when a persistence port rejects unexpectedly', async () => {
    for (const error of [new RangeError('Unexpected failure'), 'non-Error rejection']) {
      const initial = attemptFixture(); let fail = true;
      const queue = new AttemptSaveQueue(initial, { async save(snapshot) { if (fail) throw error; return { kind: 'committed', value: { ...snapshot, revision: snapshot.revision + 1 } }; } }, () => {}, () => {});
      queue.enqueue({ ...initial, commandSeq: 1 });
      expect(await queue.flush()).toEqual({ kind: 'unavailable', reason: 'abort', detail: error instanceof Error ? 'RangeError' : 'UnknownError' });
      expect(queue.state.pending).toBe(true); fail = false;
      expect((await queue.retry()).kind).toBe('committed'); queue.close();
    }
  });
});
