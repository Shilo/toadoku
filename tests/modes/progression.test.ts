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
  it('accepts opaque identity boundaries and rejects invalid grant positions independently', () => {
    for (const length of [1,128,129,256]) {
      const binding={...initial().frontier,runId:'r'.repeat(length)},generation='g'.repeat(length);
      expect(JSON.parse(frontierGrantId(generation,binding))).toEqual(['frontier',generation,binding.runId,1,1,1]);
      const ordinary=initial();ordinary.frontier=binding;
      expect(advanceFrontier(ordinary,binding).frontier).toEqual({...binding,leap:2});
      const profile=initial();profile.frontier={...binding,leap:60};profile.highestCompletedLeap=59;
      const nextRunId='n'.repeat(length),before=structuredClone(profile),next=advanceFrontier(profile,{...profile.frontier},nextRunId);
      expect(next.frontier).toEqual({...profile.frontier,runId:nextRunId,leap:1,metamorphosis:2});expect(profile).toEqual(before);
    }
    for(const leap of [0,61,.5,NaN])expect(()=>frontierGrantId('g',{...initial().frontier,leap})).toThrow();
    const profile=initial();profile.frontier.leap=60;profile.highestCompletedLeap=59;
    for(const nextRunId of [7,'',undefined,'n'.repeat(257)]){const before=structuredClone(profile);expect(()=>advanceFrontier(profile,{...profile.frontier},nextRunId as never)).toThrow();expect(profile).toEqual(before);}
    expect(()=>frontierGrantId('g'.repeat(257),initial().frontier)).toThrow();
    const oversized={...initial().frontier,runId:'r'.repeat(257)};
    expect(()=>frontierGrantId('g',oversized)).toThrow();
    const oversizedProfile=initial();oversizedProfile.frontier=oversized;
    expect(()=>advanceFrontier(oversizedProfile,oversized)).toThrow();
  });
});
