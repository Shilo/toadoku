import type { Attempt, Definition, PoolState, Preferences, Profile, Role } from '../../src/lib/gameplay/contracts';
import { POOLS } from '../../src/lib/catalog/types';
import { frontierGrantId } from '../../src/lib/modes';
import { recomputeReward } from '../../src/lib/storage/decode';
import type { CompletionReceipt } from '../../src/lib/gameplay/contracts';

/** Original deterministic cyclic grid, used only as test data, never shipped as catalog supply. */
export const solution = Array.from({ length: 81 }, (_, cell) => {
  const row = Math.floor(cell / 9); return (row * 3 + Math.floor(row / 3) + cell % 9) % 9 + 1;
}).join('');
export const definition: Definition = {
  id: 'a'.repeat(64), groupId: 'b'.repeat(64), sourceId: 'synthetic-test', sourceFile: 'easy.txt',
  givens: `0${solution.slice(1)}`, solution, ratingTenths: 10, pool: 'easy',
  sourceRevision: 'd8c8ebaee0c08c412cfba96af1923dfa61c83317', catalogVersion: '1', certificationVersion: '1',
  attestation: { version: 1, shardStart: 0, recordCount: 1, recordIndex: 0, recordSiblings: [], shardIndex: 0, shardCount: 1, shardSiblings: [] },
};
export const preferences: Preferences = { schemaVersion: 1, language: 'en', motion: 'system', boardShape: 'fill', theme: 'pond', appearance: 'light' };
export const profile: Profile = { revision: 0, wallet: 0, lifetimeEarned: 0,
  frontier: { runId: 'run-one', metamorphosis: 1, leap: 1, scheduleVersion: 1 }, highestCompletedLeap: 0 };
export function pools(): PoolState[] {
  return POOLS.map(pool => ({ selectionVersion: '1', catalogVersion: '1', pool, revision: 0, seed: 17, epoch: 0, cursor: 0, lifetimeIssued: 0, count: 20_000 }));
}
export function attempt(generation = 'test-generation', role: Role = 'quick', id = 'attempt-one'): Attempt {
  return {
    schemaVersion: 1, id, generation, role, revision: 0, commandSeq: 0, logicalRevision: 0,
    writer: { token: 'writer-one', epoch: 1 }, definition: structuredClone(definition),
    policy: { rewardVersion: 2, scheduleVersion: 1, band: 'easy', base: 100, targetMs: 600_000 },
    ...(role === 'quick' ? {} : { binding: structuredClone(profile.frontier) }),
    entries: Array(81).fill(0), notes: Array(81).fill(0), selection: 0, notesMode: false, undo: [], elapsedMs: 0,
    assistance: { used: false, exposed: [] }, status: 'playing', scored: true,
  };
}
export function receipt(attempt: Attempt): CompletionReceipt {
  return {
    schemaVersion: 1, id: attempt.id, generation: attempt.generation, attemptId: attempt.id,
    puzzleId: attempt.definition.id, groupId: attempt.definition.groupId, definition: attempt.definition,
    role: attempt.role, scored: attempt.scored, policy: attempt.policy, result: recomputeReward(attempt),
    ...(attempt.binding ? { binding: attempt.binding } : {}),
    ...(attempt.role === 'frontier' ? { grantId: frontierGrantId(attempt.generation, attempt.binding!) } : {}),
  };
}
