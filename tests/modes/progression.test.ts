import { describe, expect, it } from 'vitest';
import { advanceFrontier, bandForPool, frontierGrantId, policyForBand, poolForLeap, sameFrontier } from '../../src/lib/modes/index';
import type { Profile } from '../../src/lib/gameplay/contracts';
const initial = (): Profile => ({ revision: 0, wallet: 123, lifetimeEarned: 123, frontier: { runId: 'run-a', metamorphosis: 1, leap: 1, scheduleVersion: 1 }, highestCompletedLeap: 0 });
describe('60 Leap frontier', () => {
  it('covers each schedule boundary and all pools exactly as specified', () => {
    for (let leap = 1; leap <= 60; leap++) {
      const expected = leap <= 6 ? 'easy' : leap <= 15 ? 'medium-low' : leap <= 24 ? 'medium-high' : leap <= 42 ? 'hard-low' : 'hard-high';
      expect(poolForLeap(leap)).toBe(expected);
      expect(policyForBand(bandForPool(poolForLeap(leap))).base).toBe(leap <= 6 ? 100 : leap <= 24 ? 200 : 400);
    }
    for (const leap of [0, 61, 1.1, NaN]) expect(() => poolForLeap(leap)).toThrow();
    expect(() => bandForPool('unknown' as never)).toThrow();
    expect(() => policyForBand('__proto__' as never)).toThrow();
  });
  it('advances two whole cycles, preserves wallet/unlocks, and rejects old binding', () => {
    let current = initial();
    for (let i = 0; i < 120; i++) {
      const before = structuredClone(current), binding = { ...current.frontier };
      current = advanceFrontier(current, binding, `run-${i + 1}`);
      expect(before.wallet).toBe(current.wallet); expect(current.lifetimeEarned).toBe(123);
      expect(current.highestCompletedLeap).toBe(i >= 59 ? 60 : i + 1);
      expect(() => advanceFrontier(current, binding, 'stale-run')).toThrow('stale frontier');
    }
    expect(current.frontier).toMatchObject({ metamorphosis: 3, leap: 1 });
  });
  it('frontier grants are distinct by position/generation, not by stale attempt ID', () => {
    const binding = initial().frontier;
    expect(frontierGrantId('generation-a', binding)).toBe(frontierGrantId('generation-a', { ...binding }));
    expect(frontierGrantId('generation-a', binding)).not.toBe(frontierGrantId('generation-b', binding));
    expect(frontierGrantId('generation-a', binding)).not.toBe(frontierGrantId('generation-a', { ...binding, leap: 2 }));
    expect(sameFrontier(binding, { ...binding })).toBe(true);
    expect(sameFrontier(binding, { ...binding, runId: 'another' })).toBe(false);
  });
  it('rejects unsafe counters and missing/same next run identity', () => {
    const profile = initial(); profile.frontier.leap = 60;
    expect(() => advanceFrontier(profile, profile.frontier)).toThrow();
    expect(() => advanceFrontier(profile, profile.frontier, profile.frontier.runId)).toThrow();
    profile.frontier.metamorphosis = Number.MAX_SAFE_INTEGER;
    expect(() => advanceFrontier(profile, profile.frontier, 'next')).toThrow();
    const revision = initial(); revision.revision = Number.MAX_SAFE_INTEGER;
    expect(() => advanceFrontier(revision, revision.frontier)).toThrow();
  });
});
