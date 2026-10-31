import type { Attempt } from '../gameplay/contracts';
import type { Backup, IssuedRecord } from './repository';
import { POOLS } from '../catalog/types';
import type { PoolId } from '../catalog/types';
import { frontierGrantId } from '../modes';
import { isComplete } from '../sudoku';
import { StorageFailure } from './transaction';
import { decodeAttempt, decodeIntent, decodePool, decodePreferences, decodeProfile, decodeReceipt, decodeRole, identifier, integer, object, same, recomputeReward } from './decode';
const corrupt = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason }); };
export function compositeBoard(attempt: Attempt): number[] {
  return [...attempt.definition.givens].map((digit, cell) => Number(digit) || attempt.entries[cell]);
}
export function assertCompleted(attempt: Attempt): void {
  const board = compositeBoard(attempt);
  if (!isComplete(board, [...attempt.definition.givens].map(Number))) corrupt('incomplete-board');
  if (board.join('') !== attempt.definition.solution) corrupt('certified-solution-mismatch');
}
export function decodeIssued(value: unknown): IssuedRecord {
  const input = object(value);
  identifier(input.generation); identifier(input.firstAttemptId); identifier(input.catalogVersion);
  if (typeof input.id !== 'string' || !/^[a-f0-9]{64}$/.test(input.id) || typeof input.groupId !== 'string' || !/^[a-f0-9]{64}$/.test(input.groupId)) corrupt('issued-id');
  if (!POOLS.includes(input.pool as PoolId)) corrupt('issued-pool');
  integer(input.issues, 1);
  if (Object.keys(input).some(key => !['generation', 'id', 'groupId', 'catalogVersion', 'pool', 'firstAttemptId', 'issues'].includes(key))) corrupt('issued-field');
  return structuredClone(value) as IssuedRecord;
}
function records(value: unknown, limit: number): unknown[] {
  if (!Array.isArray(value) || value.length > limit || Object.keys(value).length !== value.length) corrupt('backup-record-limit');
  const array = value as unknown[];
  for (let index = 0; index < array.length; index++) if (!Object.hasOwn(array, index)) corrupt('backup-array-hole');
  return array;
}
export function decodeBackup(value: unknown): Backup {
  const input = object(value);
  if (input.schemaVersion !== 1) throw new StorageFailure({ kind: 'unsupported-future', reason: 'backup-schema' });
  if (input.application !== 'toadodu') corrupt('backup-application');
  if (Object.keys(input).some(key => !['schemaVersion', 'application', 'preferences', 'profile', 'roles', 'attempts', 'pools', 'receipts', 'issued', 'intents'].includes(key))) corrupt('backup-field');
  const preferences = decodePreferences(input.preferences); const profile = decodeProfile(input.profile);
  const roles = records(input.roles, 3).map(decodeRole); const attempts = records(input.attempts, 3).map(decodeAttempt);
  const pools = records(input.pools, 5).map(decodePool); const receipts = records(input.receipts, 200_000).map(decodeReceipt);
  const issued = records(input.issued, 200_000).map(decodeIssued); const intents = records(input.intents, 200_000).map(decodeIntent);
  if (roles.length !== 3 || new Set(roles.map(role => role.role)).size !== 3 || pools.length !== 5 || new Set(pools.map(pool => pool.pool)).size !== 5) corrupt('backup-authorities');
  const unique = <T>(items: T[], getKey: (item: T) => string) => {
    if (new Set(items.map(getKey)).size !== items.length) corrupt('backup-duplicate');
  };
  unique(attempts, attempt => attempt.id); unique(receipts, receipt => receipt.attemptId);
  unique(issued, item => item.id); unique(issued, item => item.groupId); unique(intents, intent => intent.id);
  const issuedById = new Map(issued.map(item => [item.id, item]));
  const receiptByAttempt = new Map(receipts.map(item => [item.attemptId, item]));
  const poolIssuedCounts = new Map<string, number>();
  for (const item of issued) {
    const id = `${item.catalogVersion}:${item.pool}`;
    poolIssuedCounts.set(id, (poolIssuedCounts.get(id) ?? 0) + 1);
  }
  const generation = roles[0].generation;
  for (const item of [...roles, ...attempts, ...receipts, ...issued, ...intents]) if (item.generation !== generation) corrupt('backup-generation');
  for (const role of roles) {
    const attempt = attempts.find(attempt => attempt.id === role.attemptId);
    if (!!role.attemptId !== !!attempt || (attempt && attempt.role !== role.role)) corrupt('backup-role');
  }
  for (const attempt of attempts) {
    if (!roles.some(role => role.attemptId === attempt.id)) corrupt('backup-orphan');
    if (issuedById.get(attempt.definition.id)?.groupId !== attempt.definition.groupId) corrupt('backup-unissued-attempt');
    const receipt = receiptByAttempt.get(attempt.id);
    if ((attempt.status === 'completed') !== !!receipt) corrupt('backup-paid-status');
    if (attempt.status === 'completed') {
      if (receipt!.id !== attempt.receiptId || receipt!.role !== attempt.role || receipt!.scored !== attempt.scored
        || !same(receipt!.result, recomputeReward(attempt)) || !same(receipt!.definition, attempt.definition)
        || !same(receipt!.binding, attempt.binding)) corrupt('backup-completed');
      assertCompleted(attempt);
    }
    if (attempt.role === 'frontier' && attempt.status !== 'completed' && !same(attempt.binding, profile.frontier)) corrupt('backup-active-frontier');
    if (attempt.role === 'replay' && attempt.binding!.leap > profile.highestCompletedLeap) corrupt('backup-locked-replay');
  }
  let total = 0; const grants = new Set<string>();
  for (const receipt of receipts) {
    total = integer(total + receipt.result.dewdrops);
    if (receipt.grantId) {
      const expected = frontierGrantId(generation, receipt.binding!);
      if (receipt.grantId !== expected || grants.has(expected)) corrupt('backup-grant');
      grants.add(expected);
    }
    if (issuedById.get(receipt.puzzleId)?.groupId !== receipt.groupId) corrupt('backup-unissued-receipt');
  }
  if (profile.wallet !== total || profile.lifetimeEarned !== total) corrupt('backup-wallet-sum');
  const frontierReceipts = receipts.filter(receipt => receipt.role === 'frontier');
  const expectedGrants = 60n * (BigInt(profile.frontier.metamorphosis) - 1n) + BigInt(profile.frontier.leap) - 1n;
  if (expectedGrants !== BigInt(frontierReceipts.length)) corrupt('backup-frontier-grant-count');
  const runs = new Map<number, { id: string; leaps: Set<number> }>();
  const runOrdinals = new Map<string, number>();
  let highest = 0;
  for (const receipt of frontierReceipts) {
    const binding = receipt.binding!;
    if (binding.metamorphosis > profile.frontier.metamorphosis) corrupt('backup-future-run');
    const run = runs.get(binding.metamorphosis) ?? { id: binding.runId, leaps: new Set<number>() };
    if (run.id !== binding.runId || run.leaps.has(binding.leap)
      || (runOrdinals.has(binding.runId) && runOrdinals.get(binding.runId) !== binding.metamorphosis)) corrupt('backup-run-alias');
    run.leaps.add(binding.leap); runs.set(binding.metamorphosis, run); runOrdinals.set(binding.runId, binding.metamorphosis);
    highest = Math.max(highest, binding.leap);
  }
  if (highest !== profile.highestCompletedLeap) corrupt('backup-unlock');
  for (const [ordinal, run] of runs) {
    const expected = ordinal < profile.frontier.metamorphosis ? 60 : profile.frontier.leap - 1;
    if (run.leaps.size !== expected) corrupt('backup-run-length');
    for (let leap = 1; leap <= expected; leap++) if (!run.leaps.has(leap)) corrupt('backup-missing-leap');
    if (ordinal === profile.frontier.metamorphosis && run.id !== profile.frontier.runId) corrupt('backup-current-run');
  }
  if (runOrdinals.has(profile.frontier.runId) && runOrdinals.get(profile.frontier.runId) !== profile.frontier.metamorphosis) corrupt('backup-current-run-alias');
  for (const pool of pools) {
    const count = poolIssuedCounts.get(`${pool.catalogVersion}:${pool.pool}`) ?? 0;
    if (count !== pool.lifetimeIssued) corrupt('backup-pool-history');
  }
  for (const intent of intents) {
    const role = roles.find(role => role.role === intent.role)!;
    if (intent.sequence > role.lastIntentSeq || !intent.outcomeAttemptId) corrupt('backup-intent');
  }
  return { schemaVersion: 1, application: 'toadodu', preferences, profile, roles, attempts, pools, receipts, issued, intents };
}

