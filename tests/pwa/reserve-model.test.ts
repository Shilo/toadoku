import { describe, expect, it } from 'vitest';
import { coveragePlans } from '../../src/lib/offline/plan';
import type { PoolState } from '../../src/lib/gameplay/contracts';

// Independent literal policy-one shuffle/walk. No production selection helper is used.
function referenceOrder(count: number, seed: number, epoch: number): number[] {
  let randomState = (seed ^ Math.imul(epoch, 0x9e3779b9)) >>> 0;
  const random = () => randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0;
  const result = Array.from({ length: count }, (_, ordinal) => ordinal);
  for (let end = count - 1; end > 0; end--) {
    const bound = end + 1, limit = Math.floor(4294967296 / bound) * bound;
    let value: number; do { value = random(); } while (value >= limit);
    const other = value % bound, old = result[end]; result[end] = result[other]; result[other] = old;
  }
  return result;
}
function pool(count: number, seed: number, cursor: number): PoolState {
  return { selectionVersion: '1', catalogVersion: '1', pool: 'easy', revision: 0, count, seed, cursor, epoch: 3, lifetimeIssued: count };
}
interface Walk { cursor: number; epoch: number; roles: (number | undefined)[]; previous?: number }
function chooser(state: PoolState) {
  const orders = new Map<number, number[]>();
  return (walk: Walk) => {
    const blocked = new Set([...walk.roles, walk.previous].filter((v): v is number => v !== undefined));
    let cursor = walk.cursor, epoch = walk.epoch;
    for (let probes = 0; probes < state.count * 2; probes++) {
      if (cursor === state.count) { cursor = 0; epoch++; }
      if (!orders.has(epoch)) orders.set(epoch, referenceOrder(state.count, state.seed, epoch));
      const ordinal = orders.get(epoch)![cursor++];
      if (!blocked.has(ordinal)) return { ordinal, cursor, epoch };
    }
    throw Error('independent unsupported full exclusion');
  };
}
function initialWalk(state: PoolState): Walk {
  const order = referenceOrder(state.count, state.seed, state.epoch), next = referenceOrder(state.count, state.seed, state.epoch + 1);
  // Place blockers in both the old tail and new head, including a possible alias.
  return { cursor: state.cursor, epoch: state.epoch, roles: [order[state.count - 1], next[0], next[1]], previous: next[2] };
}
function enumerate(state: PoolState, horizon: number, retained: ReadonlySet<number>): { paths: number; missing: number } {
  const choose = chooser(state); let paths = 0, missing = 0;
  function visit(walk: Walk, depth: number) {
    if (depth === horizon) { paths++; return; }
    for (let released = 0; released < 8; released++) {
      const roles = walk.roles.map((value, role) => released & (1 << role) ? undefined : value);
      const candidate = choose({ ...walk, roles });
      if (!retained.has(candidate.ordinal)) { missing++; continue; }
      for (let role = 0; role < 3; role++) {
        const nextRoles = [...roles]; nextRoles[role] = candidate.ordinal;
        visit({ cursor: candidate.cursor, epoch: candidate.epoch, roles: nextRoles, previous: candidate.ordinal }, depth + 1);
      }
    }
  }
  visit(initialWalk(state), 0); return { paths, missing };
}
describe('independent reserve horizon model', () => {
  it('covers every release/retain/role replacement branch for small guaranteed horizons, including wrap', () => {
    let paths = 0;
    for (let seed = 0; seed < 8; seed++) for (const cursor of [0, 27, 30, 31]) {
      const state = pool(31, seed, cursor), snapshot = JSON.stringify(state), initial = initialWalk(state);
      const blocked = [...new Set([...initial.roles, initial.previous].filter((v): v is number => v !== undefined))];
      const plans = coveragePlans(state, blocked, 3);
      for (let target = 1; target <= 3; target++) {
        const result = enumerate(state, target, new Set(plans[target - 1]));
        expect(result.missing, JSON.stringify({ seed, cursor, target })).toBe(0); paths += result.paths;
      }
      expect(JSON.stringify(state)).toBe(snapshot);
    }
    expect(paths).toBeGreaterThan(400000);
  });
  it('covers 1000 independently simulated travel paths with changing active roles across the epoch boundary', () => {
    let randomState = 17;
    const random = () => { randomState = (Math.imul(randomState, 1103515245) + 12345) >>> 0; return randomState; };
    for (let scenario = 0; scenario < 1000; scenario++) {
      const state = pool(67, random(), scenario % 2 ? 66 - scenario % 24 : scenario % 67), choose = chooser(state);
      let walk = initialWalk(state);
      const blocked = [...new Set([...walk.roles, walk.previous].filter((v): v is number => v !== undefined))];
      const retained = new Set(coveragePlans(state, blocked, 25)[24]);
      for (let step = 0; step < 25; step++) {
        const release = random() % 8, roles = walk.roles.map((value, role) => release & (1 << role) ? undefined : value);
        const candidate = choose({ ...walk, roles }); expect(retained.has(candidate.ordinal), JSON.stringify({ scenario, step })).toBe(true);
        roles[random() % 3] = candidate.ordinal;
        walk = { roles, previous: candidate.ordinal, cursor: candidate.cursor, epoch: candidate.epoch };
      }
    }
  });
  it('detects the meaningful fault of omitting currently blocked raw positions', () => {
    const state = pool(31, 1, 30), walk = initialWalk(state);
    const blocked = [...new Set([...walk.roles, walk.previous].filter((v): v is number => v !== undefined))];
    const correct = coveragePlans(state, blocked, 3)[2], broken = correct.filter(ordinal => !blocked.includes(ordinal));
    expect(enumerate(state, 3, new Set(correct)).missing).toBe(0);
    expect(enumerate(state, 3, new Set(broken)).missing).toBeGreaterThan(0);
  });
  it('rejects domains outside the constrained one-wrap proof and epoch overflow', () => {
    expect(() => coveragePlans(pool(58, 1, 0), [], 25)).toThrow(RangeError);
    expect(() => coveragePlans(pool(67, 1, 0), [0, 1, 2, 3, 4], 25)).toThrow(RangeError);
    expect(() => coveragePlans({ ...pool(67, 1, 67), epoch: Number.MAX_SAFE_INTEGER }, [], 25)).toThrow(RangeError);
    for (const maximum of [0, 26, NaN, 1.5]) expect(() => coveragePlans(pool(67, 1, 0), [], maximum)).toThrow(RangeError);
  });
});

