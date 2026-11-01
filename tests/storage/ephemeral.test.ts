import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { EphemeralRepository } from '../../src/lib/storage/ephemeral';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { nextOrdinal } from '../../src/lib/catalog/select';
import { decodeBackup } from '../../src/lib/storage/backup';
import { parseBoundedJson } from '../../src/lib/storage/json';
import type { AllocationRequest } from '../../src/lib/storage/repository';
import type { Definition, PoolState, StorageResult } from '../../src/lib/gameplay/contracts';
import { attempt, pools, preferences, profile } from './fixtures';
import type { CatalogManifest } from '../../src/lib/catalog/types';

function value<T>(result: StorageResult<T>): T { if (result.kind !== 'committed') throw new Error(JSON.stringify(result)); return result.value; }
let initialPools: PoolState[], certified: Definition, nextCertified: Definition;
beforeAll(async () => {
  const manifest = JSON.parse(readFileSync('public/catalog/v1/manifest.json', 'utf8')) as CatalogManifest;
  initialPools = pools().map(pool => ({ ...pool, count: manifest.pools[pool.pool].count }));
  const loader = new CatalogLoader('https://ephemeral.test/catalog/v1/', { fetcher: async input => {
    const name = new URL(String(input)).pathname.split('/').at(-1)!;
    return new Response(new Uint8Array(readFileSync(`public/catalog/v1/${name}`)), { headers: { 'content-type': 'application/json' } });
  } });
  const record = await loader.getRecord('easy', nextOrdinal(initialPools[0])!.ordinal);
  if (record.kind !== 'ready') throw new Error(record.reason); certified = record.value; loader.dispose();
  const nextPool = { ...initialPools[0], cursor: 1 };
  const second = await loader.getRecord('easy', nextOrdinal(nextPool)!.ordinal);
  if (second.kind !== 'ready') throw new Error(second.reason); nextCertified = second.value; loader.dispose();
});
async function request(repository: EphemeralRepository): Promise<AllocationRequest> {
  const save = value(await repository.readCurrent()), pool = save.pools[0], next = nextOrdinal(pool)!;
  const game = attempt(save.meta.generation, 'quick', 'ephemeral:original-test'); game.scored = false; game.definition = certified;
  return { generation: save.meta.generation, intent: { id: 'intent-one', generation: save.meta.generation, role: 'quick', sequence: 1, expectedRoleRevision: 0 },
    attempt: game, authorization: 'initial', expectedPoolRevision: pool.revision,
    nextPool: { ...pool, revision: pool.revision + 1, cursor: next.nextCursor, epoch: next.nextEpoch, lifetimeIssued: 1 } };
}
describe('fresh permanently unscored Quick Play', () => {
  it('rejects scored/durable identities, other roles, old wallet and forbidden source puzzles', async () => {
    const repository = new EphemeralRepository({ preferences, profile, pools: initialPools });
    expect(repository.durability).toBe('ephemeral'); const allocation = await request(repository);
    expect((await repository.allocate({ ...allocation, attempt: { ...allocation.attempt, scored: true } })).kind).toBe('corrupt');
    expect((await repository.allocate({ ...allocation, attempt: { ...allocation.attempt, id: 'durable-id' } })).kind).toBe('corrupt');
    expect((await repository.allocate({ ...allocation, intent: { ...allocation.intent, role: 'frontier' } })).kind).toBe('corrupt');
    const forbidden = new EphemeralRepository({ preferences, profile, pools: initialPools, forbiddenPuzzleIds: [certified.id] });
    expect((await forbidden.allocate(await request(forbidden))).kind).toBe('corrupt');
    expect(() => new EphemeralRepository({ preferences, profile: { ...profile, wallet: 5, lifetimeEarned: 5 }, pools: initialPools })).toThrow();
    expect(value(await repository.readCurrent()).attempts).toHaveLength(0);
  });
  it('uses certified definitions, guards the same lineage and never pays or promotes it', async () => {
    const repository = new EphemeralRepository({ preferences, profile, pools: initialPools }); const allocation = await request(repository);
    let game = value(await repository.allocate(allocation));
    expect(value(await repository.allocate(allocation)).id).toBe(game.id);
    const guard = () => ({ generation: game.generation, attemptId: game.id, writer: game.writer });
    expect((await repository.saveSnapshot(guard(), game.revision, { ...game, scored: true })).kind).toBe('corrupt');
    const cell = game.definition.givens.indexOf('0');
    game = value(await repository.disclose(guard(), { id: 'reveal', attemptId: game.id, logicalRevision: 0, information: true, exposed: [cell],
      payload: { kind: 'reveal', logicalRevision: 0, cell, digit: Number(game.definition.solution[cell]) } }));
    const solved = { ...game, entries: [...game.definition.givens].map((digit, cell) => digit === '0' ? Number(game.definition.solution[cell]) : 0),
      elapsedMs: 45_000, commandSeq: 1, logicalRevision: 1, status: 'pending-completion' as const };
    game = value(await repository.saveSnapshot(guard(), game.revision, solved));
    const result = value(await repository.complete(guard(), game.revision)); game = result.attempt;
    expect(result.receipt.scored).toBe(false); expect(result.receipt.result.dewdrops).toBe(0); expect(result.profile.wallet).toBe(0);
    expect(value(await repository.complete(guard(), 0)).receipt.id).toBe(result.receipt.id);
    const backup = decodeBackup(parseBoundedJson(value(await repository.exportBackup()).text));
    expect(backup.attempts[0].scored).toBe(false); expect(backup.receipts[0].result.dewdrops).toBe(0);
    expect((await repository.previewRestore('anything')).kind).toBe('unavailable');
    expect((await repository.stageRestore({} as never)).kind).toBe('unavailable');
    expect((await repository.activateRestore({} as never)).kind).toBe('unavailable');
    repository.close(); expect((await repository.readCurrent()).kind).toBe('unavailable');
  });
  it('rejects close during verified allocation and rejects obsolete Continue intent reuse', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const { verifyAttestedRecord } = await import('../../src/lib/catalog/attestation');
    const closing = new EphemeralRepository({ preferences, profile, pools: initialPools }, async definition => { await gate; return verifyAttestedRecord(definition); });
    const first = await request(closing), pending = closing.allocate(first); closing.close(); release();
    expect((await pending).kind).toBe('unavailable');

    const repository = new EphemeralRepository({ preferences, profile, pools: initialPools });
    const initial = await request(repository); let game = value(await repository.allocate(initial));
    const guard = () => ({ generation: game.generation, attemptId: game.id, writer: game.writer });
    const solved = { ...game, entries: [...game.definition.givens].map((digit, cell) => digit === '0' ? Number(game.definition.solution[cell]) : 0),
      commandSeq: 1, logicalRevision: 1, status: 'pending-completion' as const };
    game = value(await repository.saveSnapshot(guard(), game.revision, solved)); game = value(await repository.complete(guard(), game.revision)).attempt;
    const save = value(await repository.readCurrent()), pool = save.pools[0], ordinal = nextOrdinal(pool, [pool.lastOrdinal!])!;
    const nextAttempt = attempt(save.meta.generation, 'quick', 'ephemeral:second'); nextAttempt.definition = nextCertified; nextAttempt.scored = false;
    const next: AllocationRequest = { generation: save.meta.generation,
      intent: { id: 'intent-two', generation: save.meta.generation, role: 'quick', sequence: 2, expectedRoleRevision: save.roles[0].revision, previousAttemptId: game.id, receiptId: game.receiptId },
      attempt: nextAttempt, authorization: 'continue', expectedPoolRevision: pool.revision,
      nextPool: { ...pool, revision: pool.revision + 1, epoch: ordinal.nextEpoch, cursor: ordinal.nextCursor, lifetimeIssued: 2 } };
    game = value(await repository.allocate(next)); expect(game.scored).toBe(false);
    expect((await repository.allocate(initial)).kind).toBe('conflict');
    const exported = decodeBackup(parseBoundedJson(value(await repository.exportBackup()).text));
    expect(exported.roles[0].lastIntentSeq).toBe(2); expect(exported.issued).toHaveLength(2); expect(exported.attempts[0].scored).toBe(false);
  });
});
