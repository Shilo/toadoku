import { expect, it } from 'vitest';
import { materializeBackup } from '../../src/lib/storage/physical-backup';
import type { PhysicalBackup } from '../../src/lib/storage/physical-backup';
import { collectHistory, packHistory } from '../../src/lib/storage/history-codec';
import { decodeBackup } from '../../src/lib/storage/backup';
import { BackupValidationClient } from '../../src/lib/storage/backup-client';
import { definition, pools, preferences, profile } from './fixtures';
import type { IssuedRecord } from '../../src/lib/storage/repository';
import type { RoleRecord } from '../../src/lib/gameplay/contracts';

function physical(): PhysicalBackup {
  const generation = 'physical-generation';
  const issued: IssuedRecord = { generation, id: definition.id, groupId: definition.groupId, catalogVersion: '1', pool: 'easy', firstAttemptId: 'first', issues: 1 };
  const packed = [...packHistory(generation, 'id', [issued]), ...packHistory(generation, 'group', [issued])];
  const poolStates = pools(); poolStates[0].lifetimeIssued = 1;
  return { physicalExportVersion: 1, base: { schemaVersion: 1, application: 'toadodu', preferences, profile,
    roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role: role as 'quick' | 'frontier' | 'replay', revision: 0, lastIntentSeq: 0 })),
    attempts: [], pools: poolStates, intents: [] },
    history: { generation, layout: 'buckets-v1', receiptRows: [], receiptKeys: [], issuedRows: [], issuedKeys: [], receiptBuckets: [], receiptBucketKeys: [],
      issuedBuckets: packed.map(row => row.value), issuedBucketKeys: packed.map(row => row.key) } };
}
it('materializes the explicit internal envelope into the unchanged canonical backup', async () => {
  const input = physical(), output = decodeBackup(materializeBackup(input));
  expect(output.issued).toHaveLength(1); expect(output.receipts).toHaveLength(0);
  expect(materializeBackup(output)).toBe(output);
  expect(materializeBackup({ ...output, schemaVersion: 2 })).toEqual({ ...output, schemaVersion: 2 });
  expect(() => materializeBackup({})).toThrow();
  expect(() => materializeBackup({ schemaVersion: 1, application: 'wrong' })).toThrow();
  const client = new BackupValidationClient(), serialized = await client.serialize(input, async () => true);
  expect(serialized.kind).toBe('committed');
  if (serialized.kind === 'committed') {
    expect(JSON.parse(serialized.value)).toEqual(output);
    expect(await client.validate(serialized.value, async () => true)).toEqual({ kind: 'committed', value: output });
  }
  expect((await client.validate(JSON.stringify(input), async () => true)).kind).not.toBe('committed');
});
it('rejects future, unknown, mixed and foreign physical envelope data', () => {
  for (const mutate of [
    (value: any) => { value.physicalExportVersion = 2; },
    (value: any) => { value.extra = 1; },
    (value: any) => { delete value.history; },
    (value: any) => { value.base.receipts = []; },
    (value: any) => { delete value.base.pools; },
    (value: any) => { value.history.extra = 1; },
    (value: any) => { value.history.layout = 'future'; },
    (value: any) => { value.history.generation = 'foreign'; },
    (value: any) => { value.history.generation = 'foreign'; value.history.issuedBuckets = []; value.history.issuedBucketKeys = []; },
    (value: any) => { value.history.layout = 'rows-v1'; },
    (value: any) => { value.history.issuedBucketKeys.pop(); },
    (value: any) => { value.history.issuedBuckets.push(value.history.issuedBuckets[0]); value.history.issuedBucketKeys.push(value.history.issuedBucketKeys[0]); },
    (value: any) => { value.history.issuedBuckets = []; value.history.issuedBucketKeys = []; value.history.receiptRows = [undefined]; value.history.receiptKeys = [[value.history.generation, 'overflow:receipt:first']]; },
  ]) {
    const input = structuredClone(physical()); mutate(input);
    expect(() => materializeBackup(input)).toThrow();
  }
});
it('rejects sparse, oversized and named-property array attacks before canonicalization', () => {
  for (const name of ['receiptRows', 'receiptKeys', 'issuedRows', 'issuedKeys', 'receiptBuckets', 'receiptBucketKeys', 'issuedBuckets', 'issuedBucketKeys'] as const) {
    const value = physical(); (value.history[name] as unknown) = null;
    expect(() => materializeBackup(value)).toThrow();
    const sparse = physical(); const array = sparse.history[name] as unknown[];
    array.length = 2; delete array[0]; Object.assign(array, { extra: true });
    expect(() => materializeBackup(sparse)).toThrow();
    const hidden = physical(), dense = hidden.history[name] as unknown[];
    dense[0] ??= null; dense[1] ??= null;
    Object.defineProperty(dense, 0, { enumerable: false }); Object.assign(dense, { extra: true });
    expect(() => materializeBackup(hidden)).toThrow();
  }
  const huge = physical(); huge.history.receiptBuckets = Array(257).fill(null);
  expect(() => materializeBackup(huge)).toThrow();
  for (const key of ['hidden', Symbol('extra'), 'map']) {
    const value = physical(); Object.defineProperty(value.history.issuedBuckets, key, { value: 1 }); expect(() => materializeBackup(value)).toThrow();
  }
  const hidden = physical(); const array = hidden.history.issuedBuckets;
  Object.defineProperty(array, 0, { enumerable: false }); Object.assign(array, { extra: true });
  // Array indices must be present and enumerable, matching structured-clone DTOs.
  expect(() => materializeBackup(hidden)).toThrow();
});
it('rejects malformed physical keys including sparse or decorated key arrays', () => {
  for (const key of [["physical-generation"], ['physical-generation', 1], ['physical-generation', 'id:aa', 1]]) {
    const value = physical(); value.history.issuedBucketKeys[0] = key as IDBValidKey;
    expect(() => materializeBackup(value)).toThrow();
  }
  const value = physical(), key = value.history.issuedBucketKeys[0] as unknown[];
  Object.assign(key, { extra: 1 }); expect(() => materializeBackup(value)).toThrow();
  const hiddenKey = physical(), tuple = hiddenKey.history.issuedBucketKeys[0] as unknown[];
  Object.defineProperty(tuple, 0, { enumerable: false }); Object.assign(tuple, { extra: 1 }); expect(() => materializeBackup(hiddenKey)).toThrow();
  const empty = { physicalVersion: 1, generation: 'physical-generation', kind: 'receipt', bucket: '00', items: [] };
  expect(() => collectHistory('buckets-v1', 'physical-generation', 'receipt', [], [], [empty, empty], [['physical-generation', 'receipt:00'], ['physical-generation', 'receipt:00']])).toThrow();
});
it('binds real indexed role generations despite an inherited iterator override', () => {
  class HiddenRoles extends Array<RoleRecord> { override [Symbol.iterator](): ArrayIterator<RoleRecord> { return [][Symbol.iterator](); } }
  const input = physical(); input.base.roles = new HiddenRoles(...input.base.roles);
  expect(() => decodeBackup(materializeBackup(input))).not.toThrow();
  for (let index = 0; index < input.base.roles.length; index++) input.base.roles[index].generation = 'foreign';
  input.history.issuedBuckets = []; input.history.issuedBucketKeys = [];
  expect(() => materializeBackup(input)).toThrow();
});
