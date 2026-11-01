import { permutation } from '../catalog/select';
import { POOLS } from '../catalog/types';
import type { PoolId } from '../catalog/types';
import type { PoolState } from '../gameplay/contracts';
import type { CurrentSave } from '../storage/repository';

export const OFFLINE_LIMITS = {
  defaultTarget: 3, travelTarget: 25, defaultDownloadBytes: 2 * 1024 * 1024,
  travelDownloadBytes: 12 * 1024 * 1024, records: 512, recordBytes: 1024 * 1024,
  individualRecordBytes: 4096, manifestBytes: 128 * 1024,
} as const;
export type PackKind = 'default' | 'travel';
export const packTarget = (kind: PackKind) => kind === 'travel' ? OFFLINE_LIMITS.travelTarget : OFFLINE_LIMITS.defaultTarget;
export const packBudget = (kind: PackKind) => kind === 'travel' ? OFFLINE_LIMITS.travelDownloadBytes : OFFLINE_LIMITS.defaultDownloadBytes;
export const recordKey = (pool: PoolId, ordinal: number) => `${pool}:${ordinal}`;
export function exclusions(save: CurrentSave, state: PoolState): number[] {
  const values = save.attempts.filter(attempt => attempt.definition.pool === state.pool && attempt.definition.catalogVersion === state.catalogVersion)
    .map(attempt => attempt.definition.attestation.shardStart + attempt.definition.attestation.recordIndex);
  if (state.count > 1 && state.lastOrdinal !== undefined) values.push(state.lastOrdinal);
  return [...new Set(values)];
}

/**
 * Each entry contains every raw ordinal needed to guarantee the corresponding
 * number of future allocations, including candidates that are currently excluded.
 * Release of an old active role therefore cannot reveal an uncached skipped hole.
 */
export function coveragePlans(state: PoolState, blocked: readonly number[], maximum = 25): readonly (readonly number[])[] {
  if (!Number.isSafeInteger(maximum) || maximum < 1 || maximum > 25 ||
      state.count <= 2 * maximum + 8 || blocked.length > 4 ||
      !Number.isSafeInteger(state.cursor) || state.cursor < 0 || state.cursor > state.count ||
      !Number.isSafeInteger(state.epoch) || state.epoch < 0) throw new RangeError('unsupported offline traversal');
  const orders = new Map<number, Uint32Array>();
  const raw: number[] = [], epochs: number[] = [];
  let cursor = state.cursor, epoch = state.epoch;
  for (let i = 0; i < 2 * maximum + 8; i++) {
    if (cursor === state.count) { cursor = 0; epoch++; }
    if (!Number.isSafeInteger(epoch)) throw new RangeError('offline epoch');
    let order = orders.get(epoch);
    if (!order) { order = permutation(state.count, state.seed, epoch); orders.set(epoch, order); }
    raw.push(order[cursor++]); epochs.push(epoch);
  }
  const excluded = new Set(blocked);
  return Array.from({ length: maximum }, (_, index) => {
    const target = index + 1;
    let choices = 0, length = 0;
    while (choices < target && length < raw.length) {
      if (!excluded.has(raw[length])) choices++;
      length++;
    }
    // With count > 2N+8 this window spans at most two epochs. Initial four
    // blockers can be skipped twice; newly allocated first-epoch ordinals once.
    // At most N new blockers plus eight initial skips: 2N+8 probes suffice.
    if (epochs[length - 1] !== state.epoch) length = 2 * target + 8;
    return [...new Set(raw.slice(0, length))];
  });
}
export function saveFingerprint(save: CurrentSave): string {
  return JSON.stringify([save.meta.generation, save.pools, POOLS.map(pool => {
    const state = save.pools.find(item => item.pool === pool);
    return state ? exclusions(save, state) : [];
  })]);
}

