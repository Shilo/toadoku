import { describe, expect, it } from 'vitest';
import { nextOrdinal, nextPool, permutation, seededUint32, uniformBelow } from '../../src/lib/catalog/select';
import type { PoolState } from '../../src/lib/gameplay/contracts';
const state = (count: number, patch: Partial<PoolState> = {}): PoolState => ({ catalogVersion: '1', selectionVersion: '1', pool: 'easy', revision: 0, seed: 17, epoch: 0, cursor: 0, lifetimeIssued: 0, count, ...patch });
describe('shared bounded freshness traversal', () => {
  it('keeps the declared version1 seeded recurrence stable with exact unsigned arithmetic',()=>{
    for(const seed of [0,1,0xffffffff]){
      const random=seededUint32(seed);let expected=BigInt(seed);
      for(let draw=0;draw<8;draw++){expected=(1664525n*expected+1013904223n)%4294967296n;expect(random()).toBe(Number(expected));}
    }
    const draws=[0x100000000,1];expect(()=>uniformBelow(3,()=>draws.shift()!)).toThrow();
  });
  it('permutations are reproducible bijections for every tested pool/epoch', () => {
    for (const count of [1, 2, 3, 9, 256, 25000, 100000]) for (const epoch of [0, 1, 42]) {
      const values = permutation(count, 0, epoch);
      expect(new Set(values).size).toBe(count);
      expect([...values].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i));
      expect(values).toEqual(permutation(count, 0, epoch));
    }
    // Declared version1 seed/epoch purpose: known cases vary order, without a statistical claim.
    expect(new Set([0,1,17].map(seed=>[...permutation(17,seed,0)].join(','))).size).toBeGreaterThan(1);
    expect(new Set([0,1,17].map(epoch=>[...permutation(17,0,epoch)].join(','))).size).toBeGreaterThan(1);
    expect(permutation(1_000_000,1)).toHaveLength(1_000_000);
    expect(()=>permutation(1_000_001,1)).toThrow();
  });
  it('weights lifetime unseen independently of repeated epoch cursor', () => {
    const lower = state(2, { pool: 'medium-low', epoch: 9, cursor: 0, lifetimeIssued: 2 });
    const upper = state(2, { pool: 'medium-high', lifetimeIssued: 1 });
    for (let seed = 0; seed < 100; seed++) expect(nextPool(['medium-low', 'medium-high'], [lower, upper], seededUint32(seed))).toBe('medium-high');
    expect(nextPool(['medium-low','medium-high'],[state(2,{pool:'medium-low'}),state(3,{pool:'medium-high'})],()=>2)).toBe('medium-high');
    expect(()=>nextPool(['easy','medium-low'],[state(0),state(3,{pool:'medium-low'})],()=>2)).toThrow();
  });
  it('terminates across wrap for all small exclusion subsets, cursors and seeds', () => {
    let cases=0;
    for (let count = 1; count <= 12; count++) for (let bits = 0; bits < 2 ** count; bits++) {
      const blocked = Array.from({ length: count }, (_, i) => i).filter(i => bits & (1 << i));
      for (const seed of [0, 17]) for (let cursor = 0; cursor <= count; cursor++) {
        const candidate = nextOrdinal(state(count, { seed, cursor }), blocked);
        cases++;
        if (blocked.length === count) {if(candidate!==undefined)throw Error(JSON.stringify({invariant:'all blocked',count,bits,seed,cursor,candidate}));}
        else {
          if(!candidate||blocked.includes(candidate.ordinal)||candidate.consumedSteps>2*blocked.length+1||candidate.consumedSteps<=0||candidate.consumedSteps!==(candidate.nextEpoch-candidate.epoch)*count+candidate.nextCursor-candidate.cursor||candidate.nextEpoch>1)throw Error(JSON.stringify({invariant:'bounded exact traversal',count,bits,seed,cursor,candidate}));
        }
      }
    }
    // Old and optimized loops both enumerate sum(n=1..12) 2^n*(n+1)*2 = 196608 cases.
    expect(cases).toBe(196608);
  }, 30000);
  it('rejects bad domains/randomness and applies rejection before modulo', () => {
    const draws = [0xffffffff, 8]; expect(uniformBelow(3, () => draws.shift()!)).toBe(2);
    expect(() => uniformBelow(0, seededUint32(1))).toThrow();
    expect(() => uniformBelow(3, () => 0xffffffff)).toThrow();
    expect(() => uniformBelow(3, () => -1)).toThrow();
    expect(() => permutation(0, 1)).toThrow();
    expect(() => nextOrdinal(state(2, { cursor: 3 }))).toThrow();
    expect(() => nextPool([], [], seededUint32(1))).toThrow();
    for(const excluded of [-1,1,NaN,.5])expect(nextOrdinal(state(1),[excluded])?.ordinal).toBe(0);
    expect(nextOrdinal(state(1,{cursor:1,epoch:Number.MAX_SAFE_INTEGER}),[0])).toBeUndefined();
    expect(()=>nextOrdinal(state(1,{cursor:0,epoch:-1}),[0])).toThrow();
    expect(()=>nextOrdinal(state(1,{cursor:0,epoch:Number.MAX_SAFE_INTEGER+1}),[0])).toThrow();
  });
});
