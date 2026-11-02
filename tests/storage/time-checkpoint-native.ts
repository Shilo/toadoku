import type { Attempt, StorageResult } from '../../src/lib/gameplay/contracts';
import type { WriterGuard } from '../../src/lib/storage/repository';
import { databaseName } from '../../src/lib/storage/namespace';
import { decodeAttempt } from '../../src/lib/storage/decode';
import { transact } from '../../src/lib/storage/transaction';
import { reduceAttempt } from '../../src/lib/session/reducer';
import type { SessionCommand } from '../../src/lib/session/reducer';
import { recoveryTestDatabase, metadataAllocationRequest } from './native-cases';

function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function committed<T>(result: StorageResult<T>): T {
  check(result.kind === 'committed', JSON.stringify(result)); return result.value;
}
function guard(attempt: Attempt): WriterGuard { return { generation: attempt.generation, attemptId: attempt.id, writer: { ...attempt.writer } }; }
function command(attempt: Attempt, value: SessionCommand): Attempt {
  const result = reduceAttempt(attempt, value); check(result.kind === 'changed', `fixture command ${value.type} failed`); return result.attempt;
}
async function openRaw(base: URL): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName(base));
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function read<T>(database: IDBDatabase, store: string, key: IDBValidKey): Promise<T> {
  return committed(await transact<T>(database, [store], 'readonly', context => context.request(context.store(store).get(key), value => context.result(value as T))));
}
async function snapshot(database: IDBDatabase): Promise<string> {
  const stores = Array.from(database.objectStoreNames);
  const rows = committed(await transact<Record<string, unknown>>(database, stores, 'readonly', context => {
    const result: Record<string, unknown> = {}; let pending = stores.length * 2;
    const received = () => { if (!--pending) context.result(result); };
    for (const store of stores) {
      context.request(context.store(store).getAll(), value => { result[store + ':values'] = value; received(); });
      context.request(context.store(store).getAllKeys(), value => { result[store + ':keys'] = value; received(); });
    }
  }));
  return JSON.stringify(rows, (_key, value) => value === undefined ? ['time-test-undefined'] : value);
}

export async function nativeTimeCheckpointCases(): Promise<{ passed: string[]; invalidScalarCases: number }> {
  const test = await recoveryTestDatabase(), raw = await openRaw(test.base), passed: string[] = [];
  try {
    const allocated = committed(await test.repository.allocate(await metadataAllocationRequest(test.repository, test.generation)));
    const blanks = [...allocated.definition.givens].flatMap((value, cell) => value === '0' ? [cell] : []);
    check(blanks.length >= 2, 'certified fixture needs two editable cells');
    let value = command(allocated, { type: 'select', cell: blanks.find(cell => cell !== allocated.selection)! });
    const noteCell = value.selection, entryCell = blanks.find(cell => cell !== noteCell)!;
    value = command(value, { type: 'toggle-notes' }); value = command(value, { type: 'enter', digit: 3 });
    value = command(value, { type: 'toggle-notes' }); value = command(value, { type: 'select', cell: entryCell });
    value = command(value, { type: 'enter', digit: 1 });
    value = decodeAttempt({ ...value, elapsedMs: 321, assistance: { used: true, exposed: [noteCell] },
      pendingDisclosure: { id: 'time-fixture-disclosure', attemptId: value.id, logicalRevision: value.logicalRevision,
        information: true, exposed: [], payload: { kind: 'inconsistent', logicalRevision: value.logicalRevision } } });
    const initial = committed(await test.repository.saveSnapshot(guard(allocated), allocated.revision, value));
    const initialMeta = await read<{ generation: string; essentialRevision: number }>(raw, 'meta', 'current');
    const roleKey: IDBValidKey = [initial.generation, initial.role], attemptKey: IDBValidKey = [initial.generation, initial.id];
    const initialRole = await read<Record<string, unknown>>(raw, 'roles', roleKey);
    async function reset(attempt: unknown = initial, meta: unknown = initialMeta, role: unknown = initialRole) {
      committed(await transact(raw, ['attempts', 'meta', 'roles'], 'readwrite', context => {
        context.store('attempts').put(structuredClone(attempt), attemptKey);
        context.store('meta').put(structuredClone(meta), 'current');
        context.store('roles').put(structuredClone(role), roleKey); context.result(true);
      }));
    }
    async function rejected(name: string, request: () => Promise<StorageResult<Attempt>>, kind: string, reason?: string) {
      const before = await snapshot(raw), result = await request();
      check(result.kind === kind, `${name}: wrong outcome ${JSON.stringify(result)}`);
      if (reason) check('reason' in result && result.reason === reason, `${name}: wrong reason ${JSON.stringify(result)}`);
      check(await snapshot(raw) === before, `${name}: rejected command changed stored data`); passed.push(name);
    }
    const save = (attempt = initial, elapsed = 1000, sequence = attempt.commandSeq + 1) =>
      test.repository.saveTime(guard(attempt), attempt.revision, attempt.commandSeq, sequence, elapsed);

    const beforeSuccess = JSON.parse(await snapshot(raw)) as Record<string, unknown[]>;
    // The acknowledgement must arrive after native transaction completion, not request success.
    let complete = false;
    const originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
      const transaction = originalTransaction.apply(this, args);
      if (args[1] === 'readwrite' && transaction.objectStoreNames.contains('attempts')) transaction.addEventListener('complete', () => { complete = true; });
      return transaction;
    };
    let saved: Attempt;
    try {
      const capturedGuard = guard(initial), pending = test.repository.saveTime(capturedGuard, initial.revision, initial.commandSeq, initial.commandSeq + 3, 1000);
      capturedGuard.generation = 'mutated-after-call'; capturedGuard.writer.token = 'mutated-after-call';
      saved = committed(await pending);
      check(complete, 'time save acknowledged before transaction complete');
    } finally { IDBDatabase.prototype.transaction = originalTransaction; }
    const expected = { ...initial, commandSeq: initial.commandSeq + 3, elapsedMs: 1000, revision: initial.revision + 1 };
    check(JSON.stringify(saved) === JSON.stringify(expected), 'time save changed a non-time field');
    check(JSON.stringify(await read(raw, 'attempts', attemptKey)) === JSON.stringify(expected), 'independent readback disagreed with acknowledgement');
    check((await read<typeof initialMeta>(raw, 'meta', 'current')).essentialRevision === initialMeta.essentialRevision + 1, 'time save did not touch current generation exactly once');
    const expectedRows = structuredClone(beforeSuccess);
    const attemptIndex = expectedRows['attempts:keys'].findIndex(key => JSON.stringify(key) === JSON.stringify(attemptKey));
    const metaIndex = expectedRows['meta:keys'].findIndex(key => key === 'current');
    check(attemptIndex >= 0 && metaIndex >= 0, 'missing expected native rows');
    expectedRows['attempts:values'][attemptIndex] = expected;
    expectedRows['meta:values'][metaIndex] = { ...initialMeta, essentialRevision: initialMeta.essentialRevision + 1 };
    const expectedSnapshot = JSON.stringify(expectedRows, (_key, value) => value === undefined ? ['time-test-undefined'] : value);
    check(await snapshot(raw) === expectedSnapshot, 'successful time save changed unrelated roles, settings, rewards or history');
    saved.notes[noteCell] = 0; saved.undo[0].changes[0].beforeNotes = 511;
    check(JSON.stringify(await read(raw, 'attempts', attemptKey)) === JSON.stringify(expected), 'caller mutated the committed time save');
    passed.push('captured guard, complete acknowledgement and all-field preservation');
    const backwards = committed(await save(expected, 10));
    check(backwards.elapsedMs === 1000 && backwards.commandSeq === expected.commandSeq + 1, 'valid earlier elapsed sample rolled time back');
    passed.push('monotone elapsed with coalesced sequence gaps'); await reset();

    let invalidScalarCases = 0;
    for (const position of [0, 1, 2, 3]) for (const bad of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      const args = [initial.revision, initial.commandSeq, initial.commandSeq + 1, 1000]; args[position] = bad;
      await rejected(`invalid scalar ${position}/${invalidScalarCases++}`, () => test.repository.saveTime(guard(initial), args[0], args[1], args[2], args[3]), 'corrupt');
    }
    let coerced = false;
    await rejected('no scalar conversion hook', () => test.repository.saveTime(guard(initial), initial.revision, initial.commandSeq,
      initial.commandSeq + 1, { valueOf() { coerced = true; return 1000; } } as unknown as number), 'corrupt');
    check(!coerced, 'invalid scalar conversion hook ran');
    await rejected('non-increasing local sequence', () => save(initial, 1000, initial.commandSeq), 'corrupt');
    await rejected('stale revision', () => test.repository.saveTime(guard(initial), initial.revision + 1, initial.commandSeq, initial.commandSeq + 1, 1000), 'conflict', 'revision');
    await rejected('stale committed sequence', () => test.repository.saveTime(guard(initial), initial.revision, initial.commandSeq + 1, initial.commandSeq + 2, 1000), 'conflict', 'revision');
    const staleGuard = guard(initial); staleGuard.writer.token = 'different-writer';
    await rejected('stale writer', () => test.repository.saveTime(staleGuard, initial.revision, initial.commandSeq, initial.commandSeq + 1, 1000), 'conflict', 'owner');
    await reset(initial, { ...initialMeta, generation: 'replacement-generation' });
    await rejected('stale generation', () => save(), 'conflict', 'generation'); await reset();
    await reset(initial, initialMeta, { ...initialRole, attemptId: 'replacement-attempt' });
    await rejected('stale active role', () => save(), 'conflict', 'role'); await reset();
    await reset(initial, initialMeta, { ...initialRole, role: 'replay' });
    await rejected('corrupt physical role binding', () => save(), 'corrupt', 'role-key-binding'); await reset();

    const badHistory = structuredClone(initial); badHistory.undo[0].changes[0].afterNotes = 511;
    await reset(badHistory); await rejected('corrupt stored undo', () => save(), 'corrupt', 'undo-chain'); await reset();
    await reset({ ...initial, schemaVersion: 2 });
    await rejected('unknown future attempt', () => save(), 'unsupported-future', 'schema'); await reset();
    for (const status of ['pending-completion', 'completed', 'retired'] as const) {
      const frozen = decodeAttempt({ ...initial, status, ...(status === 'completed' ? { receiptId: initial.id } : {}) });
      await reset(frozen); await rejected(`frozen ${status}`, () => save(frozen), 'conflict', 'revision'); await reset();
    }
    const exhausted = { ...initial, revision: Number.MAX_SAFE_INTEGER };
    await reset(exhausted); await rejected('attempt revision overflow', () => save(exhausted), 'corrupt', 'integer'); await reset();
    await reset(initial, { ...initialMeta, essentialRevision: Number.MAX_SAFE_INTEGER });
    await rejected('generation revision overflow rolls back queued attempt put', () => save(), 'corrupt', 'integer'); await reset();

    const beforeAbort = await snapshot(raw); let requestSucceeded = false;
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      const request = originalPut.apply(this, args);
      if (this.name === 'attempts') request.addEventListener('success', () => { requestSucceeded = true; this.transaction.abort(); }, { once: true });
      return request;
    };
    try { check((await save()).kind === 'unavailable', 'aborted time save was acknowledged'); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    check(requestSucceeded && await snapshot(raw) === beforeAbort, 'request-success abort changed data or failed to reach the intended boundary');
    passed.push('request-success abort never acknowledges or partially writes');

    const pair = await Promise.all([save(initial, 1000, initial.commandSeq + 1), save(initial, 2000, initial.commandSeq + 2)]);
    check(pair.filter(result => result.kind === 'committed').length === 1 && pair.filter(result => result.kind === 'conflict').length === 1, 'concurrent compact writes bypassed revision CAS');
    check((await read<typeof initialMeta>(raw, 'meta', 'current')).essentialRevision === initialMeta.essentialRevision + 1, 'concurrent compact writes touched the generation more than once');
    const final = await read<Attempt>(raw, 'attempts', attemptKey);
    const winner = pair.find(result => result.kind === 'committed'); check(winner?.kind === 'committed', 'missing compact winner');
    check(JSON.stringify(final) === JSON.stringify(winner.value), 'concurrent winner disagrees with native readback');
    passed.push('concurrent compact writes serialize through CAS');
    return { passed, invalidScalarCases };
  } finally { raw.close(); await test.cleanup(); }
}
