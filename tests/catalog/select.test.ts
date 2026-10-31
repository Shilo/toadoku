import { describe, expect, it } from 'vitest';
import { nextOrdinal, nextPool, permutation, seededUint32, uniformBelow } from '../../src/lib/catalog/select';
import type { PoolState } from '../../src/lib/gameplay/contracts';
const state = (count: number, patch: Partial<PoolState> = {}): PoolState => ({ catalogVersion: '1', selectionVersion: '1', pool: 'easy', revision: 0, seed: 17, epoch: 0, cursor: 0, lifetimeIssued: 0, count, ...patch });
describe('shared bounded freshness traversal', () => {
  it('permutations are reproducible bijections for every tested pool/epoch', () => {
    for (const count of [1, 2, 3, 9, 256, 25000, 100000]) for (const epoch of [0, 1, 42]) {
      const values = permutation(count, 0, epoch);
      expect(new Set(values).size).toBe(count);
      expect([...values].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i));
      expect(values).toEqual(permutation(count, 0, epoch));
    }
  });
  it('weights lifetime unseen independently of repeated epoch cursor', () => {
    const lower = state(2, { pool: 'medium-low', epoch: 9, cursor: 0, lifetimeIssued: 2 });
    const upper = state(2, { pool: 'medium-high', lifetimeIssued: 1 });
    for (let seed = 0; seed < 100; seed++) expect(nextPool(['medium-low', 'medium-high'], [lower, upper], seededUint32(seed))).toBe('medium-high');
  });
  it('terminates across wrap for all small exclusion subsets, cursors and seeds', () => {
    for (let count = 1; count <= 12; count++) for (let bits = 0; bits < 2 ** count; bits++) {
      const blocked = Array.from({ length: count }, (_, i) => i).filter(i => bits & (1 << i));
      for (const seed of [0, 17]) for (let cursor = 0; cursor <= count; cursor++) {
        const candidate = nextOrdinal(state(count, { seed, cursor }), blocked);
        if (blocked.length === count) expect(candidate).toBeUndefined();
        else {
          expect(candidate).toBeDefined();
          expect(blocked).not.toContain(candidate!.ordinal);
          expect(candidate!.consumedSteps).toBeLessThanOrEqual(2 * blocked.length + 1);
          expect(candidate!.nextEpoch).toBeLessThanOrEqual(1);
        }
      }
    }
  }, 30000);
  it('rejects bad domains/randomness and applies rejection before modulo', () => {
    const draws = [0xffffffff, 8]; expect(uniformBelow(3, () => draws.shift()!)).toBe(2);
    expect(() => uniformBelow(0, seededUint32(1))).toThrow();
    expect(() => uniformBelow(3, () => 0xffffffff)).toThrow();
    expect(() => uniformBelow(3, () => -1)).toThrow();
    expect(() => permutation(0, 1)).toThrow();
    expect(() => nextOrdinal(state(2, { cursor: 3 }))).toThrow();
    expect(() => nextPool([], [], seededUint32(1))).toThrow();
  });
});
