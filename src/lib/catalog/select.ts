import type { PoolState } from '../gameplay/contracts';
import type { PoolId } from './types';
export type RandomUint32 = () => number;
/** Uniform integer extraction with rejection, rather than modulo bias. */
export function uniformBelow(bound: number, random: RandomUint32): number {
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > 0x100000000) throw new RangeError('random bound');
  const limit = Math.floor(0x100000000 / bound) * bound;
  // Bound a broken injected source. Failure is explicit rather than an infinite loop.
  for (let tries = 0; tries < 1024; tries++) {
    const value = random();
    if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new RangeError('random uint32');
    if (value < limit) return value % bound;
  }
  throw new Error('random source rejected repeatedly');
}
/** Full-period 32-bit LCG; deterministic traversal seed, not a security primitive. */
export function seededUint32(seed: number): RandomUint32 {
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new RangeError('seed');
  let state = seed >>> 0;
  return () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state; };
}
export function permutation(count: number, seed: number, epoch = 0): Uint32Array {
  if (!Number.isSafeInteger(count) || count < 1 || count > 1_000_000 || !Number.isSafeInteger(epoch) || epoch < 0) throw new RangeError('permutation domain');
  const random = seededUint32((seed ^ Math.imul(epoch, 0x9e3779b9)) >>> 0);
  const values = Uint32Array.from({ length: count }, (_, i) => i);
  for (let i = count - 1; i > 0; i--) { const j = uniformBelow(i + 1, random); [values[i], values[j]] = [values[j], values[i]]; }
  return values;
}
export function nextPool(eligible: readonly PoolId[], states: readonly PoolState[], random: RandomUint32): PoolId {
  if (!eligible.length || new Set(eligible).size !== eligible.length) throw new RangeError('eligible pools');
  const selected = eligible.map(id => {
    const state = states.find(s => s.pool === id);
    if (!state || state.count < 1 || state.lifetimeIssued < 0 || state.lifetimeIssued > state.count || !Number.isSafeInteger(state.count) || !Number.isSafeInteger(state.lifetimeIssued)) throw new RangeError('pool state');
    return state;
  });
  const unseen = selected.map(s => s.count - s.lifetimeIssued);
  const weights = unseen.some(n => n > 0) ? unseen : selected.map(s => s.count);
  let position = uniformBelow(weights.reduce((a, b) => a + b, 0), random);
  for (let i = 0; i < weights.length; i++) { if (position < weights[i]) return selected[i].pool; position -= weights[i]; }
  throw new Error('invalid weighted selection');
}
export interface OrdinalCandidate { pool: PoolId; ordinal: number; poolRevision: number; epoch: number; cursor: number; consumedSteps: number; nextEpoch: number; nextCursor: number }
/** Only excludes already issued active/previous ordinals. Storage performs reservation/CAS. */
export function nextOrdinal(state: PoolState, excludedOrdinals: readonly number[] = []): OrdinalCandidate | undefined {
  if (!Number.isSafeInteger(state.cursor) || state.cursor < 0 || state.cursor > state.count || state.revision < 0 || !Number.isSafeInteger(state.epoch) || state.epoch < 0) throw new RangeError('pool traversal');
  const blocked = new Set(excludedOrdinals.filter(n => Number.isInteger(n) && n >= 0 && n < state.count));
  if (blocked.size >= state.count) return undefined;
  let cursor = state.cursor, epoch = state.epoch;
  let order = permutation(state.count, state.seed, epoch);
  // Old-epoch tail may repeat an exclusion at new-epoch head: at most 2b+1 probes.
  for (let step = 1; step <= 2 * blocked.size + 1; step++) {
    if (cursor === state.count) { epoch++; if (!Number.isSafeInteger(epoch)) throw new RangeError('epoch overflow'); cursor = 0; order = permutation(state.count, state.seed, epoch); }
    const ordinal = order[cursor++];
    if (!blocked.has(ordinal)) return { pool: state.pool, ordinal, poolRevision: state.revision, epoch: state.epoch, cursor: state.cursor, consumedSteps: step, nextEpoch: epoch, nextCursor: cursor };
  }
  return undefined;
}
