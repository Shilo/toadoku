import policyData from '../../../data/gameplay-policy.v2.json';
import type { Attempt, RewardInputs, RewardPolicy, RewardResult } from '../gameplay/contracts';
export function safeAdd(a: number, b: number): number {
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 0 || b < 0 || a > Number.MAX_SAFE_INTEGER - b) throw new RangeError('counter overflow');
  return a + b;
}
export function validateRewardPolicy(policy: RewardPolicy): void {
  if (!policy || policy.rewardVersion !== 2 || policy.scheduleVersion !== 1 || !Object.hasOwn(policyData.bands, policy.band)) throw new RangeError('unsupported reward policy');
  const pinned = policyData.bands[policy.band];
  if (policy.base !== pinned.base || policy.targetMs !== pinned.targetMs) throw new RangeError('modified reward policy');
}
export function calculateReward(policy: RewardPolicy, inputs: RewardInputs): RewardResult {
  validateRewardPolicy(policy);
  if (!inputs || !Number.isSafeInteger(inputs.blanks) || inputs.blanks < 1 || inputs.blanks > 81 || !Number.isSafeInteger(inputs.exposed) || inputs.exposed < 0 || inputs.exposed > inputs.blanks || !Number.isSafeInteger(inputs.elapsedMs) || inputs.elapsedMs < 0 || typeof inputs.information !== 'boolean' || inputs.exposed > 0 && !inputs.information) throw new RangeError('invalid reward inputs');
  const remaining = Math.max(0, policy.targetMs - inputs.elapsedMs);
  const bonusBasisPoints = inputs.information ? 0 : Math.floor(policyData.maxBonusBasisPoints * remaining / policy.targetMs);
  const numerator = policy.base * (inputs.blanks - inputs.exposed) * (10000 + bonusBasisPoints);
  const denominator = inputs.blanks * 10000;
  // Validated v2 pins bound numerator to 400*81*11000=356400000 and denominator to 810000.
  return { ...inputs, base: policy.base, targetMs: policy.targetMs, bonusBasisPoints, dewdrops: Math.floor(numerator / denominator) };
}
export function rewardForAttempt(attempt: Attempt): RewardResult {
  if (!/^[0-9]{81}$/.test(attempt.definition.givens) || typeof attempt.scored !== 'boolean' || typeof attempt.assistance.used !== 'boolean' || !Array.isArray(attempt.assistance.exposed)) throw new RangeError('attempt reward state');
  const exposed = new Set<number>();
  for (const cell of attempt.assistance.exposed) {
    if (!Number.isInteger(cell) || cell < 0 || cell > 80 || attempt.definition.givens[cell] !== '0' || exposed.has(cell)) throw new RangeError('exposed cells');
    exposed.add(cell);
  }
  const blanks = Array.from(attempt.definition.givens).filter(x => x === '0').length;
  const result = calculateReward(attempt.policy, { blanks, exposed: exposed.size, elapsedMs: attempt.elapsedMs, information: attempt.assistance.used });
  return attempt.scored ? result : { ...result, dewdrops: 0 };
}
