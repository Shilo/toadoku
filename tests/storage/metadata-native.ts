import { recoveryTestDatabase, metadataAllocationRequest, metadataSolved } from './native-cases';
import { databaseName } from '../../src/lib/storage/namespace';
import { transact } from '../../src/lib/storage/transaction';
import type { StorageResult } from '../../src/lib/gameplay/contracts';
import { decodeAttempt, decodeIntent, decodeRole } from '../../src/lib/storage/decode';
import { inspectRecovery } from './recovery-reader';

function committed<T>(result: StorageResult<T>): T { if (result.kind !== 'committed') throw new Error(JSON.stringify(result)); return result.value; }
export interface MetadataOutcome { layout: string; fault: string; kind: string; originalPreserved: boolean; preferencesKind?: string }
export async function nativeMetadataKeyBindings(): Promise<MetadataOutcome[]> {
  const outcomes = [];
  for (const layout of ['rows-v1', 'buckets-v1']) for (const fault of ['role-name', 'role-generation', 'pool-name', 'pool-generation', 'profile-generation', 'settings-generation']) {
    const test = await recoveryTestDatabase(); let raw: IDBDatabase | undefined;
    try {
      const current = committed(await test.repository.readCurrent()), generation = test.generation;
      raw = await new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(databaseName(test.base)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      const store = fault.startsWith('role') ? 'roles' : fault.startsWith('pool') ? 'pools' : fault.startsWith('profile') ? 'profile' : 'settings';
      const key: IDBValidKey = store === 'roles' ? [generation, 'quick'] : store === 'pools' ? [generation, 'easy'] : generation;
      const value: any = store === 'roles' ? structuredClone(current.roles.find(role => role.role === 'quick'))
        : store === 'pools' ? structuredClone(current.pools.find(pool => pool.pool === (fault === 'pool-name' ? 'hard-high' : 'easy')))
          : store === 'profile' ? structuredClone(current.profile) : structuredClone(current.preferences);
      if (fault === 'role-name') value.role = 'replay';
      value.generation = fault.endsWith('generation') ? 'foreign-generation' : generation;
      committed(await transact(raw, [store, 'meta'], 'readwrite', context => {
        context.store('meta').put({ generation, layout }, [generation, 'layout']); context.store(store).put(value, key); context.result(true);
      }, true));
      const before = JSON.stringify(value), result = await test.repository.readCurrent();
      const after = committed(await transact(raw, [store], 'readonly', context => context.request(context.store(store).get(key), data => context.result(data))));
      if (JSON.stringify(after) !== before) throw new Error('Metadata rejection modified the original record');
      const settingsResult = store === 'settings' ? await test.repository.readPreferences() : undefined;
      outcomes.push({ layout, fault, kind: result.kind, originalPreserved: true, ...(settingsResult ? { preferencesKind: settingsResult.kind } : {}) });
    } finally { raw?.close(); await test.cleanup(); }
  }
  for (const outcome of outcomes) if (outcome.kind !== 'corrupt') throw new Error(`metadata ${outcome.fault} accepted`);
  return outcomes;
}

async function rawDatabase(base: URL): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(databaseName(base)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
const essential = ['meta', 'settings', 'profile', 'roles', 'attempts', 'pools', 'issued', 'issuedBuckets', 'receipts', 'receiptBuckets', 'grants', 'intents'];
async function snapshot(database: IDBDatabase): Promise<string> {
  const rows = committed(await transact<Record<string, unknown>>(database, essential, 'readonly', context => {
    const result: Record<string, unknown> = {}; let remaining = essential.length * 2;
    const received = () => { if (!--remaining) context.result(result); };
    for (const store of essential) {
      context.request(context.store(store).getAll(), values => { result[`${store}:values`] = values; received(); });
      context.request(context.store(store).getAllKeys(), keys => { result[`${store}:keys`] = keys; received(); });
    }
  }));
  // These fixtures contain plain DTOs. Preserve an own undefined tag rather than dropping it.
  return JSON.stringify(rows, (_key, value) => value === undefined ? ['test-only-undefined'] : value);
}

export async function nativeOptionalGenerationTags(): Promise<{ untagged: number; rejectedPresentTags: number }> {
  let untagged = 0, rejectedPresentTags = 0;
  for (const layout of ['rows-v1', 'buckets-v1']) {
    const test = await recoveryTestDatabase(), raw = await rawDatabase(test.base), generation = test.generation;
    try {
      const current = committed(await test.repository.readCurrent());
      const prefs = { ...current.preferences }, profile = { ...current.profile }, pools = current.pools.map(pool => ({ ...pool }));
      for (const value of [prefs, profile, ...pools]) delete (value as { generation?: string }).generation;
      committed(await transact(raw, ['meta', 'settings', 'profile', 'pools'], 'readwrite', context => {
        context.store('meta').put({ generation, layout }, [generation, 'layout']);
        context.store('settings').put(prefs, generation); context.store('profile').put(profile, generation);
        for (const pool of pools) context.store('pools').put(pool, [generation, pool.pool]); context.result(true);
      }, true));
      committed(await test.repository.readCurrent()); committed(await test.repository.readPreferences()); untagged++;
      for (const [store, key, original] of [['settings', generation, prefs], ['profile', generation, profile], ['pools', [generation, 'easy'], pools.find(pool => pool.pool === 'easy')!]] as const) {
        const physicalKey: IDBValidKey = typeof key === 'string' ? key : [...key];
        for (const tag of [undefined, null, 0, 'foreign-generation']) {
          committed(await transact(raw, [store], 'readwrite', context => { context.store(store).put({ ...original, generation: tag }, physicalKey); context.result(true); }, true));
          const before = await snapshot(raw), result = await test.repository.readCurrent();
          if (result.kind !== 'corrupt') throw new Error('metadata present optional generation accepted');
          if (store === 'settings' && (await test.repository.readPreferences()).kind !== 'corrupt') throw new Error('metadata preferences generation accepted');
          if (await snapshot(raw) !== before) throw new Error('metadata generation rejection changed essential state');
          rejectedPresentTags++;
          committed(await transact(raw, [store], 'readwrite', context => { context.store(store).put(original, physicalKey); context.result(true); }, true));
        }
      }
    } finally { raw.close(); await test.cleanup(); }
  }
  return { untagged, rejectedPresentTags };
}

export async function nativeMetadataWriteBindings(): Promise<{ checked: number }> {
  const cases = [
    ['allocate', 'role-name'], ['allocate', 'role-generation'], ['allocate', 'other-role-generation'],
    ['allocate', 'pool-name'], ['allocate', 'pool-generation'], ['allocate', 'profile-generation'],
    ['acquire', 'attempt-id'], ['acquire', 'attempt-generation'], ['acquire', 'role-name'], ['acquire', 'role-generation'],
    ['save', 'role-name'], ['save', 'role-generation'], ['disclose', 'role-name'], ['disclose', 'role-generation'],
    ['complete', 'role-name'], ['complete', 'role-generation'], ['complete', 'profile-generation'],
    ['duplicate', 'intent-id'], ['duplicate', 'intent-generation'], ['duplicate', 'outcome-id'], ['duplicate', 'outcome-generation'], ['duplicate', 'outcome-role'],
    ['allocate-frontier', 'attempt-generation'], ['allocate-frontier', 'attempt-role'],
  ] as const;
  let checked = 0;
  for (const [operation, fault] of cases) {
    const test = await recoveryTestDatabase(), raw = await rawDatabase(test.base), generation = test.generation;
    try {
      const initialRequest = await metadataAllocationRequest(test.repository, generation);
      let game = operation === 'allocate' ? undefined : committed(await test.repository.allocate(initialRequest));
      if (operation === 'complete') game = await metadataSolved(test.repository, game!);
      const request = operation === 'allocate-frontier' ? await metadataAllocationRequest(test.repository, generation, 'frontier') : initialRequest;
      const current = committed(await test.repository.readCurrent());
      const store = fault.includes('role') && !fault.startsWith('outcome') && fault !== 'attempt-role' ? 'roles'
        : fault.startsWith('pool') ? 'pools' : fault.startsWith('profile') ? 'profile' : fault.startsWith('intent') ? 'intents' : 'attempts';
      const recordKey: IDBValidKey = store === 'roles' ? [generation, fault === 'other-role-generation' ? 'replay' : 'quick']
        : store === 'pools' ? [generation, 'easy'] : store === 'profile' ? generation : store === 'intents' ? [generation, initialRequest.intent.id] : [generation, game!.id];
      const value: any = committed(await transact(raw, [store], 'readonly', context => context.request(context.store(store).get(recordKey), value => context.result(value))));
      if (fault === 'role-name') value.role = 'replay';
      else if (fault === 'pool-name') Object.assign(value, current.pools.find(pool => pool.pool === 'hard-high'));
      else if (fault.endsWith('generation')) value.generation = 'foreign-generation';
      else if (fault.endsWith('id')) value.id = 'different-physical-id';
      else if (fault.endsWith('role')) { value.role = 'replay'; value.binding = structuredClone(current.profile.frontier); }
      if (store === 'roles') decodeRole(value); else if (store === 'attempts') decodeAttempt(value); else if (store === 'intents') decodeIntent(value);
      committed(await transact(raw, [store], 'readwrite', context => { context.store(store).put(value, recordKey); context.result(true); }, true));
      const before = await snapshot(raw);
      let result: StorageResult<unknown>;
      const guard = game ? { generation, attemptId: game.id, writer: game.writer } : undefined;
      if (operation === 'allocate' || operation === 'duplicate' || operation === 'allocate-frontier') result = await test.repository.allocate(request);
      else if (operation === 'acquire') result = await test.repository.acquireWriter(generation, game!.id, 'new-writer');
      else if (operation === 'save') result = await test.repository.saveSnapshot(guard!, game!.revision, { ...game!, commandSeq: game!.commandSeq + 1, elapsedMs: game!.elapsedMs + 1 });
      else if (operation === 'complete') result = await test.repository.complete(guard!, game!.revision);
      else {
        const cell = game!.definition.givens.indexOf('0');
        result = await test.repository.disclose(guard!, { id: 'miskeyed-proof', attemptId: game!.id, logicalRevision: game!.logicalRevision, information: true, exposed: [cell],
          payload: { kind: 'reveal', logicalRevision: game!.logicalRevision, cell, digit: Number(game!.definition.solution[cell]) } });
      }
      if (result.kind !== 'corrupt') throw new Error(`metadata write ${operation}/${fault} accepted`);
      if (await snapshot(raw) !== before) throw new Error(`metadata write ${operation}/${fault} changed essential state`);
      checked++;
    } finally { raw.close(); await test.cleanup(); }
  }
  return { checked };
}

export async function nativeMetadataExportBindings(): Promise<{ layout: string; normalKind: string; rawPreserved: boolean }[]> {
  const outcomes = [];
  for (const layout of ['rows-v1', 'buckets-v1']) {
    const test = await recoveryTestDatabase(), raw = await rawDatabase(test.base), generation = test.generation;
    try {
      const current = committed(await test.repository.readCurrent()), quick = current.roles.find(role => role.role === 'quick')!, replay = current.roles.find(role => role.role === 'replay')!;
      committed(await transact(raw, ['meta', 'roles'], 'readwrite', context => {
        context.store('meta').put({ generation, layout }, [generation, 'layout']);
        context.store('roles').put(quick, [generation, 'replay']); context.store('roles').put(replay, [generation, 'quick']); context.result(true);
      }, true));
      const before = await snapshot(raw), normal = await test.repository.exportBackup();
      const artifact = committed(await test.repository.exportRecovery()), recovered = inspectRecovery(await artifact.blob.text());
      const roles = recovered.stores.find((store: any) => store.name === 'roles');
      const quickIndex = roles.keys.findIndex((key: any) => key[0] === generation && key[1] === 'quick');
      if (roles.values[quickIndex].role !== 'replay' || await snapshot(raw) !== before) throw new Error('metadata export lost original physical key/value mapping');
      outcomes.push({ layout, normalKind: normal.kind, rawPreserved: true });
    } finally { raw.close(); await test.cleanup(); }
  }
  return outcomes;
}

export async function nativeGenerationPrefixBindings(): Promise<{ metadata: number; history: number; quarantine: number; boundaryKeys: number }> {
  let metadata = 0, history = 0, quarantine = 0, boundaryKeys = 0;
  for (const [store, shape] of [['roles', 'bare'], ['pools', 'extra'], ['attempts', 'nested'], ['intents', 'wrong-id']] as const) {
    const test = await recoveryTestDatabase(), raw = await rawDatabase(test.base), generation = test.generation;
    try {
      let identity = store === 'roles' ? 'quick' : 'easy';
      if (store === 'attempts' || store === 'intents') {
        const request = await metadataAllocationRequest(test.repository, generation); committed(await test.repository.allocate(request));
        identity = store === 'attempts' ? request.attempt.id : request.intent.id;
      }
      committed(await test.repository.exportBackup());
      const originalKey: IDBValidKey = [generation, identity];
      const invalidKey: IDBValidKey = shape === 'bare' ? [generation] : shape === 'extra' ? [generation, identity, 'extra']
        : shape === 'nested' ? [generation, [identity]] : [generation, 'wrong-id'];
      const value = committed(await transact(raw, [store], 'readonly', context => context.request(context.store(store).get(originalKey), value => context.result(value))));
      committed(await transact(raw, [store], 'readwrite', context => { context.store(store).put(value, invalidKey); context.store(store).delete(originalKey); context.result(true); }, true));
      const before = await snapshot(raw), exported = await test.repository.exportBackup();
      if (exported.kind !== 'corrupt') throw new Error(`metadata export malformed ${store} key accepted`);
      if (await snapshot(raw) !== before) throw new Error('metadata export changed malformed originals');
      if (store !== 'intents') {
        const invalid = await test.repository.readCurrent(); if (invalid.kind !== 'corrupt') throw new Error('metadata malformed primary key was not quarantined');
        const copies = committed(await transact<any[]>(raw, ['quarantine'], 'readonly', context => context.request(context.store('quarantine').getAll(), rows => context.result(rows))));
        if (!copies.some(copy => copy.raw?.keys?.[store]?.some((key: unknown) => JSON.stringify(key) === JSON.stringify(invalidKey)))) throw new Error('metadata quarantine omitted malformed primary key');
        quarantine++;
      }
      metadata++;
    } finally { raw.close(); await test.cleanup(); }
  }
  for (const fault of ['bare', 'extra', 'nested', 'foreign-tag', 'undefined-tag']) {
    const test = await recoveryTestDatabase(), raw = await rawDatabase(test.base), generation = test.generation;
    try {
      const correctKey = [generation, 'receipt:00'], value = { physicalVersion: 1, generation, kind: 'receipt', bucket: '00', items: [] };
      committed(await transact(raw, ['receiptBuckets'], 'readwrite', context => { context.store('receiptBuckets').put(value, correctKey); context.result(true); }, true));
      committed(await test.repository.exportBackup());
      const wrongKey: IDBValidKey = fault === 'bare' ? [generation] : fault === 'extra' ? [...correctKey, 'extra'] : fault === 'nested' ? [generation, ['receipt:00']] : correctKey;
      const wrongValue = { ...value, ...(fault === 'foreign-tag' ? { generation: 'foreign-generation' } : fault === 'undefined-tag' ? { generation: undefined } : {}) };
      committed(await transact(raw, ['receiptBuckets'], 'readwrite', context => {
        context.store('receiptBuckets').delete(correctKey); context.store('receiptBuckets').put(wrongValue, wrongKey); context.result(true);
      }, true));
      const before = await snapshot(raw), result = await test.repository.exportBackup();
      if (result.kind !== 'corrupt') throw new Error(`metadata export history ${fault} omitted`);
      if (await snapshot(raw) !== before) throw new Error('metadata export changed history originals'); history++;
    } finally { raw.close(); await test.cleanup(); }
  }
  const test = await recoveryTestDatabase(), raw = await rawDatabase(test.base), generation = test.generation;
  try {
    const range = IDBKeyRange.bound([generation], [`${generation}\u0000`], false, true);
    for (const key of [[generation], [generation, 'id'], [generation, 'id', 'extra'], [generation, ['nested']], [generation, []], [generation, 1], [generation, new Date(0)], [generation, new Uint8Array([1]).buffer]]) {
      if (!range.includes(key)) throw new Error('metadata generation prefix omitted a key type'); boundaryKeys++;
    }
    const neighbors = [[`${generation}0`, 'id'], [`${generation}\u0000`, 'id'], [`${generation}\u0000suffix`, 'id'], ['other-generation', 'id']];
    for (const key of neighbors) if (range.includes(key)) throw new Error('metadata generation prefix included another generation');
    committed(await transact(raw, ['roles'], 'readwrite', context => {
      for (const key of neighbors) context.store('roles').put({ unrelated: true }, key); context.result(true);
    }, true));
    committed(await test.repository.exportBackup());
  } finally { raw.close(); await test.cleanup(); }
  return { metadata, history, quarantine, boundaryKeys };
}
