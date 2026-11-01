import { expect, it } from 'vitest';
import { materializeBackup } from '../../src/lib/storage/physical-backup';
import type { PhysicalBackup } from '../../src/lib/storage/physical-backup';
import { collectHistory, packHistory } from '../../src/lib/storage/history-codec';
import { decodeBackup } from '../../src/lib/storage/backup';
import { BackupValidationClient } from '../../src/lib/storage/backup-client';
import { attempt, definition, pools, preferences, profile } from './fixtures';
import type { IssuedRecord } from '../../src/lib/storage/repository';
import type { RoleRecord } from '../../src/lib/gameplay/contracts';

function corrupt(action: () => unknown, kind = 'corrupt') {
  let failure: unknown; try { action(); } catch (error) { failure = error; }
  expect(failure).toMatchObject({ issue: { kind } });
}

function physical(): PhysicalBackup {
  const generation = 'physical-generation';
  const issued: IssuedRecord = { generation, id: definition.id, groupId: definition.groupId, catalogVersion: '1', pool: 'easy', firstAttemptId: 'first', issues: 1 };
  const packed = [...packHistory(generation, 'id', [issued]), ...packHistory(generation, 'group', [issued])];
  const poolStates = pools(); poolStates[0].lifetimeIssued = 1;
  return { physicalExportVersion: 2, base: { schemaVersion: 1, application: 'toadodu', preferences, profile,
    roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role: role as 'quick' | 'frontier' | 'replay', revision: 0, lastIntentSeq: 0 })),
    attempts: [], pools: poolStates, intents: [] },
    metadataKeys: { roles: ['quick', 'frontier', 'replay'].map(role => [generation, role]), attempts: [], pools: poolStates.map(pool => [generation, pool.pool]), intents: [] },
    history: { generation, layout: 'buckets-v1', receiptRows: [], receiptKeys: [], issuedRows: [], issuedKeys: [], receiptBuckets: [], receiptBucketKeys: [],
      issuedBuckets: packed.map(row => row.value), issuedBucketKeys: packed.map(row => row.key) } };
}
it('materializes the explicit internal envelope into the unchanged canonical backup', async () => {
  const input = physical(), output = decodeBackup(materializeBackup(input));
  expect(output.issued).toHaveLength(1); expect(output.receipts).toHaveLength(0);
  expect(materializeBackup(output)).toBe(output);
  expect(materializeBackup({ ...output, schemaVersion: 2 })).toEqual({ ...output, schemaVersion: 2 });
  corrupt(() => materializeBackup({}));
  corrupt(() => materializeBackup({ schemaVersion: 1, application: 'wrong' }));
  const client = new BackupValidationClient(), serialized = await client.serialize(input, async () => true);
  expect(serialized.kind).toBe('committed');
  if (serialized.kind === 'committed') {
    expect(JSON.parse(serialized.value)).toEqual(output);
    expect(await client.validate(serialized.value, async () => true)).toEqual({ kind: 'committed', value: output });
  }
  expect((await client.validate(JSON.stringify(input), async () => true)).kind).not.toBe('committed');
});
it('rejects future, unknown, mixed and foreign physical envelope data', () => {
  corrupt(() => materializeBackup({ ...physical(), physicalExportVersion: 3 }), 'unsupported-future');
  const future = physical(); future.history.layout = 'future' as never;
  corrupt(() => materializeBackup(future), 'unsupported-future');
  for (const mutate of [
    (value: any) => { value.extra = 1; },
    (value: any) => { delete value.history; },
    (value: any) => { value.base.receipts = []; },
    (value: any) => { delete value.base.pools; },
    (value: any) => { value.history.extra = 1; },
    (value: any) => { value.history.generation = 'foreign'; },
    (value: any) => { value.history.generation = 'foreign'; value.history.issuedBuckets = []; value.history.issuedBucketKeys = []; },
    (value: any) => { value.history.layout = 'rows-v1'; },
    (value: any) => { value.history.issuedBucketKeys.pop(); },
    (value: any) => { value.history.issuedBuckets.push(value.history.issuedBuckets[0]); value.history.issuedBucketKeys.push(value.history.issuedBucketKeys[0]); },
    (value: any) => { value.history.issuedBuckets = []; value.history.issuedBucketKeys = []; value.history.receiptRows = [undefined]; value.history.receiptKeys = [[value.history.generation, 'overflow:receipt:first']]; },
  ]) {
    const input = structuredClone(physical()); mutate(input);
    corrupt(() => materializeBackup(input));
  }
});
it('rejects sparse, oversized and named-property array attacks before canonicalization', () => {
  for (const name of ['receiptRows', 'receiptKeys', 'issuedRows', 'issuedKeys', 'receiptBuckets', 'receiptBucketKeys', 'issuedBuckets', 'issuedBucketKeys'] as const) {
    const value = physical(); (value.history[name] as unknown) = null;
    corrupt(() => materializeBackup(value));
    const sparse = physical(); const array = sparse.history[name] as unknown[];
    array.length = 2; delete array[0]; Object.assign(array, { extra: true });
    corrupt(() => materializeBackup(sparse));
    const hidden = physical(), dense = hidden.history[name] as unknown[];
    dense[0] ??= null; dense[1] ??= null;
    Object.defineProperty(dense, 0, { enumerable: false }); Object.assign(dense, { extra: true });
    corrupt(() => materializeBackup(hidden));
  }
  const huge = physical(); huge.history.receiptBuckets = Array(257).fill(null);
  corrupt(() => materializeBackup(huge));
  for (const key of ['hidden', Symbol('extra'), 'map']) {
    const value = physical(); Object.defineProperty(value.history.issuedBuckets, key, { value: 1 }); corrupt(() => materializeBackup(value));
  }
  const hidden = physical(); const array = hidden.history.issuedBuckets;
  Object.defineProperty(array, 0, { enumerable: false }); Object.assign(array, { extra: true });
  // Array indices must be present and enumerable, matching structured-clone DTOs.
  corrupt(() => materializeBackup(hidden));
  const hiddenOnly = physical(); Object.defineProperty(hiddenOnly.history.issuedBuckets, 0, { enumerable: false });
  corrupt(() => materializeBackup(hiddenOnly));
});
it('rejects malformed physical keys including sparse or decorated key arrays', () => {
  for (const key of [["physical-generation"], ['physical-generation', 1], ['physical-generation', 'id:aa', 1]]) {
    const value = physical(); value.history.issuedBucketKeys[0] = key as IDBValidKey;
    corrupt(() => materializeBackup(value));
  }
  const value = physical(), key = value.history.issuedBucketKeys[0] as unknown[];
  Object.assign(key, { extra: 1 }); corrupt(() => materializeBackup(value));
  const hiddenKey = physical(), tuple = hiddenKey.history.issuedBucketKeys[0] as unknown[];
  Object.defineProperty(tuple, 0, { enumerable: false }); Object.assign(tuple, { extra: 1 }); corrupt(() => materializeBackup(hiddenKey));
  const empty = { physicalVersion: 1, generation: 'physical-generation', kind: 'receipt', bucket: '00', items: [] };
  corrupt(() => collectHistory('buckets-v1', 'physical-generation', 'receipt', [], [], [empty, empty], [['physical-generation', 'receipt:00'], ['physical-generation', 'receipt:00']]));
});
it('binds real indexed role generations despite an inherited iterator override', () => {
  class HiddenRoles extends Array<RoleRecord> { override [Symbol.iterator](): ArrayIterator<RoleRecord> { return [][Symbol.iterator](); } }
  const input = physical(); input.base.roles = new HiddenRoles(...input.base.roles);
  expect(() => decodeBackup(materializeBackup(input))).not.toThrow();
  for (let index = 0; index < input.base.roles.length; index++) input.base.roles[index].generation = 'foreign';
  input.history.issuedBuckets = []; input.history.issuedBucketKeys = [];
  corrupt(() => materializeBackup(input));
});

function physicalWithCurrentAttempt(): PhysicalBackup {
  const value = physical(), generation = value.history.generation, game = attempt(generation, 'quick', 'first');
  value.base.attempts = [game]; value.base.roles[0] = { ...value.base.roles[0], attemptId: game.id, lastIntentSeq: 1, revision: 1 };
  value.base.intents = [{ id: 'first-intent', generation, role: 'quick', sequence: 1, expectedRoleRevision: 0, outcomeAttemptId: game.id }];
  value.base.pools[0].cursor = 1;
  value.metadataKeys.attempts = [[generation, game.id]]; value.metadataKeys.intents = [[generation, 'first-intent']];
  return value;
}
it('binds every metadata key to its unchanged logical value and keeps public Backup1', () => {
  const valid = physicalWithCurrentAttempt(); expect(decodeBackup(materializeBackup(valid)).schemaVersion).toBe(1);
  for (const name of ['roles', 'attempts', 'pools', 'intents'] as const) {
    const originalKey = valid.metadataKeys[name][0] as [string, string];
    for (const wrong of [[originalKey[0]], [...originalKey, 'extra'], [originalKey[0], [originalKey[1]]], ['foreign', originalKey[1]], [originalKey[0], 'different-id'], 'not-an-array']) {
      const value = structuredClone(valid); value.metadataKeys[name][0] = wrong as IDBValidKey;
      corrupt(() => materializeBackup(value));
    }
    const missing = structuredClone(valid); missing.metadataKeys[name].pop(); corrupt(() => materializeBackup(missing));
    const hidden = structuredClone(valid), tuple = hidden.metadataKeys[name][0] as unknown[];
    Object.defineProperty(tuple, 0, { enumerable: false }); Object.assign(tuple, { extra: true }); corrupt(() => materializeBackup(hidden));
    const missingGeneration = structuredClone(valid);
    if (name !== 'pools') { delete (missingGeneration.base[name][0] as { generation?: string }).generation; corrupt(() => materializeBackup(missingGeneration)); }
    const foreignGeneration = structuredClone(valid); Object.assign(foreignGeneration.base[name][0], { generation: 'foreign' }); corrupt(() => materializeBackup(foreignGeneration));
  }
  for (const name of ['preferences', 'profile'] as const) for (const tag of [undefined, null, 0, 'foreign']) {
    const value = structuredClone(valid); Object.assign(value.base[name], { generation: tag }); corrupt(() => materializeBackup(value));
  }
  for (const name of ['preferences', 'profile'] as const) { const value = structuredClone(valid); Object.assign(value.base[name], { generation: value.history.generation }); expect(() => materializeBackup(value)).not.toThrow(); }
  const extra = structuredClone(valid); Object.assign(extra.metadataKeys, { unknown: [] }); corrupt(() => materializeBackup(extra));
  const missing = structuredClone(valid); delete (missing.metadataKeys as Partial<typeof missing.metadataKeys>).roles; corrupt(() => materializeBackup(missing));
  const tooMany = structuredClone(valid);
  tooMany.base.roles.push({ generation: valid.history.generation, role: 'fourth' as never, revision: 0, lastIntentSeq: 0 });
  tooMany.metadataKeys.roles.push([valid.history.generation, 'fourth']); corrupt(() => materializeBackup(tooMany));
});
