import { exportRawRecovery } from '../../src/lib/storage/raw-recovery';
import { readRawSnapshot } from '../../src/lib/storage/raw-recovery-snapshot';
import { databaseName } from '../../src/lib/storage/namespace';
import { transact } from '../../src/lib/storage/transaction';
import { inspectRecovery } from './recovery-reader';
import { recoveryTestDatabase } from './native-cases';
import type { StorageResult } from '../../src/lib/gameplay/contracts';

function check(value: unknown, label: string): asserts value { if (!value) throw new Error(label); }
function committed<T>(value: StorageResult<T>): T { if (value.kind !== 'committed') throw new Error(JSON.stringify(value)); return value.value; }
function open(name: string, version: number, upgrade: (db: IDBDatabase) => void): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => { const request = indexedDB.open(name, version); request.onupgradeneeded = () => upgrade(request.result);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
}
async function remove(name: string): Promise<void> { await new Promise<void>((resolve, reject) => { const request = indexedDB.deleteDatabase(name); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); }

export async function nativeRawRecoveryCase(): Promise<Record<string, unknown>> {
  console.log('RECOVERY_NATIVE start');
  try { const threshold = 1n << 4_194_304n; console.log(`RECOVERY_NATIVE bigint threshold ${threshold > 0n}`); }
  catch (error) { console.log(`RECOVERY_NATIVE bigint threshold ${error instanceof Error ? error.name + ':' + error.message : String(error)}`); }
  check((99_999_999_999_999_999n >> 4_194_304n) === 0n && (-99_999_999_999_999_999n >> 4_194_304n) === -1n, 'native arithmetic rightshift failed');
  const base = new URL(`/__raw-recovery/${crypto.randomUUID()}/`, location.origin), name = databaseName(base);
  let db = await open(name, 7, db => {
    db.createObjectStore('corrupt'); db.createObjectStore('__proto__');
    const future = db.createObjectStore('future', { keyPath: 'id', autoIncrement: true });
    future.createIndex('tags', 'tags', { multiEntry: true }); future.createIndex('name', 'name', { unique: true });
  });
  const buffer = new ArrayBuffer(16); new Uint8Array(buffer).set([0, 2, 255, 4]);
  const alias = { frog: 'pond' }, map = new Map<unknown, unknown>(), set = new Set<unknown>(); map.set(map, alias); set.add(set);
  const graph: any = { alias, again: alias, map, set, date: new Date(123), invalidDate: new Date(NaN), regexp: /frog/g,
    error: new TypeError('broken', { cause: alias }), buffer, view: new Uint8Array(buffer, 1, 3), data: new DataView(buffer, 4, 8),
    missing: undefined, nan: NaN, negativeZero: -0, bigint: 99_999_999_999_999_999n,
    blob: new Blob(['pond'], { type: 'x/frog' }), file: new File(['frog'], 'frog.txt', { type: 'text/plain', lastModified: 1234 }),
    sparse: new Array(1_000_000), string: '\0\ud800🐸' };
  graph.self = graph; graph.sparse[999_999] = alias;
  const nativeCapabilities: Record<string, string> = {};
  for (const type of ['blob', 'file']) {
    const result = await transact(db, ['corrupt'], 'readwrite', context => { context.store('corrupt').put(graph[type], `capability-${type}`); context.result(true); }, true);
    nativeCapabilities[type] = result.kind === 'committed' ? 'stored' : JSON.stringify(result);
    if (result.kind !== 'committed') delete graph[type];
    else committed(await transact(db, ['corrupt'], 'readwrite', context => { context.store('corrupt').delete(`capability-${type}`); context.result(true); }, true));
  }
  const seeded = await transact(db, ['corrupt', '__proto__', 'future'], 'readwrite', context => {
    context.store('corrupt').put(graph, ['unknown-generation', 'profile']); context.store('__proto__').put({ schemaVersion: 999, wallet: NaN }, 'future');
    context.store('future').put({ id: 41, name: 'frog', tags: ['pond', 'green'] }); context.result(true);
  }, true);
  committed(seeded);
  let fileList = 'stored';
  try {
    const transfer = new DataTransfer(); transfer.items.add(new File(['native-list'], 'list.txt', { lastModified: 222 }));
    const stored = await transact(db, ['corrupt'], 'readwrite', context => { context.store('corrupt').put(transfer.files, 'files'); context.result(true); }, true);
    if (stored.kind !== 'committed') fileList = `native-put-rejected:${stored.kind}`;
  } catch (error) { fileList = `native-constructor-rejected:${error instanceof Error ? error.name : 'unknown'}`; }
  db.close();
  console.log('RECOVERY_NATIVE seeded');
  const before = committed(await readRawSnapshot(name));
  const lowerVersion = await new Promise<string>(resolve => { const request = indexedDB.open(name, 2); request.onerror = () => resolve(request.error!.name); request.onsuccess = () => { request.result.close(); resolve('unexpected-success'); }; });
  check(lowerVersion === 'VersionError', 'future fixture did not cause ordinary lower-version open failure');
  const artifact = committed(await exportRawRecovery(base)), snapshot = inspectRecovery(await artifact.blob.text());
  console.log('RECOVERY_NATIVE worker exported');
  check(snapshot.databaseVersion === 7 && snapshot.records === before.records && snapshot.stores.length === 3, 'raw future store/record loss');
  const corrupt = snapshot.stores.find((store: any) => store.name === 'corrupt'), restored = corrupt.values[corrupt.keys.findIndex((key: any) => Array.isArray(key))];
  check(restored.self === restored && restored.alias === restored.again && restored.map.get(restored.map) === restored.alias && restored.set.has(restored.set), 'graph aliases/cycles lost');
  check(restored.view.buffer === restored.buffer && restored.data.buffer === restored.buffer && restored.view.byteOffset === 1 && restored.view.length === 3 && restored.data.byteOffset === 4 && restored.data.byteLength === 8, 'shared binary views lost');
  check(Number.isNaN(restored.nan) && Object.is(restored.negativeZero, -0) && Object.hasOwn(restored, 'missing') && restored.missing === undefined && restored.bigint === graph.bigint, 'primitive native data lost');
  check(restored.sparse.length === 1_000_000 && !(0 in restored.sparse) && restored.sparse[999_999] === restored.alias && restored.string === graph.string, 'sparse/string data lost');
  check(restored.date.getTime() === 123 && Number.isNaN(restored.invalidDate.getTime()) && restored.regexp.source === 'frog' && restored.error.message === 'broken', 'native scalar types lost');
  if (nativeCapabilities.blob === 'stored') check(await restored.blob.text() === 'pond' && restored.blob.type === 'x/frog', 'blob loss');
  if (nativeCapabilities.file === 'stored') check(await restored.file.text() === 'frog' && restored.file.name === 'frog.txt' && restored.file.lastModified === 1234, 'file loss');
  if (fileList === 'stored') { const files = corrupt.values[corrupt.keys.indexOf('files')]; check(files.length === 1 && files[0].name === 'list.txt' && await files[0].text() === 'native-list', 'native FileList lost'); }
  const schema = snapshot.stores.find((store: any) => store.name === 'future');
  check(schema.keyPath === 'id' && schema.autoIncrement && schema.indexes.length === 2 && schema.indexes.find((index: any) => index.name === 'tags').multiEntry && schema.indexes.find((index: any) => index.name === 'name').unique, 'schema metadata lost');
  const after = committed(await readRawSnapshot(name)); check(after.databaseVersion === 7 && after.records === before.records, 'recovery changed native database');
  check(after.stores.every((store, index) => JSON.stringify(store.keys) === JSON.stringify(before.stores[index].keys)), 'recovery changed native keys');
  check(Number.isNaN((after.stores.find(store => store.name === '__proto__')!.values[0] as any).wallet), 'corrupt original changed');
  const modes: string[] = [], originalTransaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) { modes.push(args[1] ?? 'readonly'); return originalTransaction.apply(this, args); };
  try { committed(await readRawSnapshot(name)); } finally { IDBDatabase.prototype.transaction = originalTransaction; }
  check(modes.length === 1 && modes[0] === 'readonly', 'snapshot was not one readonly transaction');
  console.log('RECOVERY_NATIVE readonly verified');
  for (const bounds of [{ stores: 2 }, { indexes: 1 }, { records: before.records - 1 }]) {
    const rejected = await readRawSnapshot(name, indexedDB, bounds); check(rejected.kind === 'unavailable' && rejected.detail?.startsWith('raw-recovery-limit-'), 'native snapshot bound not enforced');
  }
  const originalGetAll = IDBObjectStore.prototype.getAll;
  let abortedReads = 0;
  IDBObjectStore.prototype.getAll = function (...args: Parameters<IDBObjectStore['getAll']>) {
    const request = originalGetAll.apply(this, args);
    request.addEventListener('success', () => { if (!abortedReads++) request.transaction!.abort(); }, { once: true }); return request;
  };
  try { const aborted = await readRawSnapshot(name); check(aborted.kind === 'unavailable', 'request-success-before-abort returned raw snapshot'); }
  finally { IDBObjectStore.prototype.getAll = originalGetAll; }
  check(abortedReads > 0 && committed(await readRawSnapshot(name)).records === before.records, 'aborted snapshot changed data');
  const cancel = new AbortController(); const cancelled = exportRawRecovery(base, { signal: cancel.signal }); cancel.abort();
  check((await cancelled).kind === 'unavailable', 'cancelled worker returned artifact');
  const preAbort = await exportRawRecovery(base, { signal: cancel.signal }); check(preAbort.kind === 'unavailable', 'preaborted worker returned artifact');
  // A terminated snapshot worker must not retain a connection that blocks a later upgrade.
  db = await open(name, 8, () => {}); db.close();
  console.log('RECOVERY_NATIVE cancelled and upgraded');
  await remove(name);
  const absent = new URL(`/__raw-missing/${crypto.randomUUID()}/`, location.origin), absentName = databaseName(absent);
  check(!(await indexedDB.databases()).some(db => db.name === absentName), 'missing fixture already exists');
  check((await exportRawRecovery(absent)).kind === 'unavailable', 'absent database exported');
  check(!(await indexedDB.databases()).some(db => db.name === absentName), 'readonly recovery created absent database');
  console.log('RECOVERY_NATIVE absent verified');
  db = await open(name, 9, () => {}); db.close();
  const empty = inspectRecovery(await committed(await exportRawRecovery(base)).blob.text()); check(empty.databaseVersion === 9 && empty.stores.length === 0 && empty.records === 0, 'empty future database failed');
  await remove(name);
  console.log('RECOVERY_NATIVE empty verified');
  db = await open(name, 10, db => { db.createObjectStore('platform'); });
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, false, ['encrypt']);
  const keyPut = await transact(db, ['platform'], 'readwrite', context => { context.store('platform').put(key, 'key'); context.result(true); }, true); db.close();
  let cryptoKey = 'native-put-rejected';
  if (keyPut.kind === 'committed') {
    const unsupported = await exportRawRecovery(base); check(unsupported.kind === 'unsupported-future' && unsupported.reason === 'raw-recovery-type-CryptoKey', 'unsupported platform value silently lost');
    check(committed(await readRawSnapshot(name)).records === 1, 'unsupported export modified database'); cryptoKey = 'stored-export-rejected-losslessly';
  }
  await remove(name);
  console.log('RECOVERY_NATIVE finished');
  return { versionError: lowerVersion, fileList, cryptoKey, nativeCapabilities, ...artifact.summary, readonlyTransactions: modes, noCreate: true, cancellation: true, abortedReads };
}

export async function nativeRawRecoveryCapacity(): Promise<Record<string, unknown>> {
  const test = await recoveryTestDatabase();
  try {
    const response = await fetch('/prototypes/gameplay-validation/storage/capacity-real.json'); check(response.ok, 'actual certified history fixture missing');
    const text = await response.text(), reports: unknown[] = [];
    for (let generation = 1; generation <= 2; generation++) {
      const preview = committed(await test.repository.previewRestore(text));
      const stage = committed(await test.repository.stageRestore(preview)); committed(await test.repository.activateRestore(stage));
      console.log(`RECOVERY_SCALE generation${generation} export start`);
      let beats = 0, maxGap = 0, lastBeat = performance.now();
      const heartbeat = setInterval(() => { const now = performance.now(); maxGap = Math.max(maxGap, now - lastBeat); lastBeat = now; beats++; }, 10);
      const started = performance.now(); let result;
      try { result = await test.repository.exportRecovery(); } finally { clearInterval(heartbeat); }
      reports.push(result.kind === 'committed' ? { generations: generation, ...result.value.summary, totalMs: performance.now() - started, mainHeartbeatCount: beats, mainMaxHeartbeatGapMs: maxGap }
        : { generations: generation, result, totalMs: performance.now() - started });
      console.log(`RECOVERY_SCALE ${JSON.stringify(reports.at(-1))}`);
      if (result.kind === 'committed') {
        // Inspect the encoded root table counts without rebuilding a second full 200k record graph.
        const encoded = JSON.parse(await result.value.blob.text()); check(encoded.application === 'toadodu-raw-recovery' && encoded.importable === false, 'wrong raw artifact');
        check(encoded.nodes.length === result.value.summary.nodes, 'raw capacity node truncation');
        const root = encoded.nodes[encoded.root.ref];
        const storesToken = root.entries.find((entry: any) => entry[0] === 'stores')[1];
        const stores = encoded.nodes[storesToken.ref].entries.map((entry: any) => encoded.nodes[entry[1].ref]);
        const storeField = (store: any, key: string) => store.entries.find((entry: any) => entry[0] === key)[1];
        const counts = stores.map((store: any) => ({ name: storeField(store, 'name'), count: encoded.nodes[storeField(store, 'keys').ref].length }));
        check(counts.reduce((sum: number, store: any) => sum + store.count, 0) === result.value.summary.records, 'raw store rows clipped');
        const receiptStore = stores.find((store: any) => storeField(store, 'name') === 'receiptBuckets');
        const issuedStore = stores.find((store: any) => storeField(store, 'name') === 'issuedBuckets');
        const logicalCount = (store: any) => encoded.nodes[storeField(store, 'values').ref].entries.reduce((sum: number, entry: any) => {
          const bucket = encoded.nodes[entry[1].ref]; return sum + encoded.nodes[storeField(bucket, 'items').ref].length;
        }, 0);
        check(logicalCount(receiptStore) === generation * 10_000 && logicalCount(issuedStore) === generation * 200_000, 'retained full histories omitted');
        Object.assign(reports.at(-1) as object, { nativeStoreCounts: counts, logicalReceipts: logicalCount(receiptStore), logicalIssuedProjections: logicalCount(issuedStore) });
      }
    }
    return { fixture: 'simulated completed history with actual100k certified identities and10k receipts per generation; not player journeys', reports };
  } finally { await test.cleanup(); }
}
