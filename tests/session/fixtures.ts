import type { Attempt } from '../../src/lib/gameplay/contracts.ts';

/** Original algebraic solved grid; these are reducer records, not certified production puzzles. */
export const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1).join('');
export function attemptFixture(): Attempt {
  return {
    schemaVersion: 1, id: 'attempt-test', generation: 'generation-test', role: 'quick', revision: 0, commandSeq: 0, logicalRevision: 0,
    writer: { token: 'writer-test', epoch: 1 },
    definition: { id: 'a'.repeat(64), groupId: 'b'.repeat(64), sourceId: 'fixture', givens: '1' + '0'.repeat(80), solution: solved,
      ratingTenths: 10, sourceFile: 'easy.txt', catalogVersion: '1', certificationVersion: '1', sourceRevision: 'test', pool: 'easy',
      // Inert reducer fixture only; this is not trusted catalog membership evidence.
      attestation: { version: 1, shardStart: 0, recordCount: 1, recordIndex: 0, recordSiblings: [], shardIndex: 0, shardCount: 1, shardSiblings: [] } },
    policy: { rewardVersion: 2, scheduleVersion: 1, band: 'easy', base: 100, targetMs: 600000 },
    entries: Array(81).fill(0), notes: Array(81).fill(0), selection: 1, notesMode: false, undo: [], elapsedMs: 0,
    assistance: { used: false, exposed: [] }, status: 'playing', scored: true,
  };
}
