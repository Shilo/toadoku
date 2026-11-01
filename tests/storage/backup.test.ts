import { describe, expect, it } from 'vitest';
import { decodeBackup } from '../../src/lib/storage/repository';
import { assertCompleted, decodeIssued } from '../../src/lib/storage/backup';
import type { Backup } from '../../src/lib/storage/repository';
import { attempt, definition, pools, preferences, profile, receipt } from './fixtures';
import { bandForPool, frontierGrantId, policyForBand, poolForLeap } from '../../src/lib/modes';

it('rejects hidden or symbol extras and own method overrides in canonical record arrays', () => {
  for (const name of ['roles', 'attempts', 'pools', 'receipts', 'issued', 'intents'] as const) {
    for (const decorate of [
      (array: unknown[]) => { Object.defineProperty(array, 'hidden', { value: 1 }); },
      (array: unknown[]) => { Object.defineProperty(array, Symbol('extra'), { value: 1 }); },
      (array: unknown[]) => { Object.defineProperty(array, 'map', { value: () => [] }); },
    ]) { const value = progressedBackup(); decorate(value[name]); expect(() => decodeBackup(value)).toThrow(); }
  }
  for (const name of ['roles', 'pools', 'receipts', 'issued'] as const) {
    const value = progressedBackup(); Object.defineProperty(value[name], 0, { enumerable: false }); expect(() => decodeBackup(value)).toThrow();
    const compensated = progressedBackup(); Object.defineProperty(compensated[name], 0, { enumerable: false }); Object.assign(compensated[name], { extra: 1 }); expect(() => decodeBackup(compensated)).toThrow();
  }
});
it('normalizes indexed backup records before inherited array methods can substitute data', () => {
  class HiddenReceipts<T> extends Array<T> { override map<U>(_callback: (value: T, index: number, array: T[]) => U): U[] { return []; } }
  const value = progressedBackup(); value.receipts = new HiddenReceipts(...value.receipts);
  const decoded = decodeBackup(value); expect(decoded.receipts).toHaveLength(3); expect(decodeBackup(decoded)).toEqual(decoded);
  value.receipts[0].result.dewdrops = -1; expect(() => decodeBackup(value)).toThrow();
});

function progressedBackup(): Backup {
  const generation = 'backup-generation';
  const receipts = [1, 2, 3].map(leap => {
    const value = attempt(generation, 'frontier', `frontier-${leap}`); value.binding!.leap = leap;
    return receipt(value);
  });
  const total = receipts.reduce((sum, receipt) => sum + receipt.result.dewdrops, 0);
  const poolStates = pools(); poolStates[0] = { ...poolStates[0], cursor: 1, lifetimeIssued: 1 };
  return { schemaVersion: 1, application: 'toadodu', preferences,
    profile: { ...profile, wallet: total, lifetimeEarned: total, highestCompletedLeap: 3, frontier: { ...profile.frontier, leap: 4 } },
    roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role: role as 'quick' | 'frontier' | 'replay', revision: 0, lastIntentSeq: 0 })),
    attempts: [], pools: poolStates, receipts,
    issued: [{ generation, id: definition.id, groupId: definition.groupId, catalogVersion: '1', pool: 'easy', firstAttemptId: 'frontier-1', issues: 3 }], intents: [],
  };
}
function bind(backup: Backup, game: ReturnType<typeof attempt>): Backup {
  backup.attempts = [game]; const role = backup.roles.find(role => role.role === game.role)!; role.attemptId = game.id; role.lastIntentSeq = 1;
  return backup;
}
function completedBackup(): Backup {
  const backup = progressedBackup(), game = attempt('backup-generation', 'frontier', 'frontier-3');
  game.binding!.leap = 3; game.entries[0] = Number(game.definition.solution[0]); game.commandSeq = 1; game.logicalRevision = 1;
  game.status = 'completed'; game.receiptId = game.id; return bind(backup, game);
}
function secondRunBackup(): Backup {
  const backup = progressedBackup(); backup.receipts = []; backup.issued = [];
  for (let ordinal = 0; ordinal < 63; ordinal++) {
    const metamorphosis = ordinal < 60 ? 1 : 2, leap = ordinal % 60 + 1, pool = poolForLeap(leap);
    const game = attempt('backup-generation', 'frontier', `run-receipt-${ordinal}`);
    game.binding = { runId: `run-${metamorphosis}`, metamorphosis, leap, scheduleVersion: 1 };
    game.definition = { ...game.definition, id: (ordinal + 1).toString(16).padStart(64, '0'), groupId: (ordinal + 100).toString(16).padStart(64, '0'),
      givens: `${definition.solution.slice(0, ordinal)}0${definition.solution.slice(ordinal + 1)}`, pool,
      ratingTenths: pool === 'easy' ? 10 : pool === 'medium-low' ? 15 : pool === 'medium-high' ? 20 : pool === 'hard-low' ? 25 : 35 };
    game.policy = policyForBand(bandForPool(pool));
    backup.receipts.push(receipt(game)); backup.issued.push({ generation: game.generation, id: game.definition.id, groupId: game.definition.groupId,
      catalogVersion: '1', pool, firstAttemptId: game.id, issues: 1 });
  }
  const total = backup.receipts.reduce((sum, receipt) => sum + receipt.result.dewdrops, 0);
  backup.profile = { ...profile, wallet: total, lifetimeEarned: total, highestCompletedLeap: 60,
    frontier: { runId: 'run-2', metamorphosis: 2, leap: 4, scheduleVersion: 1 } };
  backup.pools = pools().map(pool => { const count = backup.issued.filter(item => item.pool === pool.pool).length; return { ...pool, cursor: count, lifetimeIssued: count }; });
  return backup;
}
describe('backup canonical cross-record authority', () => {
  it('accepts a consistent sequence and rejects missing-middle, alias and forged unlocks', () => {
    expect(decodeBackup(progressedBackup()).profile.frontier.leap).toBe(4);
    const missing = progressedBackup(); missing.receipts[1].binding!.leap = 4;
    missing.receipts[1].grantId = frontierGrantId(missing.receipts[1].generation, missing.receipts[1].binding!);
    expect(() => decodeBackup(missing)).toThrow();
    const alias = progressedBackup(); alias.receipts[1].binding!.runId = 'different-run';
    alias.receipts[1].grantId = frontierGrantId(alias.receipts[1].generation, alias.receipts[1].binding!);
    expect(() => decodeBackup(alias)).toThrow();
    const unlock = progressedBackup(); unlock.profile.highestCompletedLeap = 60;
    expect(() => decodeBackup(unlock)).toThrow();
    const overflow = progressedBackup(); overflow.profile.frontier.metamorphosis = Number.MAX_SAFE_INTEGER;
    expect(() => decodeBackup(overflow)).toThrow();
  });
  it('rejects a genuine record paired with a different reward band or scheduled Leap', () => {
    const wrongBand = progressedBackup();
    wrongBand.receipts[0].policy = { ...wrongBand.receipts[0].policy, band: 'hard', base: 400, targetMs: 2_400_000 };
    expect(() => decodeBackup(wrongBand)).toThrow();
    const wrongPool = progressedBackup(); wrongPool.receipts[0].binding!.leap = 7;
    wrongPool.receipts[0].grantId = frontierGrantId(wrongPool.receipts[0].generation, wrongPool.receipts[0].binding!);
    expect(() => decodeBackup(wrongPool)).toThrow();
  });
  it('validates retained completed, active frontier and unlocked replay associations', () => {
    expect(decodeBackup(completedBackup()).attempts[0].status).toBe('completed');
    const frontier = attempt('backup-generation', 'frontier', 'frontier-live'); frontier.binding!.leap = 4;
    expect(decodeBackup(bind(progressedBackup(), frontier)).attempts[0].binding!.leap).toBe(4);
    const replay = attempt('backup-generation', 'replay', 'replay-live'); replay.binding!.leap = 3;
    expect(decodeBackup(bind(progressedBackup(), replay)).attempts[0].role).toBe('replay');
    replay.binding!.leap = 4; expect(() => decodeBackup(bind(progressedBackup(), replay))).toThrow('backup-locked-replay');
  });
  it('rejects every malformed root collection without erasing source input', () => {
    const cases: unknown[] = [
      { ...progressedBackup(), schemaVersion: 2 }, { ...progressedBackup(), application: 'elsewhere' },
      { ...progressedBackup(), networkUrl: 'https://untrusted.test/' },
      { ...progressedBackup(), roles: {} }, { ...progressedBackup(), attempts: Array(4).fill(null) },
      { ...progressedBackup(), roles: progressedBackup().roles.slice(1) },
      { ...progressedBackup(), pools: progressedBackup().pools.slice(1) },
    ];
    for (const original of cases) { const before = structuredClone(original); expect(() => decodeBackup(original)).toThrow(); expect(original).toEqual(before); }
    const sparse = progressedBackup(); delete sparse.receipts[0]; Object.assign(sparse.receipts, { extra: 0 });
    expect(() => decodeBackup(sparse)).toThrow('backup-array-hole');
    const extra = progressedBackup(); Object.assign(extra.roles, { extra: 0 }); expect(() => decodeBackup(extra)).toThrow('backup-record-limit');
    const repeatedRole = progressedBackup(); repeatedRole.roles[1] = { ...repeatedRole.roles[0] }; expect(() => decodeBackup(repeatedRole)).toThrow();
    const repeatedPool = progressedBackup(); repeatedPool.pools[1] = { ...repeatedPool.pools[0] }; expect(() => decodeBackup(repeatedPool)).toThrow();
  });
  it('rejects duplicate identities and cross-generation or missing issued authority', () => {
    const duplicate = progressedBackup(); duplicate.receipts.push(structuredClone(duplicate.receipts[0])); expect(() => decodeBackup(duplicate)).toThrow('backup-duplicate');
    const duplicateIssued = progressedBackup(); duplicateIssued.issued.push({ ...duplicateIssued.issued[0] }); expect(() => decodeBackup(duplicateIssued)).toThrow('backup-duplicate');
    const wrongGeneration = progressedBackup(); wrongGeneration.issued[0].generation = 'other'; expect(() => decodeBackup(wrongGeneration)).toThrow('backup-generation');
    const missingRole = progressedBackup(); missingRole.roles[0].attemptId = 'missing'; expect(() => decodeBackup(missingRole)).toThrow('backup-role');
    const orphan = progressedBackup(); orphan.attempts.push(attempt('backup-generation')); expect(() => decodeBackup(orphan)).toThrow('backup-orphan');
    const unissued = bind(progressedBackup(), attempt('backup-generation')); unissued.issued = []; expect(() => decodeBackup(unissued)).toThrow('backup-unissued-attempt');
    const unissuedReceipt = progressedBackup(); unissuedReceipt.issued = []; expect(() => decodeBackup(unissuedReceipt)).toThrow('backup-unissued-receipt');
    const poolCount = progressedBackup(); poolCount.pools[0].lifetimeIssued++; expect(() => decodeBackup(poolCount)).toThrow('backup-pool-history');
    const wrongWallet = progressedBackup(); wrongWallet.profile.wallet++; wrongWallet.profile.lifetimeEarned++; expect(() => decodeBackup(wrongWallet)).toThrow('backup-wallet-sum');
  });
  it('rejects paid/editable, stale frontier and mismatched completed snapshots', () => {
    const missingReceipt = completedBackup(); missingReceipt.receipts.pop(); expect(() => decodeBackup(missingReceipt)).toThrow('backup-paid-status');
    const paidPlaying = completedBackup(); paidPlaying.attempts[0].status = 'playing'; delete paidPlaying.attempts[0].receiptId;
    expect(() => decodeBackup(paidPlaying)).toThrow('backup-paid-status');
    const changedId = completedBackup(); changedId.attempts[0].receiptId = 'different'; expect(() => decodeBackup(changedId)).toThrow('backup-completed');
    const changedTime = completedBackup(); changedTime.attempts[0].elapsedMs++; expect(() => decodeBackup(changedTime)).toThrow('backup-completed');
    const changedPuzzle = completedBackup(); changedPuzzle.receipts[2].definition = { ...changedPuzzle.receipts[2].definition, sourceId: 'other-source-row' };
    expect(() => decodeBackup(changedPuzzle)).toThrow('backup-completed');
    const stale = attempt('backup-generation', 'frontier'); expect(() => decodeBackup(bind(progressedBackup(), stale))).toThrow('backup-active-frontier');
    const wrongRole = completedBackup(); wrongRole.roles[1].role = 'quick'; wrongRole.roles[0].role = 'frontier'; expect(() => decodeBackup(wrongRole)).toThrow('backup-role');
  });
  it('validates compacted allocation intent high-water marks', () => {
    const base = progressedBackup(); base.roles[0].lastIntentSeq = 2;
    base.intents = [{ id: 'intent', generation: 'backup-generation', role: 'quick', sequence: 1, expectedRoleRevision: 0, outcomeAttemptId: 'compacted-attempt' }];
    expect(decodeBackup(base).intents).toHaveLength(1);
    const missing = structuredClone(base); delete missing.intents[0].outcomeAttemptId; expect(() => decodeBackup(missing)).toThrow('backup-intent');
    const future = structuredClone(base); future.intents[0].sequence = 3; expect(() => decodeBackup(future)).toThrow('backup-intent');
    const duplicate = structuredClone(base); duplicate.intents.push({ ...duplicate.intents[0] }); expect(() => decodeBackup(duplicate)).toThrow('backup-duplicate');
  });
  it('rejects corrupt issued records and validates complete grids independently', () => {
    const original = progressedBackup().issued[0];
    for (const change of [{ id: 0 }, { groupId: '' }, { id: 'invalid' }, { groupId: 'invalid' }, { pool: 'unknown' }, { extra: true }]) {
      expect(() => decodeIssued({ ...original, ...change })).toThrow();
    }
    const game = completedBackup().attempts[0]; expect(() => assertCompleted(game)).not.toThrow();
    game.entries[0] = 9; expect(() => assertCompleted(game)).toThrow('incomplete-board');
    const mismatch = attempt(); mismatch.definition = { ...mismatch.definition, givens: '0'.repeat(81), solution: mismatch.definition.solution.replaceAll('1', 'x').replaceAll('2', '1').replaceAll('x', '2') };
    mismatch.entries = [...definition.solution].map(Number); expect(() => assertCompleted(mismatch)).toThrow('certified-solution-mismatch');
  });
  it('preserves a complete Metamorphosis and rejects future/aliased/missing run grants', () => {
    expect(decodeBackup(secondRunBackup()).profile.frontier.metamorphosis).toBe(2);
    const changeBinding = (backup: Backup, index: number, fields: Partial<NonNullable<Backup['receipts'][number]['binding']>>) => {
      const item = backup.receipts[index]; item.binding = { ...item.binding!, ...fields }; item.grantId = frontierGrantId(item.generation, item.binding);
    };
    const future = secondRunBackup(); changeBinding(future, 0, { metamorphosis: 3, runId: 'future' }); expect(() => decodeBackup(future)).toThrow('backup-future-run');
    const alias = secondRunBackup(); changeBinding(alias, 60, { runId: 'run-1' }); expect(() => decodeBackup(alias)).toThrow('backup-run-alias');
    const missing = secondRunBackup(); changeBinding(missing, 62, { leap: 4 }); expect(() => decodeBackup(missing)).toThrow('backup-missing-leap');
    const uneven = secondRunBackup(); changeBinding(uneven, 5, { metamorphosis: 2, runId: 'run-2', leap: 4 }); expect(() => decodeBackup(uneven)).toThrow('backup-run-length');
    const wrongCurrent = secondRunBackup(); wrongCurrent.profile.frontier.runId = 'wrong'; expect(() => decodeBackup(wrongCurrent)).toThrow('backup-current-run');
    const currentAlias = secondRunBackup();
    currentAlias.receipts.splice(60); currentAlias.issued.splice(60); currentAlias.profile.frontier = { ...currentAlias.profile.frontier, leap: 1, runId: 'run-1' };
    const total = currentAlias.receipts.reduce((sum, item) => sum + item.result.dewdrops, 0); currentAlias.profile.wallet = total; currentAlias.profile.lifetimeEarned = total;
    expect(() => decodeBackup(currentAlias)).toThrow('backup-current-run-alias');
    const duplicateGrant = progressedBackup(); changeBinding(duplicateGrant, 1, { leap: 1 }); expect(() => decodeBackup(duplicateGrant)).toThrow('backup-grant');
    const omittedRun = secondRunBackup(); omittedRun.receipts.splice(60); omittedRun.issued.splice(60);
    const earned = omittedRun.receipts.reduce((sum, item) => sum + item.result.dewdrops, 0);
    omittedRun.profile.wallet = earned; omittedRun.profile.lifetimeEarned = earned;
    omittedRun.profile.frontier = { runId: 'run-2', metamorphosis: 2, leap: 1, scheduleVersion: 1 };
    for (const pool of omittedRun.pools) { const count = omittedRun.issued.filter(item => item.pool === pool.pool).length; pool.cursor = count; pool.lifetimeIssued = count; }
    expect(decodeBackup(omittedRun)).toEqual(omittedRun);
    omittedRun.profile.frontier = { runId: 'run-3', metamorphosis: 3, leap: 1, scheduleVersion: 1 };
    let omitted: unknown; try { decodeBackup(omittedRun); } catch (error) { omitted = error; }
    expect(omitted).toMatchObject({ issue: { kind: 'corrupt' } });
    const allAliased = secondRunBackup();
    for (let index = 60; index < allAliased.receipts.length; index++) changeBinding(allAliased, index, { runId: 'run-1' });
    allAliased.profile.frontier.runId = 'run-1';
    let aliased: unknown; try { decodeBackup(allAliased); } catch (error) { aliased = error; }
    expect(aliased).toMatchObject({ issue: { kind: 'corrupt' } });
  });
});
