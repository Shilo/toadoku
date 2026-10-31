import { expect, it } from 'vitest';
import { captureRestoreCounts, prepareRestoreRows, validatePreparedRestore } from '../../src/lib/storage/prepare-restore';
import type { PreparedRestore } from '../../src/lib/storage/prepare-restore';
import type { Backup } from '../../src/lib/storage/repository';
import { decodeBackup } from '../../src/lib/storage/backup';
import { materializeBackup } from '../../src/lib/storage/physical-backup';
import type { PhysicalBackup } from '../../src/lib/storage/physical-backup';
import { BackupValidationClient } from '../../src/lib/storage/backup-client';
import { frontierGrantId } from '../../src/lib/modes';
import { recordId } from '../../src/lib/storage/history-codec';
import type { HistoryBucket, HistoryKind } from '../../src/lib/storage/history-codec';
import { attempt, definition, pools, preferences, profile, receipt } from './fixtures';

function backup(): Backup {
  const generation = 'old-generation', quick = attempt(generation, 'quick', 'quick'), frontier = attempt(generation, 'frontier', 'frontier');
  const attempts = [quick, frontier].map(value => ({ ...value, commandSeq: 1, logicalRevision: 1, status: 'completed' as const,
    receiptId: value.id, entries: [Number(value.definition.solution[0]), ...Array(80).fill(0)] }));
  const receipts = [receipt(quick), receipt(frontier)], total = receipts.reduce((sum, item) => sum + item.result.dewdrops, 0);
  const poolStates = pools(); poolStates[0] = { ...poolStates[0], cursor: 1, lifetimeIssued: 1 };
  return decodeBackup({ schemaVersion: 1, application: 'toadodu', preferences, profile: { ...profile, wallet: total, lifetimeEarned: total,
    frontier: { ...profile.frontier, leap: 2 }, highestCompletedLeap: 1 },
    roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role, revision: role === 'replay' ? 0 : 1, lastIntentSeq: role === 'replay' ? 0 : 1,
      ...(role === 'replay' ? {} : { attemptId: role }) })), attempts, pools: poolStates, receipts,
    issued: [{ generation, id: definition.id, groupId: definition.groupId, catalogVersion: '1', pool: 'easy', firstAttemptId: 'quick', issues: 2 }],
    intents: ['quick', 'frontier'].map(role => ({ generation, id: `${role}-intent`, role, sequence: 1, expectedRoleRevision: 0, outcomeAttemptId: role })) });
}
function materialized(prepared: PreparedRestore): Backup {
  const forStore = (store: string) => prepared.rows.filter(row => row.store === store), values = (store: string) => forStore(store).map(row => row.value), keys = (store: string) => forStore(store).map(row => row.key);
  const physical = { physicalExportVersion: 1, base: { schemaVersion: 1, application: 'toadodu', preferences: values('settings')[0], profile: values('profile')[0],
    roles: values('roles'), attempts: values('attempts'), pools: values('pools'), intents: values('intents') },
    history: { generation: prepared.generation, layout: 'buckets-v1', receiptRows: values('receipts'), receiptKeys: keys('receipts'), issuedRows: values('issued'), issuedKeys: keys('issued'),
      receiptBuckets: values('receiptBuckets'), receiptBucketKeys: keys('receiptBuckets'), issuedBuckets: values('issuedBuckets'), issuedBucketKeys: keys('issuedBuckets') } } as PhysicalBackup;
  return decodeBackup(materializeBackup(physical));
}
it('prepares immutable complete canonical state with generation and grant rewrites only', async () => {
  const source = backup(), before = JSON.stringify(source), generation = 'new-generation', prepared = prepareRestoreRows(source, generation);
  expect(validatePreparedRestore(prepared, generation, captureRestoreCounts(source))).toBe(prepared);
  const restored = materialized(prepared);
  expect(restored.profile).toMatchObject(source.profile); expect(restored.preferences).toMatchObject(source.preferences);
  for (const name of ['roles', 'attempts', 'pools', 'issued', 'intents'] as const) expect(restored[name]).toEqual(source[name].map(item => ({ ...item, generation })));
  expect(restored.receipts).toEqual(source.receipts.map(item => ({ ...item, generation, ...(item.grantId ? { grantId: frontierGrantId(generation, item.binding!) } : {}) })));
  const grant = prepared.rows.find(row => row.store === 'grants')!.value as { grantId: string; generation: string; attemptId: string };
  expect(grant).toEqual({ generation, grantId: frontierGrantId(generation, source.receipts[1].binding!), attemptId: 'frontier' });
  expect(JSON.stringify(source)).toBe(before);
  expect(() => prepareRestoreRows(source, 'bad generation')).toThrow();
  const client = new BackupValidationClient(), result = await client.prepare(source, generation, async () => true);
  expect(result.kind).toBe('committed'); if (result.kind === 'committed') expect(materialized(result.value)).toEqual(restored);
});
it('rejects mismatched or malformed worker preparation before stage registration', () => {
  for (const change of [
    (value: any) => { value.preparedRestoreVersion = 2; }, (value: any) => { value.generation = 'other'; },
    (value: any) => { value.packingMs = NaN; }, (value: any) => { value.packingMs = -1; }, (value: any) => { value.packingMs = 'slow'; },
    (value: any) => { value.extra = 1; }, (value: any) => { value.rows = null; },
    (value: any) => { value.rows = Array(1_001_001).fill(null); },
    (value: any) => { value.rows = []; },
    (value: any) => { value.rows.push(value.rows[0]); },
    (value: any) => { value.rows = value.rows.filter((row: any) => row.store !== 'issuedBuckets'); },
    (value: any) => { value.rows = value.rows.filter((row: any) => row.store !== 'attempts'); },
    (value: any) => { value.rows = value.rows.filter((row: any) => row.store !== 'grants'); },
    (value: any) => { value.rows = value.rows.filter((row: any) => row.store !== 'intents'); },
    (value: any) => { value.rows[0].store = 'quarantine'; },
    (value: any) => { delete value.rows[0].key; }, (value: any) => { delete value.rows[0].value; },
    (value: any) => { value.rows[0].extra = true; }, (value: any) => { value.rows[0].value.generation = 'other'; },
    (value: any) => { value.rows[0].key = 'other'; },
    (value: any) => { value.rows[2].key = 'bad'; }, (value: any) => { value.rows[2].key = ['other', 'quick']; },
    (value: any) => { value.rows[2].key = ['new-generation', 1]; }, (value: any) => { value.rows[2].key.push('extra'); },
    (value: any) => { value.rows[2].key.extra = 1; },
    (value: any) => { Object.defineProperty(value.rows[2].key, 0, { enumerable: false }); value.rows[2].key.extra = 1; },
    (value: any) => { Object.defineProperty(value.rows[2].key, 1, { enumerable: false }); value.rows[2].key.extra = 1; },
    (value: any) => { Object.defineProperty(value.rows, 0, { enumerable: false }); value.rows.extra = 1; },
    (value: any) => { Object.defineProperty(value.rows, 0, { enumerable: false }); },
    (value: any) => { value.rows[2].key[1] = 'unknown-role'; },
    (value: any) => { value.rows[2].value.role = 'wrong-role'; },
    (value: any) => { const row = value.rows.find((row: any) => row.store === 'pools'); row.value.pool = 'wrong-pool'; },
    (value: any) => { value.rows.find((row: any) => row.store === 'attempts').key[1] = 'wrong'; },
    (value: any) => { value.rows.find((row: any) => row.store === 'grants').key[1] = 'wrong'; },
    (value: any) => { value.rows.find((row: any) => row.store === 'intents').key[1] = 'wrong'; },
    ...[(row: any) => { row.value.physicalVersion = 2; }, (row: any) => { row.value.kind = 'wrong'; },
      (row: any) => { row.value.items = null; }, (row: any) => { row.value.items = Array(1025).fill(null); },
      (row: any) => { row.key[1] = 'wrong'; }].flatMap(change => ['issuedBuckets', 'receiptBuckets'].map(store => (value: any) => change(value.rows.find((row: any) => row.store === store)))),
  ]) {
    const value = structuredClone(prepareRestoreRows(backup(), 'new-generation')); change(value);
    expect(() => validatePreparedRestore(value, 'new-generation', captureRestoreCounts(backup()))).toThrow();
  }
});
it('counts overflow rows by all physical kinds and rejects malformed or truncated replies', () => {
  for (const kind of ['id', 'group', 'receipt'] as HistoryKind[]) {
    const source = backup(), value = prepareRestoreRows(source, 'new-generation');
    const bucket = value.rows.find(row => (row.value as HistoryBucket).kind === kind)!.value as HistoryBucket;
    const record = bucket.items.shift()!, id = recordId(kind, record);
    value.rows.push({ store: kind === 'receipt' ? 'receipts' : 'issued', key: ['new-generation', `overflow:${kind}:${id}`],
      value: { physicalVersion: 1, generation: 'new-generation', kind, id, record } });
    expect(validatePreparedRestore(value, 'new-generation', captureRestoreCounts(source))).toBe(value);
    expect(materialized(value)).toEqual(materialized(prepareRestoreRows(source, 'new-generation')));
    for (const change of [(row: any) => { row.value.physicalVersion = 2; }, (row: any) => { row.value.kind = 'wrong'; }, (row: any) => { row.key[1] = 'wrong'; }]) {
      const invalid = structuredClone(value); change(invalid.rows.at(-1)); expect(() => validatePreparedRestore(invalid, 'new-generation', captureRestoreCounts(source))).toThrow();
    }
    const missing = structuredClone(value); missing.rows.pop(); expect(() => validatePreparedRestore(missing, 'new-generation', captureRestoreCounts(source))).toThrow();
  }
});
it('captures immutable bounded source counts before asynchronous preparation', () => {
  const source = backup(), expected = captureRestoreCounts(source);
  expect(expected).toEqual({ receipt: 2, id: 1, group: 1, grants: 1, intents: 2, attempts: 2 });
  source.receipts.pop(); expect(expected.receipt).toBe(2);
  for (const decorate of [
    (value: any) => { value.receipts = null; },
    (value: any) => { value.receipts = Array(200_001).fill(null); },
    (value: any) => { value.receipts.extra = true; },
    (value: any) => { Object.defineProperty(value.receipts, 0, { enumerable: false }); },
  ]) { const source = backup(); decorate(source); expect(() => captureRestoreCounts(source)).toThrow(); }
});
