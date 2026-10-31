import { openRepository } from '../../src/lib/storage/repository';
import type { AllocationRequest, Repository } from '../../src/lib/storage/repository';
import { databaseName } from '../../src/lib/storage/namespace';
import { StorageFailure, transact } from '../../src/lib/storage/transaction';
import type { Attempt, StorageResult } from '../../src/lib/gameplay/contracts';
import type { Definition, PoolState } from '../../src/lib/gameplay/contracts';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { verifyAttestedRecord } from '../../src/lib/catalog/attestation';
import { permutation } from '../../src/lib/catalog/select';
import { computeHint } from '../../src/lib/hints';
import { attempt, pools, preferences, profile } from './fixtures';

let certified: { definitions: Definition[]; pools: PoolState[] } | undefined;
async function certifiedFixtures(): Promise<NonNullable<typeof certified>> {
  if (certified) return certified;
  const loader = new CatalogLoader(new URL('/catalog/v1/', location.origin));
  const initialized = await loader.initialize(); check(initialized.kind === 'ready', `certified manifest unavailable: ${JSON.stringify(initialized)}`);
  const definitions: Definition[] = [];
  const order = permutation(initialized.value.pools.easy.count, 17);
  for (let index = 0; index < 2; index++) {
    const record = await loader.getRecord('easy', order[index]); check(record.kind === 'ready', `certified record unavailable: ${JSON.stringify(record)}`); definitions.push(record.value);
  }
  const poolStates = pools().map(pool => ({ ...pool, count: initialized.value.pools[pool.pool].count }));
  loader.dispose(); certified = { definitions, pools: poolStates }; return certified;
}

function check(condition: unknown, label: string): asserts condition { if (!condition) throw new Error(label); }
function committed<T>(result: StorageResult<T>): T {
  check(result.kind === 'committed', `expected committed: ${JSON.stringify(result)}`); return result.value;
}
async function fresh(): Promise<{ repository: Repository; generation: string; base: URL; cleanup: () => Promise<void> }> {
  const certified = await certifiedFixtures();
  const base = new URL(`/__storage-tests/${crypto.randomUUID()}/`, location.origin);
  const repository = committed(await openRepository({ baseUrl: base,
    initial: { preferences, profile, pools: certified.pools }, verifyDefinition: verifyAttestedRecord,
  }));
  const generation = committed(await repository.readCurrent()).meta.generation;
  return { repository, generation, base, cleanup: async () => {
    repository.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(databaseName(base)); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error);
    });
  } };
}
async function allocation(repository: Repository, generation: string, role: 'quick' | 'frontier' = 'quick'): Promise<AllocationRequest> {
  const state = committed(await repository.readCurrent()); const pool = state.pools.find(pool => pool.pool === 'easy')!;
  const roleRecord = state.roles.find(item => item.role === role)!;
  const value = attempt(generation, role, `${role}-attempt`);
  value.definition = (await certifiedFixtures()).definitions[pool.cursor];
  return { generation, intent: { id: `${role}-intent`, generation, role, sequence: 1, expectedRoleRevision: roleRecord.revision },
    attempt: value, expectedPoolRevision: pool.revision,
    nextPool: { ...pool, revision: pool.revision + 1, cursor: pool.cursor + 1, lifetimeIssued: pool.lifetimeIssued + 1 }, authorization: 'initial' };
}
async function allocate(repository: Repository, generation: string, role: 'quick' | 'frontier' = 'quick'): Promise<Attempt> {
  return committed(await repository.allocate(await allocation(repository, generation, role)));
}
function guard(value: Attempt) { return { generation: value.generation, attemptId: value.id, writer: value.writer }; }
async function solved(repository: Repository, value: Attempt): Promise<Attempt> {
  const next = structuredClone(value);
  next.entries = [...next.definition.givens].map((digit, cell) => digit === '0' ? Number(next.definition.solution[cell]) : 0);
  next.commandSeq++; next.logicalRevision++;
  next.elapsedMs = 300_000; next.status = 'pending-completion';
  return committed(await repository.saveSnapshot(guard(value), value.revision, next));
}

export async function nativeTransactionCases(): Promise<string[]> {
  const name = `toadodu-native-runner:${crypto.randomUUID()}`;
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1); request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const outcome = await transact(database, ['records'], 'readwrite', context => {
    context.request(context.store('records').put('new-value', 'key'), () => {
      context.result('request-succeeded'); context.abort(new StorageFailure({ kind: 'unavailable', reason: 'abort' }));
    });
  }, true);
  check(outcome.kind === 'unavailable', 'request success must not acknowledge aborted tx');
  const read = committed(await transact(database, ['records'], 'readonly', context => context.request(context.store('records').get('key'), value => context.result(value))));
  check(read === undefined, 'aborted transaction retained write');
  database.close(); await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); });
  return ['native request-success-before-abort acknowledged only abort; write rolled back'];
}

export async function nativeRepositoryCases(): Promise<string[]> {
  const test = await fresh(); const { repository, generation } = test;
  try {
    let quick = await allocate(repository, generation);
    const staleGuard = guard(quick);
    quick = committed(await repository.acquireWriter(generation, quick.id, 'new-writer'));
    check((await repository.saveSnapshot(staleGuard, 0, attempt(generation, 'quick', quick.id))).kind === 'conflict', 'stale writer accepted');
    const exposedCell = quick.definition.givens.indexOf('0');
    const disclosure = { id: 'disclosure-one', attemptId: quick.id, logicalRevision: quick.logicalRevision,
      payload: { kind: 'reveal' as const, logicalRevision: quick.logicalRevision, cell: exposedCell, digit: Number(quick.definition.solution[exposedCell]) }, exposed: [exposedCell], information: true as const };
    const staleDisclosure = await repository.disclose(staleGuard, disclosure);
    check(staleDisclosure.kind === 'conflict' && staleDisclosure.reason === 'owner', 'stale owner disclosed information');
    const timed = { ...quick, elapsedMs: 12_345 };
    const timedSave = repository.saveSnapshot(guard(quick), quick.revision, timed);
    timed.entries[exposedCell] = Number(quick.definition.solution[exposedCell]); timed.commandSeq++;
    quick = committed(await timedSave);
    check(quick.entries[exposedCell] === 0, 'caller mutation changed queued snapshot');
    quick = committed(await repository.disclose(guard(quick), disclosure));
    check(quick.elapsedMs === 12_345 && quick.assistance.used && quick.assistance.exposed[0] === exposedCell, 'disclosure lost timer or knowledge');
    quick = committed(await repository.disclose(guard(quick), disclosure));
    const frontier = await allocate(repository, generation, 'frontier');
    quick = await solved(repository, quick);
    const frontierSolved = await solved(repository, frontier);
    const [quickResult, frontierResult] = await Promise.all([
      repository.complete(guard(quick), quick.revision), repository.complete(guard(frontierSolved), frontierSolved.revision),
    ]);
    const q = committed(quickResult); const f = committed(frontierResult);
    const blanks = [...quick.definition.givens].filter(digit => digit === '0').length;
    const expectedQuick = Math.floor(100 * (blanks - 1) / blanks); const expectedWallet = expectedQuick + 105;
    check(q.receipt.result.dewdrops === expectedQuick && f.receipt.result.dewdrops === 105, 'incorrect independent role rewards');
    check(q.profile.wallet === q.profile.lifetimeEarned && f.profile.wallet === f.profile.lifetimeEarned
      && f.profile.wallet === expectedWallet, 'concurrent wallet delta/frontier failed');
    const state = committed(await repository.readCurrent());
    check(state.profile.wallet === expectedWallet && state.profile.frontier.leap === 2, 'concurrent wallet delta/frontier failed');
    check((await repository.complete(guard(quick), quick.revision)).kind === 'committed', 'repeated completion did not return retained receipt');
    check(committed(await repository.readCurrent()).profile.wallet === expectedWallet, 'duplicate completion awarded twice');
    const exported = committed(await repository.exportBackup());
    const preview = committed(await repository.previewRestore(exported.text));
    check(repository.backupTiming?.worker === true, 'browser backup validation did not use actual worker');
    const cancelledPreview = repository.previewRestore(exported.text); repository.cancelBackupWork();
    const cancelled = await cancelledPreview;
    check(cancelled.kind === 'unavailable' && cancelled.reason === 'abort', 'cancelled backup work returned a live preview');
    const tamperedPreview = structuredClone(preview);
    const priorDefinition = tamperedPreview.backup.attempts[0].definition;
    tamperedPreview.backup.attempts[0].definition = { ...priorDefinition, ratingTenths: priorDefinition.ratingTenths === 10 ? 11 : 10 };
    check((await repository.stageRestore(tamperedPreview)).kind === 'corrupt', 'mutated preview bypassed source attestation');
    const stage = committed(await repository.stageRestore(preview));
    check(committed(await repository.readCurrent()).meta.essentialRevision === preview.expected.essentialRevision, 'staging changed active revision');
    committed(await repository.savePreferences(generation, { ...preferences, language: 'de' }));
    check((await repository.activateRestore(stage)).kind === 'conflict', 'restore overwrote post-preview settings');
    const freshPreview = committed(await repository.previewRestore(exported.text));
    const freshStage = committed(await repository.stageRestore(freshPreview));
    const restored = committed(await repository.activateRestore(freshStage));
    check(restored.generation !== generation, 'restore failed generation switch');
    check((await repository.savePreferences(generation, preferences)).kind === 'conflict', 'old generation wrote after restore');
    const restoredState = committed(await repository.readCurrent());
    check(restoredState.profile.wallet === expectedWallet && restoredState.attempts.every(attempt => attempt.generation === restored.generation), 'restore did not retain records');
    committed(await repository.exportBackup());
    return ['writer epoch', 'timer-rebased durable disclosure', 'two-role reward serialization', 'completion idempotency', 'backup round-trip', 'staging revision isolation', 'restore concurrent edit CAS', 'old-generation rejection'];
  } finally { await test.cleanup(); }
}

export async function nativeAllocationDisclosureAborts(): Promise<{ allocation: number; disclosure: number }> {
  const counts = { allocation: 0, disclosure: 0 };
  for (const protocol of ['allocation', 'disclosure'] as const) {
    for (let abortAt = 1; abortAt <= 32; abortAt++) {
      const test = await fresh();
      try {
        const request = await allocation(test.repository, test.generation);
        const value = protocol === 'disclosure' ? committed(await test.repository.allocate(request)) : request.attempt;
        const cell = value.definition.givens.indexOf('0');
        const disclosure = { id: 'abort-disclosure', attemptId: value.id, logicalRevision: 0, information: true as const,
          exposed: [cell], payload: { kind: 'reveal' as const, logicalRevision: 0, cell, digit: Number(value.definition.solution[cell]) } };
        const original = IDBDatabase.prototype.transaction;
        let count = 0;
        IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
          const transaction = original.apply(this, args);
          if (args[1] === 'readwrite') transaction.addEventListener('success', () => { if (++count === abortAt) transaction.abort(); }, true);
          return transaction;
        };
        let result: StorageResult<Attempt>;
        try { result = await (protocol === 'allocation' ? test.repository.allocate(request) : test.repository.disclose(guard(value), disclosure)); }
        finally { IDBDatabase.prototype.transaction = original; }
        if (result.kind === 'committed') break;
        counts[protocol]++;
        const state = committed(await test.repository.readCurrent());
        if (protocol === 'allocation') {
          check(state.attempts.length === 0 && state.pools[0].cursor === 0 && state.pools[0].lifetimeIssued === 0, `partial allocation at ${abortAt}`);
          const issued = committed(await test.repository.readIssued(test.generation, value.definition.id, value.definition.groupId));
          check(!issued.id && !issued.group, 'aborted allocation left a reservation');
        } else check(state.attempts[0].assistance.used === false && !state.attempts[0].pendingDisclosure, `partial disclosure at ${abortAt}`);
      } finally { await test.cleanup(); }
    }
  }
  check(counts.allocation > 5 && counts.disclosure > 2, 'native protocol request hooks were not observed');
  return counts;
}

export async function nativeEnvironmentCases(): Promise<string[]> {
  const test = await fresh(); let second: Repository | undefined;
  try {
    let value = await allocate(test.repository, test.generation);
    second = committed(await openRepository({ baseUrl: test.base, initial: { preferences, profile, pools: (await certifiedFixtures()).pools }, verifyDefinition: verifyAttestedRecord }));
    const previous = guard(value);
    value = committed(await second.acquireWriter(test.generation, value.id, 'second-connection'));
    const stale = await test.repository.disclose(previous, { id: 'lost-message', attemptId: value.id, logicalRevision: 0, information: true,
      exposed: [], payload: { kind: 'inconsistent', logicalRevision: 0 } });
    check(stale.kind === 'conflict' && stale.reason === 'owner', 'independent connection ignored writer epoch');
    const originalPut = IDBObjectStore.prototype.put;
    const pending = { ...value, elapsedMs: 5000 };
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'attempts') throw new DOMException('Injected quota', 'QuotaExceededError');
      return originalPut.apply(this, args);
    };
    let failed: StorageResult<Attempt>;
    try { failed = await second.saveSnapshot(guard(value), value.revision, pending); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    check(failed.kind === 'unavailable' && failed.reason === 'quota', 'quota did not preserve actionable unsaved state');
    check(pending.elapsedMs === 5000 && committed(await second.readCurrent()).attempts[0].elapsedMs === 0, 'quota changed durable state or caller snapshot');
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'cache') throw new DOMException('Injected cache quota', 'QuotaExceededError');
      return originalPut.apply(this, args);
    };
    try { await second.cache.put('e'.repeat(64), new Uint8Array([1, 2, 3])); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    committed(await second.savePreferences(test.generation, { ...preferences, language: 'es' }));
    second.close();
    const closed = await second.savePreferences(test.generation, preferences);
    check(closed.kind === 'unavailable' && closed.reason === 'closed', 'closed connection was silently reset');
    const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName(test.base), 2); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    upgraded.close();
    const future = await openRepository({ baseUrl: test.base, initial: { preferences, profile, pools: (await certifiedFixtures()).pools }, verifyDefinition: verifyAttestedRecord });
    check(future.kind === 'unsupported-future', 'older application erased a future database');
  } finally { second?.close(); await test.cleanup(); }

  const corrupt = await fresh();
  try {
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName(corrupt.base)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    committed(await transact(raw, ['profile'], 'readwrite', context => {
      context.store('profile').put({ ...profile, generation: corrupt.generation, wallet: NaN }, corrupt.generation); context.result(true);
    }));
    check((await corrupt.repository.readCurrent()).kind === 'corrupt', 'corrupt profile silently defaulted');
    check(committed(await corrupt.repository.readPreferences()).language === 'en', 'corrupt profile destroyed independent settings');
    const saved = committed(await transact<unknown[]>(raw, ['quarantine'], 'readonly', context => context.request(context.store('quarantine').getAll(), values => context.result(values))));
    check(saved.length === 1 && Number.isNaN((saved[0] as { raw: { profile: { wallet: number }[] } }).raw.profile[0].wallet), 'quarantine did not preserve original corrupt value');
    check(committed(await corrupt.repository.exportRecovery()).includes('toadodu-recovery'), 'corrupt recovery export unavailable');
    raw.close();
  } finally { await corrupt.cleanup(); }
  return ['independent native connections', 'missed-notification epoch authority', 'injected essential/cache quota isolation', 'closed connection', 'future database preserved', 'quarantine original malformed value', 'independent preferences recovery'];
}

export async function nativeCorruptHistoryCases(): Promise<number> {
  let count = 0;
  for (const mutation of ['zero', 'null', 'wrong-group', 'wrong-pool', 'pair-count'] as const) {
    const test = await fresh();
    try {
      const value = await allocate(test.repository, test.generation);
      const raw = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(databaseName(test.base)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
      });
      const issued = committed(await test.repository.readIssued(test.generation, value.definition.id, value.definition.groupId)).id!;
      const corrupted: unknown = mutation === 'zero' ? 0 : mutation === 'null' ? null
        : mutation === 'wrong-group' ? { ...issued, groupId: 'f'.repeat(64) }
        : mutation === 'wrong-pool' ? { ...issued, pool: 'hard-high' } : { ...issued, issues: issued.issues + 1 };
      committed(await transact(raw, ['issued'], 'readwrite', context => {
        context.store('issued').put(corrupted, [test.generation, `id:${value.definition.id}`]); context.result(true);
      }));
      check((await test.repository.readIssued(test.generation, value.definition.id, value.definition.groupId)).kind === 'corrupt', `corrupt history treated as unused: ${mutation}`);
      const request = await allocation(test.repository, test.generation, 'frontier'); request.attempt.definition = value.definition;
      check((await test.repository.allocate(request)).kind === 'corrupt', `allocation bypassed corrupt history: ${mutation}`);
      const recovery = committed(await test.repository.exportRecovery());
      check(recovery.includes('issued-pair'), 'history quarantine missing');
      raw.close(); count++;
    } finally { await test.cleanup(); }
  }
  return count;
}

export async function nativeRetentionCases(): Promise<string[]> {
  const test = await fresh();
  try {
    const text = committed(await test.repository.exportBackup()).text;
    for (let cycle = 0; cycle < 3; cycle++) {
      const preview = committed(await test.repository.previewRestore(text)), stage = committed(await test.repository.stageRestore(preview));
      committed(await test.repository.activateRestore(stage)); await test.repository.cleanupGenerations();
    }
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName(test.base)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const inspect = () => transact<{ headers: number; pending: unknown; active: string; recovery: string }>(raw, ['meta'], 'readonly', context => {
      const requests = [context.store('meta').getAllKeys(), context.store('meta').get('pendingRestore'), context.store('meta').get('current'), context.store('meta').get('recovery')];
      const values: unknown[] = []; let left = requests.length;
      requests.forEach((request, index) => context.request(request, value => { values[index] = value; if (!--left) context.result({
        headers: (values[0] as IDBValidKey[]).filter(key => Array.isArray(key) && key[1] === 'stage').length,
        pending: values[1], active: (values[2] as { generation: string }).generation, recovery: (values[3] as { generation: string }).generation,
      }); }));
    });
    let status = committed(await inspect()); check(status.headers === 2 && status.active !== status.recovery, 'restore retention exceeded current plus recovery');
    const preview = committed(await test.repository.previewRestore(text));
    const cancelled = await test.repository.stageRestore(preview, { onProgress: () => test.repository.cancelBackupWork() });
    check(cancelled.kind === 'unavailable' && cancelled.reason === 'abort', 'cancelled stage reached ready marker');
    await test.repository.cleanupGenerations(); status = committed(await inspect());
    check(status.headers === 2 && !status.pending, 'cancelled stage remained an orphan');
    const stale = committed(await test.repository.stageRestore(committed(await test.repository.previewRestore(text))));
    const newest = committed(await test.repository.stageRestore(committed(await test.repository.previewRestore(text))));
    await test.repository.cleanupGenerations();
    const obsolete = await test.repository.activateRestore(stale);
    check(obsolete.kind === 'conflict' && obsolete.reason === 'intent', 'pruned superseded stage was not a clear intent conflict');
    committed(await test.repository.activateRestore(newest)); await test.repository.cleanupGenerations();
    status = committed(await inspect()); check(status.headers === 2 && !status.pending, 'cleanup removed protected or retained superseded generations');
    const stores = ['settings', 'profile', 'attempts', 'roles', 'receipts', 'grants', 'intents', 'pools', 'issued'];
    const generations = committed(await transact<string[]>(raw, stores, 'readonly', context => {
      const results: unknown[][] = new Array(stores.length); let remaining = stores.length;
      stores.forEach((store, index) => context.request(context.store(store).getAll(), records => {
        results[index] = records;
        if (!--remaining) context.result([...new Set(results.flat().map(record => (record as { generation: string }).generation))]);
      }));
    }));
    check(generations.length === 2 && generations.every(generation => generation === status.active || generation === status.recovery), 'essential rows survived outside current and recovery');
    raw.close();
    return ['current and immediate recovery retained', 'cancelled stage pruned', 'superseded stage cannot activate', 'live pending stage protected'];
  } finally { await test.cleanup(); }
}
export async function nativeCancelledValidationCase(): Promise<void> {
  const test = await fresh(); let delayed: Repository | undefined;
  try {
    await allocate(test.repository, test.generation);
    const preview = committed(await test.repository.previewRestore(committed(await test.repository.exportBackup()).text));
    let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    delayed = committed(await openRepository({ baseUrl: test.base, initial: { preferences, profile, pools: (await certifiedFixtures()).pools },
      verifyDefinition: async definition => { await gate; return verifyAttestedRecord(definition); } }));
    const nativeWorker = globalThis.Worker;
    try {
      // Explicit fallback-resource test. Other acceptance cases require the real Worker.
      globalThis.Worker = undefined as never;
      const pending = delayed.stageRestore(preview); delayed.cancelBackupWork(); release();
      const result = await pending;
      check(result.kind === 'unavailable' && result.reason === 'abort', 'cancelled delayed validation registered a restore');
    } finally { globalThis.Worker = nativeWorker; }
    const raw = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName(test.base)); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const pending = committed(await transact<unknown>(raw, ['meta'], 'readonly', context => context.request(context.store('meta').get('pendingRestore'), value => context.result(value))));
    check(pending === undefined, 'cancelled validation left pending metadata'); raw.close();
  } finally { delayed?.close(); await test.cleanup(); }
}

export async function nativeCapacityCase(batchSize: 256 | 1024 = 256): Promise<Record<string, unknown>> {
  const test = await fresh();
  const response = await fetch('/prototypes/gameplay-validation/storage/capacity-real.json');
  check(response.ok, 'run npm test -- tests/storage/capacity.test.ts to prepare ignored native capacity fixture');
  const text = await response.text();
  const started = performance.now();
  let beats = 0; let lastBeat = started; let maxGap = 0;
  const timer = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - lastBeat); lastBeat = now; beats++; }, 10);
  try {
    console.log('STORAGE_SCALE preview start');
    const preview = committed(await test.repository.previewRestore(text)); const previewAt = performance.now();
    check(preview.summary.receipts === 10_000 && preview.summary.issued === 100_000 && test.repository.backupTiming?.worker, 'worker capacity fixture counts');
    const previewTiming = test.repository.backupTiming;
    console.log('STORAGE_SCALE preview complete, stage start');
    const stage = committed(await test.repository.stageRestore(preview, { batchSize, onProgress: (done, total) => {
      if (done % 10240 === 0 || done === total) console.log(`STORAGE_SCALE stage ${done}/${total}`);
    } })); const stagedAt = performance.now();
    console.log('STORAGE_SCALE stage complete, export start');
    committed(await test.repository.activateRestore(stage));
    const exported = committed(await test.repository.exportBackup()); const exportedAt = performance.now();
    console.log('STORAGE_SCALE export complete, roundtrip start');
    const roundTrip = committed(await test.repository.previewRestore(exported.text)); const finished = performance.now();
    check(roundTrip.summary.receipts === 10_000 && roundTrip.summary.issued === 100_000 && roundTrip.summary.importedWallet === preview.summary.importedWallet, 'large native export/import lost canonical state');
    return { fixture: 'simulated history with all100k actual catalog identities and10k certified-definition receipts; not player journey evidence',
      bytes: test.repository.backupTiming?.bytes, receipts: roundTrip.summary.receipts, issued: roundTrip.summary.issued,
      previewMs: previewAt - started, previewTiming, stageMs: stagedAt - previewAt, stageTiming: test.repository.stageTiming, exportMs: exportedAt - stagedAt,
      roundTripMs: finished - exportedAt, totalMs: finished - started, heartbeatCount: beats, maxHeartbeatGapMs: maxGap };
  } finally { clearInterval(timer); await test.cleanup(); }
}

export async function nativeIndexBenchmark(count = 1000): Promise<Record<string, unknown>> {
  const name = `toadodu-index-benchmark:${crypto.randomUUID()}`, generation = crypto.randomUUID();
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, 1); request.onupgradeneeded = () => {
      request.result.createObjectStore('indexed').createIndex('generation', 'generation'); request.result.createObjectStore('primary');
    };
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
  const definition = (await certifiedFixtures()).definitions[0];
  const value = attempt(generation); value.definition = definition;
  const template = { schemaVersion: 1, id: value.id, generation, attemptId: value.id, puzzleId: definition.id, groupId: definition.groupId,
    definition, role: 'quick', policy: value.policy, result: { blanks: 50, exposed: 0, elapsedMs: 0, information: false, base: 100, targetMs: 600000, bonusBasisPoints: 1000, dewdrops: 110 } };
  const reports: Record<string, unknown> = {};
  try {
    for (const store of ['indexed', 'primary']) {
      const started = performance.now(); let maxCommitMs = 0;
      for (let start = 0; start < count; start += 256) {
        const before = performance.now();
        committed(await transact(database, [store], 'readwrite', context => {
          for (let index = start; index < Math.min(start + 256, count); index++) context.store(store).put({ ...template, id: `attempt-${index}`, attemptId: `attempt-${index}` }, [generation, `attempt-${index}`]);
          context.result(true);
        }, true));
        maxCommitMs = Math.max(maxCommitMs, performance.now() - before);
      }
      const putMs = performance.now() - started;
      const records = committed(await transact<unknown[]>(database, [store], 'readonly', context => {
        context.request(context.store(store).getAll(IDBKeyRange.bound([generation], [generation, []])), values => context.result(values));
      }));
      check(records.length === count, 'compound primary generation range missed records');
      reports[store] = { putMs, maxCommitMs, count: records.length, readMs: performance.now() - started - putMs };
    }
    // Array-key ordering includes every string secondary key, even beyond today's identifier alphabet.
    const range = IDBKeyRange.bound([generation], [generation, []]);
    for (const id of ['', 'a', '0', 'ephemeral:id', './path', 'ñ', '\uffff', '\uffffmore']) check(range.includes([generation, id]), 'primary range omitted a string key');
    check(!range.includes([`${generation}:other`, 'a']), 'primary range included another generation');
    return { rows: count, batch: 256, durability: 'strict', ...reports };
  } finally {
    database.close(); await new Promise<void>(resolve => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); });
  }
}

export async function nativeDisclosureProofCases(): Promise<string[]> {
  const test = await fresh();
  try {
    const value = await allocate(test.repository, test.generation);
    const values = [...value.definition.givens].map(Number);
    const computed = computeHint({ values, givens: values, logicalRevision: 0, target: values.indexOf(0) }, { nodeBudget: 1_000_000 });
    check(computed.kind === 'ready' && computed.payload.kind === 'deduction' && computed.payload.placements.length > 0, 'expected a certified Easy placement witness');
    const disclosure = { id: 'placement-proof', attemptId: value.id, logicalRevision: 0,
      payload: computed.payload, exposed: computed.payload.placements.map(item => item.cell), information: true as const };
    const missing = await test.repository.disclose(guard(value), { ...disclosure, exposed: [] });
    check(missing.kind === 'corrupt', 'placement answer committed without exposed ledger');
    const fabricated = structuredClone(disclosure); fabricated.id = 'false-witness';
    if (fabricated.payload.kind === 'deduction') fabricated.payload.technique = 'x-wing';
    const falseProof = await test.repository.disclose(guard(value), fabricated);
    check(falseProof.kind === 'corrupt', 'correct answer with false named witness accepted');
    const accepted = committed(await test.repository.disclose(guard(value), disclosure));
    check(accepted.assistance.used && accepted.assistance.exposed.length === disclosure.exposed.length, 'proved placement lost assistance');
    return ['placement exact answer ledger', 'false named witness rejected', 'satisfiable typed proof accepted'];
  } finally { await test.cleanup(); }
}

export async function nativeCompletionAbortCases(): Promise<{ injected: number; requests: number }> {
  let injected = 0; let observedRequests = 0;
  for (let abortAt = 1; abortAt <= 30; abortAt++) {
    const test = await fresh();
    try {
      const value = await solved(test.repository, await allocate(test.repository, test.generation, 'frontier'));
      const original = IDBDatabase.prototype.transaction;
      let count = 0;
      IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
        const transaction = original.apply(this, args);
        if (args[1] === 'readwrite') transaction.addEventListener('success', () => {
          if (++count === abortAt) transaction.abort();
        }, true);
        return transaction;
      };
      let result: Awaited<ReturnType<Repository['complete']>>;
      try { result = await test.repository.complete(guard(value), value.revision); }
      finally { IDBDatabase.prototype.transaction = original; }
      observedRequests = Math.max(observedRequests, count);
      const state = committed(await test.repository.readCurrent());
      if (result.kind === 'committed') {
        check(state.profile.wallet === 105 && state.profile.frontier.leap === 2, 'complete did not write all fields');
        break;
      }
      injected++;
      check(state.profile.wallet === 0 && state.profile.frontier.leap === 1 && state.attempts[0].status === 'pending-completion', `partial completion at request ${abortAt}`);
      const exported = committed(await test.repository.exportBackup());
      check(JSON.parse(exported.text).receipts.length === 0, 'aborted completion retained receipt');
    } finally { await test.cleanup(); }
  }
  check(injected > 5, 'abort injection did not observe native request events');
  return { injected, requests: observedRequests };
}
