import policyData from '../../../data/gameplay-policy.v2.json';
import type { Band, Frontier, Profile, RewardPolicy } from '../gameplay/contracts';
import type { PoolId } from '../catalog/types';
import { safeAdd } from '../rewards/index';
export function poolForLeap(leap: number): PoolId {
  if (!Number.isInteger(leap) || leap < 1 || leap > policyData.leaps) throw new RangeError('leap');
  return policyData.schedule.find(row => leap >= row.first && leap <= row.last)!.pool as PoolId;
}
export function bandForPool(pool: PoolId): Band {
  if (pool === 'easy') return 'easy';
  if (pool === 'medium-low' || pool === 'medium-high') return 'medium';
  if (pool === 'hard-low' || pool === 'hard-high') return 'hard';
  throw new RangeError('pool');
}
export function policyForBand(band: Band): RewardPolicy {
  if (!Object.hasOwn(policyData.bands, band)) throw new RangeError('band');
  return { rewardVersion: 2, scheduleVersion: 1, band, ...policyData.bands[band] };
}
export function sameFrontier(a: Frontier, b: Frontier): boolean {
  return a.runId === b.runId && a.metamorphosis === b.metamorphosis && a.leap === b.leap && a.scheduleVersion === b.scheduleVersion;
}
function validateBinding(binding: Frontier): void {
  if (!binding || typeof binding.runId !== 'string' || binding.runId.length < 1 || binding.runId.length > 256 || !Number.isSafeInteger(binding.metamorphosis) || binding.metamorphosis < 1 || binding.scheduleVersion !== 1) throw new RangeError('frontier binding');
  poolForLeap(binding.leap);
}
export function frontierGrantId(generation: string, binding: Frontier): string {
  validateBinding(binding);
  if (typeof generation !== 'string' || generation.length < 1 || generation.length > 256) throw new RangeError('generation');
  return JSON.stringify(['frontier', generation, binding.runId, binding.metamorphosis, binding.leap, binding.scheduleVersion]);
}
/** Call only for an accepted frontier completion within the repository's grant transaction. */
export function advanceFrontier(profile: Profile, binding: Frontier, nextRunId?: string): Profile {
  validateBinding(binding); validateBinding(profile.frontier);
  if (!sameFrontier(profile.frontier, binding)) throw new RangeError('stale frontier');
  if (!Number.isInteger(profile.highestCompletedLeap) || profile.highestCompletedLeap < 0 || profile.highestCompletedLeap > policyData.leaps) throw new RangeError('unlock');
  let frontier: Frontier;
  if (binding.leap === policyData.leaps) {
    if (typeof nextRunId !== 'string' || nextRunId.length < 1 || nextRunId.length > 256 || nextRunId === binding.runId) throw new RangeError('new run identity');
    frontier = { ...binding, runId: nextRunId, metamorphosis: safeAdd(binding.metamorphosis, 1), leap: 1 };
  } else frontier = { ...binding, leap: binding.leap + 1 };
  return { ...profile, revision: safeAdd(profile.revision, 1), frontier, highestCompletedLeap: Math.max(profile.highestCompletedLeap, binding.leap) };
}
