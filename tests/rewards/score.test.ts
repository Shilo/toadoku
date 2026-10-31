import { describe, expect, it } from 'vitest';
import { calculateReward, safeAdd, rewardForAttempt } from '../../src/lib/rewards/index';
import { policyForBand } from '../../src/lib/modes/index';
import type { Attempt } from '../../src/lib/gameplay/contracts';
describe('single Dewdrops reward arithmetic', () => {
  it('matches explicit policy examples', () => {
    expect(calculateReward(policyForBand('easy'), { blanks: 51, exposed: 0, elapsedMs: 300000, information: false })).toMatchObject({ dewdrops: 105 });
    expect(calculateReward(policyForBand('easy'), { blanks: 51, exposed: 0, elapsedMs: 600000, information: false })).toMatchObject({ dewdrops: 100 });
    expect(calculateReward(policyForBand('medium'), { blanks: 50, exposed: 5, elapsedMs: 1, information: true })).toMatchObject({ dewdrops: 180 });
    expect(calculateReward(policyForBand('hard'), { blanks: 51, exposed: 5, elapsedMs: 1, information: true })).toMatchObject({ dewdrops: 360 });
    expect(calculateReward(policyForBand('hard'), { blanks: 51, exposed: 51, elapsedMs: 1, information: true })).toMatchObject({ dewdrops: 0 });
  });
  it('checks every blank/exposure cardinality and time boundary with independent BigInt math', () => {
    for (const band of ['easy', 'medium', 'hard'] as const) {
      const oldBase = band === 'easy' ? 1000n : band === 'medium' ? 2000n : 4000n;
      const target = band === 'easy' ? 600000 : band === 'medium' ? 1200000 : 2400000;
      for (let n = 1; n <= 81; n++) for (let r = 0; r <= n; r++) for (const elapsedMs of [0, target - 1, target, target + 1, Number.MAX_SAFE_INTEGER]) for (const information of r ? [true] : [true, false]) {
        const bonus = information ? 0n : 1000n * BigInt(Math.max(0, target - elapsedMs)) / BigInt(target);
        const oldScore = oldBase * BigInt(n - r) * (10000n + bonus) / (BigInt(n) * 10000n);
        const actual = calculateReward(policyForBand(band), { blanks: n, exposed: r, elapsedMs, information });
        expect(actual.dewdrops).toBe(Number(oldScore / 10n));
        expect(Object.hasOwn(actual, 'score')).toBe(false);
      }
    }
  }, 30000);
  it('rejects unsafe input/policies and counter overflow explicitly', () => {
    const inputs = { blanks: 51, exposed: 0, elapsedMs: 0, information: false };
    for (const invalid of [{ blanks: 0 }, { blanks: 82 }, { exposed: -1 }, { exposed: 52 }, { exposed: 1 }, { elapsedMs: -1 }, { elapsedMs: 1.5 }, { elapsedMs: Infinity }, { elapsedMs: Number.MAX_SAFE_INTEGER + 1 }]) expect(() => calculateReward(policyForBand('easy'), { ...inputs, ...invalid })).toThrow();
    for (const invalid of [{ base: Number.MAX_SAFE_INTEGER }, { targetMs: 1 }, { rewardVersion: 1 }]) expect(() => calculateReward({ ...policyForBand('easy'), ...invalid } as never, inputs)).toThrow();
    expect(() => calculateReward({ scoreVersion: 1, scheduleVersion: 1, band: 'easy', base: 1000, targetMs: 600000 } as never, inputs)).toThrow('unsupported reward policy');
    expect(safeAdd(Number.MAX_SAFE_INTEGER - 1, 1)).toBe(Number.MAX_SAFE_INTEGER);
    for (const args of [[Number.MAX_SAFE_INTEGER, 1], [-1, 0], [1.5, 1], [1, NaN]]) expect(() => safeAdd(args[0], args[1])).toThrow();
  });
  it('counts exposed original blanks once and keeps unscored lineage unscored', () => {
    const attempt = { definition: { givens: '0'.repeat(51) + '1'.repeat(30) }, policy: policyForBand('easy'), assistance: { used: true, exposed: [0] }, elapsedMs: 0, scored: true } as Attempt;
    expect(rewardForAttempt(attempt)).toMatchObject({ blanks: 51, exposed: 1, dewdrops: 98 });
    expect(rewardForAttempt({ ...attempt, scored: false })).toMatchObject({ base: 100, exposed: 1, dewdrops: 0 });
    expect(() => rewardForAttempt({ ...attempt, assistance: { used: true, exposed: [0, 0] } })).toThrow();
    expect(() => rewardForAttempt({ ...attempt, assistance: { used: true, exposed: [51] } })).toThrow();
    expect(() => rewardForAttempt({ ...attempt, assistance: { used: false, exposed: [0] } })).toThrow();
  });
});
