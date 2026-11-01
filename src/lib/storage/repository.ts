import type {
  AllocationIntent, Attempt, CompletionReceipt, Definition, Disclosure, GenerationMeta,
  PoolState, Preferences, Profile, Role, RoleRecord, StorageResult,
} from '../gameplay/contracts';
import type { PoolId, VerifiedShardCache } from '../catalog/types';
import { POOLS } from '../catalog/types';
import { nextOrdinal } from '../catalog/select';
import { countSolutions, isComplete } from '../sudoku';
import { validateWitness } from '../hints';
import { advanceFrontier, frontierGrantId } from '../modes';
import { safeAdd, rewardForAttempt } from '../rewards';
import {
  decodeAttempt, decodeDefinition, decodeDisclosure, decodeIntent, decodePool, decodePreferences,
  decodeProfile, decodeReceipt, decodeRole, identifier, increment, integer, mergeSnapshot,
  object, ROLES, same, recomputeReward, validateDisclosureAnswers,
} from './decode';
import { databaseName } from './namespace';
import { parseBoundedJson, BACKUP_LIMITS } from './json';
import { StorageFailure, storageFailure, transact } from './transaction';
import type { TransactionContext } from './transaction';
import { BackupValidationClient } from './backup-client';
import { validateDisclosureProof } from './disclosure';
import { assertCompleted, compositeBoard, decodeBackup, decodeIssued } from './backup';
import { historyLayout, historySlot } from './history';
import { bucketKey, decodeLayout, overflowKey, rowKey } from './history-codec';
import type { PhysicalBackup } from './physical-backup';
import { captureRestoreCounts, validatePreparedRestore } from './prepare-restore';
import type { RawRecoveryArtifact, RawRecoveryOptions } from './raw-recovery';
export { decodeBackup } from './backup';

const ESSENTIAL = ['meta', 'settings', 'profile', 'attempts', 'roles', 'receipts', 'grants', 'intents', 'pools', 'issued', 'issuedBuckets', 'receiptBuckets'] as const;
const STORES = [...ESSENTIAL, 'quarantine', 'cache'] as const;
const issue = (reason: 'generation' | 'revision' | 'owner' | 'role' | 'pool' | 'intent' | 'frontier'): never => {
  throw new StorageFailure({ kind: 'conflict', reason });
};
const corrupt = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason }); };
const key = (generation: string, id: string): [string, string] => [generation, id];
// IndexedDB compares strings by UTF16 code units and arrays lexicographically.
const generationRange = (generation: string): IDBKeyRange => IDBKeyRange.bound([generation], [`${generation}\u0000`], false, true);

function physicalGeneration(value: unknown, generation: string): void {
  const record = object(value);
  if (Object.hasOwn(record, 'generation') && record.generation !== generation) corrupt('physical-generation-key');
}
function roleAt(value: unknown, generation: string, expectedRole: Role): RoleRecord {
  const record = decodeRole(value);
  if (record.generation !== generation || record.role !== expectedRole) corrupt('role-key-binding');
  return record;
}
function poolAt(value: unknown, generation: string, expectedPool: PoolId): PoolState {
  const record = decodePool(value); physicalGeneration(value, generation);
  if (record.pool !== expectedPool) corrupt('pool-key-binding');
  return record;
}
function attemptAt(value: unknown, generation: string, expectedId: string, expectedRole?: Role): Attempt {
  const record = decodeAttempt(value);
  if (record.generation !== generation || record.id !== expectedId || (expectedRole !== undefined && record.role !== expectedRole)) corrupt('attempt-key-binding');
  return record;
}

export interface RepositoryOptions {
  baseUrl: URL | string;
  factory?: IDBFactory;
  initial: { preferences: Preferences; profile: Profile; pools: PoolState[] };
  /** Verify source/rating/identity against actual certified catalog bytes outside transactions. */
  verifyDefinition: (definition: Definition) => Promise<boolean>;
  onConnectionClosed?: () => void;
}
export interface CurrentSave {
  meta: GenerationMeta;
  preferences: Preferences;
  profile: Profile;
  roles: RoleRecord[];
  attempts: Attempt[];
  pools: PoolState[];
}
export interface WriterGuard {
  generation: string;
  attemptId: string;
  writer: { token: string; epoch: number };
}
export interface AllocationRequest {
  generation: string;
  intent: AllocationIntent;
  attempt: Attempt;
  expectedPoolRevision: number;
  nextPool: PoolState;
  authorization: 'initial' | 'replace' | 'continue';
  /** True only after the caller checked every currently active group and found no alternative. */
  allowActiveRepeat?: boolean;
}
export interface IssuedRecord {
  generation: string;
  id: string;
  groupId: string;
  catalogVersion: string;
  pool: PoolId;
  firstAttemptId: string;
  issues: number;
}
export interface Backup {
  schemaVersion: 1;
  application: 'toadodu';
  preferences: Preferences;
  profile: Profile;
  roles: RoleRecord[];
  attempts: Attempt[];
  pools: PoolState[];
  receipts: CompletionReceipt[];
  issued: IssuedRecord[];
  intents: AllocationIntent[];
}
export interface RestorePreview {
  expected: GenerationMeta;
  backup: Backup;
  summary: { replaceWallet: number; importedWallet: number; activeAttempts: number; receipts: number; issued: number };
}
export interface RestoreStage { generation: string; expected: GenerationMeta }
export interface StageOptions { batchSize?: 256 | 1024; onProgress?: (completed: number, total: number) => void }
export interface StageTiming { rows: number; transactions: number; batchSize: number; maxEnqueueMs: number; maxCommitMs: number; totalMs: number; validationMs: number; packingMs: number }
interface RestoreJob { jobVersion: 1; generation: string; status: 'staging' | 'ready' | 'abandoned' | 'pruning'; complete: boolean; expected?: GenerationMeta }

function meta(value: unknown): GenerationMeta {
  const input = object(value); identifier(input.generation); integer(input.essentialRevision);
  return input as unknown as GenerationMeta;
}
function readMany<T>(context: TransactionContext<T>, requests: IDBRequest[], accept: (values: unknown[]) => void): void {
  const values: unknown[] = new Array(requests.length);
  if (!requests.length) { accept(values); return; }
  let remaining = requests.length;
  requests.forEach((request, index) => context.request(request, value => {
    values[index] = value;
    if (--remaining === 0) accept(values);
  }));
}
function current<T>(context: TransactionContext<T>, generation: string, accept: (value: GenerationMeta) => void): void {
  context.request(context.store('meta').get('current'), value => {
    const active = meta(value);
    if (active.generation !== generation) issue('generation');
    accept(active);
  });
}
function touch<T>(context: TransactionContext<T>, active: GenerationMeta): void {
  context.store('meta').put({ ...active, essentialRevision: increment(active.essentialRevision) }, 'current');
}
function guardAttempt(attempt: Attempt, guard: WriterGuard, expectedRevision?: number): void {
  if (attempt.generation !== guard.generation || attempt.id !== guard.attemptId) issue('generation');
  if (!same(attempt.writer, guard.writer)) issue('owner');
  if (expectedRevision !== undefined && attempt.revision !== expectedRevision) issue('revision');
}
function captureGuard(value: WriterGuard): WriterGuard {
  const guard = structuredClone(value);
  identifier(guard.generation); identifier(guard.attemptId); identifier(guard.writer.token); integer(guard.writer.epoch, 1);
  return guard;
}
function issuedPair(values: unknown[], generation: string, id: string, groupId: string, pool?: PoolId): { id?: IssuedRecord; group?: IssuedRecord } {
  const byId = values[0] === undefined ? undefined : decodeIssued(values[0]);
  const byGroup = values[1] === undefined ? undefined : decodeIssued(values[1]);
  if (!!byId !== !!byGroup || (byId && byGroup && (!same(byId, byGroup) || byId.generation !== generation
    || byId.id !== id || byId.groupId !== groupId || (pool !== undefined && byId.pool !== pool)))) corrupt('issued-pair');
  return { id: byId, group: byGroup };
}
function restoreJob(value: unknown): RestoreJob {
  const input = object(value); identifier(input.generation);
  if (input.jobVersion === 1 && typeof input.complete === 'boolean' && ['staging', 'ready', 'abandoned', 'pruning'].includes(input.status as string)
    && Object.keys(input).every(key => ['jobVersion', 'generation', 'status', 'complete', 'expected'].includes(key))) return input as unknown as RestoreJob;
  // The only earlier v1 stage header emitted by this implementation, preserved explicitly.
  if (input.jobVersion === undefined && input.complete === true && Object.keys(input).every(key => ['generation', 'complete', 'expected'].includes(key))) {
    return { jobVersion: 1, generation: input.generation as string, status: 'ready', complete: true,
      ...(input.expected ? { expected: meta(input.expected) } : {}) };
  }
  throw new StorageFailure({ kind: 'unsupported-future', reason: 'restore-job' });
}
export async function openRepository(options: RepositoryOptions): Promise<StorageResult<Repository>> {
  let name: string;
  let initial: RepositoryOptions['initial'];
  try {
    name = databaseName(options.baseUrl);
    const preferences = decodePreferences(options.initial.preferences); const profile = decodeProfile(options.initial.profile);
    const pools = options.initial.pools.map(decodePool);
    if (pools.length !== 5 || new Set(pools.map(pool => pool.pool)).size !== 5) corrupt('initial-pools');
    initial = { preferences, profile, pools };
  } catch (error) { return storageFailure(error).issue; }
  const generation = crypto.randomUUID();
  return new Promise(resolve => {
    let request: IDBOpenDBRequest;
    let settled = false;
    const finish = (result: StorageResult<Repository>) => { if (!settled) { settled = true; resolve(result); } };
    try { request = (options.factory ?? indexedDB).open(name, 2); }
    catch (error) { finish(storageFailure(error).issue); return; }
    request.onblocked = () => finish({ kind: 'unavailable', reason: 'blocked' });
    request.onerror = () => finish(request.error?.name === 'VersionError'
      ? { kind: 'unsupported-future', reason: 'database-version' } : storageFailure(request.error).issue);
    request.onupgradeneeded = event => {
      if (settled) { request.transaction?.abort(); return; }
      const database = request.result;
      if (event.oldVersion === 1 && STORES.filter(store => store !== 'issuedBuckets' && store !== 'receiptBuckets')
        .some(store => !database.objectStoreNames.contains(store))) {
        finish({ kind: 'corrupt', reason: 'missing-legacy-store' }); request.transaction?.abort(); return;
      }
      for (const store of STORES) {
        if (database.objectStoreNames.contains(store)) continue;
        const created = database.createObjectStore(store);
        if (store !== 'meta' && store !== 'cache') created.createIndex('generation', 'generation');
      }
      // A known v1 database used rows for every profile generation. Materialize that fact once.
      if (event.oldVersion === 1) {
        const transaction = request.transaction!;
        const cursorRequest = transaction.objectStore('profile').openKeyCursor();
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result; if (!cursor) return;
          try {
            const existingGeneration = identifier(cursor.primaryKey);
            transaction.objectStore('meta').put({ generation: existingGeneration, layout: 'rows-v1' }, key(existingGeneration, 'layout'));
            cursor.continue();
          } catch { finish({ kind: 'corrupt', reason: 'legacy-generation-key' }); transaction.abort(); }
        };
        return;
      }
      const transaction = request.transaction!;
      transaction.objectStore('meta').put({ generation, essentialRevision: 0 }, 'current');
      transaction.objectStore('meta').put({ generation, complete: true }, key(generation, 'stage'));
      transaction.objectStore('meta').put({ generation, layout: 'buckets-v1' }, key(generation, 'layout'));
      transaction.objectStore('settings').put({ ...initial.preferences, generation }, generation);
      transaction.objectStore('profile').put({ ...initial.profile, generation }, generation);
      for (const role of ROLES) transaction.objectStore('roles').put({ generation, role, revision: 0, lastIntentSeq: 0 }, key(generation, role));
      for (const pool of initial.pools) transaction.objectStore('pools').put({ ...pool, generation }, key(generation, pool.pool));
    };
    request.onsuccess = () => {
      const database = request.result;
      if (settled) { database.close(); return; }
      const repository = new Repository(database, options.verifyDefinition);
      database.onversionchange = () => { repository.close(); options.onConnectionClosed?.(); };
      database.onclose = () => { repository.closed = true; options.onConnectionClosed?.(); };
      finish({ kind: 'committed', value: repository });
    };
  });
}

export class Repository {
  readonly durability = 'durable' as const;
  closed = false;
  private backupValidation = new BackupValidationClient();
  private backupSequence = 0;
  private currentStageGeneration?: string;
  stageTiming?: StageTiming;
  private maintenance?: Promise<void>;
  maintenanceResult?: StorageResult<number>;
  constructor(private readonly database: IDBDatabase, private readonly verifyDefinition: RepositoryOptions['verifyDefinition']) {}
  close(): void { this.cancelBackupWork(); this.closed = true; this.database.close(); }
  cancelBackupWork(): void {
    this.backupSequence++; this.backupValidation.cancel();
    const generation = this.currentStageGeneration; this.currentStageGeneration = undefined;
    if (generation && !this.closed) void this.abandonStage(generation);
  }
  private async abandonStage(generation: string): Promise<void> {
    const result = await transact(this.database, ['meta'], 'readwrite', context => {
      readMany(context, [context.store('meta').get('pendingRestore'), context.store('meta').get(key(generation, 'stage'))], values => {
        if (!values[0] || object(values[0]).generation !== generation) { context.result(false); return; }
        const job = restoreJob(values[1]);
        context.store('meta').put({ ...job, status: 'abandoned' }, key(generation, 'stage')); context.store('meta').delete('pendingRestore'); context.result(true);
      });
    });
    if (result.kind === 'committed' && !this.closed) void this.cleanupGenerations();
  }
  get backupTiming() { return this.backupValidation.timing; }

  async readCurrent(): Promise<StorageResult<CurrentSave>> {
    const result = await transact<CurrentSave>(this.database, ESSENTIAL, 'readonly', context => {
      context.request(context.store('meta').get('current'), value => {
        const active = meta(value); const generation = active.generation;
        readMany(context, [context.store('settings').get(generation), context.store('profile').get(generation),
          ...ROLES.map(role => context.store('roles').get(key(generation, role))),
          ...POOLS.map(pool => context.store('pools').get(key(generation, pool))), context.store('meta').get(key(generation, 'layout'))], values => {
          const preferences = decodePreferences(values[0]); const profile = decodeProfile(values[1]);
          physicalGeneration(values[0], generation); physicalGeneration(values[1], generation);
          const roles = ROLES.map((role, index) => roleAt(values[index + 2], generation, role));
          const pools = POOLS.map((pool, index) => poolAt(values[index + 5], generation, pool));
          decodeLayout(values[10], generation);
          const bound = roles.filter(role => role.attemptId);
          readMany(context, bound.map(role => context.store('attempts').get(key(generation, role.attemptId!))), entries => {
            const attempts = bound.map((role, index) => attemptAt(entries[index], generation, role.attemptId!, role.role));
            context.result({ meta: active, preferences, profile, roles, pools, attempts });
          });
        });
      });
    });
    if (result.kind !== 'committed') {
      if (result.kind === 'corrupt' || result.kind === 'unsupported-future') await this.quarantineCurrent(result.reason);
      return result;
    }
    try {
      for (const attempt of result.value.attempts) if (!await this.verifyDefinition(attempt.definition)) return { kind: 'corrupt', reason: 'resume-provenance' };
      return result;
    } catch (error) { return storageFailure(error).issue; }
  }

  readPreferences(): Promise<StorageResult<Preferences>> {
    return transact(this.database, ['meta', 'settings'], 'readonly', context => {
      context.request(context.store('meta').get('current'), value => {
        const active = meta(value);
        context.request(context.store('settings').get(active.generation), value => {
          const preferences = decodePreferences(value); physicalGeneration(value, active.generation); context.result(preferences);
        });
      });
    });
  }

  private async quarantineCurrent(reason: string): Promise<void> {
    const captured = await transact<{ generation: string; raw: unknown }>(this.database, ESSENTIAL, 'readonly', context => {
      context.request(context.store('meta').get('current'), rawMeta => {
        const generation = rawMeta && typeof rawMeta === 'object' && typeof rawMeta.generation === 'string' ? rawMeta.generation : 'unresolved';
        const stores = ['settings', 'profile', 'attempts', 'roles', 'pools'];
        readMany(context, [...stores.flatMap(store => {
          const range = store === 'settings' || store === 'profile' ? IDBKeyRange.only(generation) : generationRange(generation);
          return [context.store(store).getAll(range), context.store(store).getAllKeys(range)];
        }), context.store('meta').get(key(generation, 'layout'))], values => {
          context.result({ generation, raw: { meta: rawMeta, layout: values[stores.length * 2],
            keys: Object.fromEntries(stores.map((store, index) => [store, values[index * 2 + 1]])),
            ...Object.fromEntries(stores.map((store, index) => [store, values[index * 2]])) } });
        });
      });
    });
    if (captured.kind !== 'committed') return;
    await transact(this.database, ['quarantine'], 'readwrite', context => {
      const recordKey = key(captured.value.generation, reason);
      context.request(context.store('quarantine').get(recordKey), previous => {
        // Preserve the first original snapshot for this error. Authoritative records remain untouched.
        if (previous === undefined) context.store('quarantine').put({ ...captured.value, reason }, recordKey);
        context.result(true);
      });
    });
  }

  async exportRecovery(options: RawRecoveryOptions = {}): Promise<StorageResult<RawRecoveryArtifact>> {
    const { exportRawRecoveryName } = await import('./raw-recovery');
    return exportRawRecoveryName(this.database.name, options);
  }

  async readIssued(generation: string, id: string, groupId: string): Promise<StorageResult<{ id?: IssuedRecord; group?: IssuedRecord }>> {
    const result = await transact<{ id?: IssuedRecord; group?: IssuedRecord }>(this.database, ['meta', 'issued', 'issuedBuckets'], 'readonly', context => current(context, generation, () => {
      historyLayout(context, generation, layout => historySlot(context, generation, 'id', id, byId => {
        historySlot(context, generation, 'group', groupId, byGroup => context.result(issuedPair([byId.value, byGroup.value], generation, id, groupId)), layout);
      }, layout));
    }));
    if (result.kind === 'corrupt') await this.quarantineIssued(generation, id, groupId);
    return result;
  }
  private async quarantineIssued(generation: string, id: string, groupId: string): Promise<void> {
    let locations: { store: string; key: IDBValidKey }[];
    try { locations = (['id', 'group'] as const).flatMap(kind => {
      const identifier = kind === 'id' ? id : groupId;
      return [{ store: 'issued', key: rowKey(generation, kind, identifier) }, { store: 'issued', key: overflowKey(generation, kind, identifier) },
        { store: 'issuedBuckets', key: bucketKey(generation, kind, identifier) }];
    }); } catch { return; }
    const records = await transact<unknown[]>(this.database, ['issued', 'issuedBuckets'], 'readonly', context => {
      readMany(context, locations.map(location => context.store(location.store).get(location.key)), values => context.result(values));
    });
    if (records.kind !== 'committed') return;
    await transact(this.database, ['quarantine'], 'readwrite', context => {
      const recoveryKey = key(generation, `issued:${id}:${groupId}`);
      context.request(context.store('quarantine').get(recoveryKey), old => {
        if (old === undefined) context.store('quarantine').put({ generation, reason: 'issued-pair', locations, raw: records.value }, recoveryKey);
        context.result(true);
      });
    });
  }

  acquireWriter(generation: string, attemptId: string, token: string): Promise<StorageResult<Attempt>> {
    return transact(this.database, ['meta', 'attempts', 'roles'], 'readwrite', context => current(context, generation, active => {
      identifier(token);
      context.request(context.store('attempts').get(key(generation, attemptId)), value => {
        const attempt = attemptAt(value, generation, attemptId);
        context.request(context.store('roles').get(key(generation, attempt.role)), value => {
          const role = roleAt(value, generation, attempt.role);
          if (role.attemptId !== attemptId) issue('role');
          const next: Attempt = { ...attempt, revision: increment(attempt.revision), writer: { token, epoch: increment(attempt.writer.epoch) } };
          context.store('attempts').put(next, key(generation, attemptId)); touch(context, active); context.result(next);
        });
      });
    }));
  }

  saveSnapshot(inputGuard: WriterGuard, expectedRevision: number, inputSnapshot: Attempt): Promise<StorageResult<Attempt>> {
    let guard: WriterGuard, snapshot: Attempt;
    try { guard = captureGuard(inputGuard); snapshot = decodeAttempt(inputSnapshot); integer(expectedRevision); } catch (error) { return Promise.resolve(storageFailure(error).issue); }
    return transact(this.database, ['meta', 'attempts', 'roles'], 'readwrite', context => current(context, guard.generation, active => {
      context.request(context.store('attempts').get(key(guard.generation, guard.attemptId)), value => {
        const attempt = attemptAt(value, guard.generation, guard.attemptId); guardAttempt(attempt, guard, expectedRevision);
        context.request(context.store('roles').get(key(guard.generation, attempt.role)), value => {
          if (roleAt(value, guard.generation, attempt.role).attemptId !== attempt.id) issue('role');
          const next = mergeSnapshot(attempt, snapshot); next.revision = increment(attempt.revision);
          context.store('attempts').put(next, key(guard.generation, attempt.id)); touch(context, active); context.result(next);
        });
      });
    }));
  }

  savePreferences(generation: string, input: Preferences): Promise<StorageResult<Preferences>> {
    let preferences: Preferences;
    try { preferences = decodePreferences(input); } catch (error) { return Promise.resolve(storageFailure(error).issue); }
    return transact(this.database, ['meta', 'settings'], 'readwrite', context => current(context, generation, active => {
      context.store('settings').put({ ...preferences, generation }, generation); touch(context, active); context.result(preferences);
    }));
  }

  async disclose(inputGuard: WriterGuard, input: Disclosure): Promise<StorageResult<Attempt>> {
    let guard: WriterGuard, disclosure: Disclosure;
    try { guard = captureGuard(inputGuard); disclosure = decodeDisclosure(input); } catch (error) { return storageFailure(error).issue; }
    const preflight = await transact<Attempt>(this.database, ['meta', 'attempts'], 'readonly', context => current(context, guard.generation, () => {
      context.request(context.store('attempts').get(key(guard.generation, guard.attemptId)), value => {
        const attempt = attemptAt(value, guard.generation, guard.attemptId); guardAttempt(attempt, guard);
        if (attempt.status !== 'playing' || disclosure.logicalRevision !== attempt.logicalRevision || disclosure.attemptId !== attempt.id) issue('revision');
        validateDisclosureAnswers(attempt.definition, disclosure); context.result(attempt);
      });
    }));
    if (preflight.kind !== 'committed') return preflight;
    const frozen = preflight.value;
    const proof = validateDisclosureProof(frozen, disclosure);
    if (proof.kind !== 'committed') return proof;
    return transact(this.database, ['meta', 'attempts', 'roles'], 'readwrite', context => current(context, guard.generation, active => {
      context.request(context.store('attempts').get(key(guard.generation, guard.attemptId)), value => {
        const attempt = attemptAt(value, guard.generation, guard.attemptId); guardAttempt(attempt, guard);
        if (attempt.status !== 'playing' || disclosure.attemptId !== attempt.id || disclosure.logicalRevision !== attempt.logicalRevision
          || !same(attempt.definition, frozen.definition)) issue('revision');
        context.request(context.store('roles').get(key(guard.generation, attempt.role)), value => {
          if (roleAt(value, guard.generation, attempt.role).attemptId !== attempt.id) issue('role');
          if (attempt.pendingDisclosure?.id === disclosure.id) {
            if (!same(attempt.pendingDisclosure, disclosure)) corrupt('disclosure-id-collision');
            context.result(attempt); return;
          }
          for (const cell of disclosure.exposed) if (attempt.definition.givens[cell] !== '0') corrupt('clue-disclosure');
          if (disclosure.payload.kind === 'reveal') {
            const { cell, digit } = disclosure.payload;
            if (Number(attempt.definition.solution[cell]) !== digit || !disclosure.exposed.includes(cell)) corrupt('reveal-payload');
          }
          const next: Attempt = { ...attempt, revision: increment(attempt.revision), pendingDisclosure: structuredClone(disclosure), assistance: {
            used: true, exposed: [...new Set([...attempt.assistance.exposed, ...disclosure.exposed])].sort((a, b) => a - b),
          } };
          decodeAttempt(next); context.store('attempts').put(next, key(guard.generation, attempt.id)); touch(context, active); context.result(next);
        });
      });
    }), true);
  }

  async allocate(input: AllocationRequest): Promise<StorageResult<Attempt>> {
    let request: AllocationRequest;
    try {
      request = structuredClone(input);
      request.attempt = decodeAttempt(request.attempt); request.intent = decodeIntent(request.intent); request.nextPool = decodePool(request.nextPool);
      if (!await this.verifyDefinition(request.attempt.definition)) corrupt('allocation-provenance');
      if (request.attempt.generation !== request.generation || request.intent.generation !== request.generation
        || request.attempt.role !== request.intent.role || request.attempt.status !== 'playing' || request.attempt.commandSeq !== 0
        || request.attempt.logicalRevision !== 0 || request.attempt.revision !== 0 || request.attempt.elapsedMs !== 0
        || request.attempt.entries.some(Boolean) || request.attempt.notes.some(Boolean) || request.attempt.undo.length
        || request.attempt.assistance.used || request.attempt.assistance.exposed.length || request.attempt.pendingDisclosure) corrupt('new-attempt');
    } catch (error) { return storageFailure(error).issue; }
    const result = await transact<Attempt>(this.database, ESSENTIAL, 'readwrite', context => current(context, request.generation, active => {
      const generation = request.generation; const { intent, attempt } = request;
      readMany(context, [context.store('intents').get(key(generation, intent.id)), context.store('roles').get(key(generation, intent.role)),
        context.store('profile').get(generation), context.store('pools').get(key(generation, attempt.definition.pool)),
        ...ROLES.map(role => context.store('roles').get(key(generation, role)))], values => {
        const priorIntent = values[0] === undefined ? undefined : decodeIntent(values[0]);
        if (priorIntent && (priorIntent.id !== intent.id || priorIntent.generation !== generation || priorIntent.role !== intent.role)) corrupt('intent-key-binding');
        const role = roleAt(values[1], generation, intent.role); const profile = decodeProfile(values[2]); physicalGeneration(values[2], generation);
        const pool = poolAt(values[3], generation, attempt.definition.pool);
        const currentRoles = ROLES.map((expected, index) => roleAt(values[index + 4], generation, expected));
        if (priorIntent) {
          const comparable = { ...priorIntent }; delete comparable.outcomeAttemptId;
          if (!same(comparable, intent) || !priorIntent.outcomeAttemptId) issue('intent');
          context.request(context.store('attempts').get(key(generation, priorIntent.outcomeAttemptId!)), outcome => {
            if (!outcome || role.attemptId !== priorIntent.outcomeAttemptId) issue('intent');
            context.result(attemptAt(outcome, generation, priorIntent.outcomeAttemptId!, intent.role));
          });
          return;
        }
        if (intent.sequence !== role.lastIntentSeq + 1 || intent.expectedRoleRevision !== role.revision || intent.previousAttemptId !== role.attemptId) issue('intent');
        if (pool.revision !== request.expectedPoolRevision || request.nextPool.revision !== pool.revision + 1 || request.nextPool.pool !== pool.pool
          || request.nextPool.count !== pool.count || request.nextPool.catalogVersion !== pool.catalogVersion || attempt.definition.catalogVersion !== pool.catalogVersion) issue('pool');
        historyLayout(context, generation, layout => historySlot(context, generation, 'id', attempt.definition.id, byId => {
        historySlot(context, generation, 'group', attempt.definition.groupId, byGroup => {
        const history = issuedPair([byId.value, byGroup.value], generation, attempt.definition.id, attempt.definition.groupId, pool.pool);
        const previousIssued = history.id; const groupIssued = history.group;
        const firstIssue = !previousIssued && !groupIssued;
        if (!firstIssue && pool.lifetimeIssued < pool.count) issue('pool');
        if (request.nextPool.lifetimeIssued !== pool.lifetimeIssued + (firstIssue ? 1 : 0) || request.nextPool.lifetimeIssued > pool.count) issue('pool');
        const bound = currentRoles.filter(record => record.attemptId);
        readMany(context, bound.map(record => context.store('attempts').get(key(generation, record.attemptId!))), snapshots => {
          const attempts = bound.map((record, index) => attemptAt(snapshots[index], generation, record.attemptId!, record.role));
          const old = attempts.find(item => item.id === role.attemptId);
          if (old) {
            if (old.status === 'pending-completion') issue('role');
            if (old.status === 'completed') {
              if (request.authorization !== 'continue' || intent.receiptId !== old.receiptId) issue('role');
            } else if (request.authorization !== 'replace') issue('role');
          } else if (request.authorization !== 'initial') issue('role');
          const blocked = attempts.filter(item => item.definition.pool === pool.pool && item.definition.catalogVersion === pool.catalogVersion)
            .map(item => item.definition.attestation.shardStart + item.definition.attestation.recordIndex);
          if (pool.count > 1 && pool.lastOrdinal !== undefined) blocked.push(pool.lastOrdinal);
          const preferred = nextOrdinal(pool, blocked);
          const candidate = preferred ?? nextOrdinal(pool, pool.count > 1 && pool.lastOrdinal !== undefined ? [pool.lastOrdinal] : []);
          const ordinal = attempt.definition.attestation.shardStart + attempt.definition.attestation.recordIndex;
          if (!candidate || candidate.ordinal !== ordinal || candidate.nextEpoch !== request.nextPool.epoch
            || candidate.nextCursor !== request.nextPool.cursor || request.nextPool.seed !== pool.seed
            || request.nextPool.selectionVersion !== pool.selectionVersion || !!request.allowActiveRepeat !== !preferred) issue('pool');
          const collisions = attempts.filter(item => item.definition.groupId === attempt.definition.groupId);
          if (collisions.length && preferred) issue('pool');
          if (attempt.role === 'frontier' && !same(attempt.binding, profile.frontier)) issue('frontier');
          if (attempt.role === 'replay' && (!attempt.binding || attempt.binding.leap > profile.highestCompletedLeap)) issue('frontier');
          const issued: IssuedRecord = { generation, id: attempt.definition.id, groupId: attempt.definition.groupId,
            catalogVersion: attempt.definition.catalogVersion, pool: pool.pool, firstAttemptId: previousIssued?.firstAttemptId ?? groupIssued?.firstAttemptId ?? attempt.id,
            issues: increment(previousIssued?.issues ?? groupIssued?.issues ?? 0) };
          byId.put(issued); byGroup.put(issued);
          context.store('pools').put({ ...request.nextPool, generation, lastId: issued.id, lastOrdinal: ordinal }, key(generation, pool.pool));
          context.store('attempts').put(attempt, key(generation, attempt.id));
          context.store('roles').put({ ...role, revision: increment(role.revision), lastIntentSeq: intent.sequence, attemptId: attempt.id }, key(generation, role.role));
          context.store('intents').put({ ...intent, outcomeAttemptId: attempt.id }, key(generation, intent.id));
          // Removing the redundant full attempt is in the same transaction as its replacement.
          if (old) context.store('attempts').delete(key(generation, old.id));
          touch(context, active); context.result(structuredClone(attempt));
        });
        }, layout);
        }, layout));
      });
    }), true);
    if (result.kind === 'corrupt') await this.quarantineIssued(request.generation, request.attempt.definition.id, request.attempt.definition.groupId);
    return result;
  }

  complete(input: WriterGuard, expectedRevision: number): Promise<StorageResult<{ attempt: Attempt; receipt: CompletionReceipt; profile: Profile }>> {
    let guard: WriterGuard;
    try { guard = captureGuard(input); integer(expectedRevision); } catch (error) { return Promise.resolve(storageFailure(error).issue); }
    const nextRunId = crypto.randomUUID();
    return transact(this.database, ['meta', 'attempts', 'roles', 'profile', 'receipts', 'receiptBuckets', 'grants'], 'readwrite', context => current(context, guard.generation, active => {
      const generation = guard.generation;
      readMany(context, [context.store('attempts').get(key(generation, guard.attemptId)),
        context.store('profile').get(generation)], values => {
        const attempt = attemptAt(values[0], generation, guard.attemptId); guardAttempt(attempt, guard);
        const profile = decodeProfile(values[1]); physicalGeneration(values[1], generation);
        historySlot(context, generation, 'receipt', guard.attemptId, receiptSlot => {
        if (receiptSlot.value !== undefined) {
          const receipt = receiptSlot.value as CompletionReceipt;
          if (attempt.status !== 'completed' || attempt.receiptId !== receipt.id || receipt.attemptId !== attempt.id) corrupt('receipt-attempt');
          context.result({ attempt, receipt, profile }); return;
        }
        if (attempt.revision !== expectedRevision) issue('revision');
        if (attempt.status !== 'pending-completion' && attempt.status !== 'playing') issue('role');
        assertCompleted(attempt);
        context.request(context.store('roles').get(key(generation, attempt.role)), value => {
          if (roleAt(value, generation, attempt.role).attemptId !== attempt.id) issue('role');
          const result = rewardForAttempt(attempt);
          const wallet = safeAdd(profile.wallet, result.dewdrops); const lifetimeEarned = safeAdd(profile.lifetimeEarned, result.dewdrops);
          const grantId = attempt.role === 'frontier' ? frontierGrantId(generation, attempt.binding!) : undefined;
          const receipt: CompletionReceipt = { schemaVersion: 1, id: attempt.id, generation, attemptId: attempt.id,
            puzzleId: attempt.definition.id, groupId: attempt.definition.groupId, definition: attempt.definition,
            role: attempt.role, scored: attempt.scored, policy: attempt.policy, result,
            ...(attempt.binding ? { binding: attempt.binding } : {}), ...(grantId ? { grantId } : {}) };
          decodeReceipt(receipt);
          const finish = () => {
            const advanced = grantId ? advanceFrontier(profile, attempt.binding!, nextRunId) : { ...profile, revision: increment(profile.revision) };
            const nextProfile: Profile = { ...advanced, wallet, lifetimeEarned };
            if (grantId) {
              if (!same(profile.frontier, attempt.binding)) issue('frontier');
              context.store('grants').add({ generation, grantId, attemptId: attempt.id }, key(generation, grantId));
            }
            const completed: Attempt = { ...attempt, revision: increment(attempt.revision), status: 'completed', receiptId: receipt.id };
            receiptSlot.put(receipt, true);
            context.store('attempts').put(completed, key(generation, attempt.id));
            context.store('profile').put({ ...nextProfile, generation }, generation);
            touch(context, active); context.result({ attempt: completed, receipt, profile: nextProfile });
          };
          if (grantId) context.request(context.store('grants').get(key(generation, grantId)), grant => { if (grant) issue('frontier'); finish(); });
          else finish();
        });
        });
      });
    }), true);
  }

  async exportBackup(): Promise<StorageResult<{ text: string; meta: GenerationMeta }>> {
    const result = await transact<{ backup: PhysicalBackup; meta: GenerationMeta }>(this.database, ESSENTIAL, 'readonly', context => {
      context.request(context.store('meta').get('current'), value => {
        const active = meta(value); const generation = active.generation;
        historyLayout(context, generation, layout => {
        const indexed = ['roles', 'attempts', 'pools', 'intents'];
        const range = generationRange(generation);
        readMany(context, [context.store('settings').get(generation), context.store('profile').get(generation),
          ...indexed.flatMap(store => [context.store(store).getAll(range), context.store(store).getAllKeys(range)]),
          ...['receipts', 'issued', 'receiptBuckets', 'issuedBuckets'].flatMap(store => [
            context.store(store).getAll(range), context.store(store).getAllKeys(range)])], values => {
          const backup = { physicalExportVersion: 2, base: { schemaVersion: 1, application: 'toadodu', preferences: values[0], profile: values[1],
            roles: values[2], attempts: values[4], pools: values[6], intents: values[8] },
            metadataKeys: { roles: values[3], attempts: values[5], pools: values[7], intents: values[9] },
            history: { generation, layout, receiptRows: values[10], receiptKeys: values[11], issuedRows: values[12], issuedKeys: values[13],
              receiptBuckets: values[14], receiptBucketKeys: values[15], issuedBuckets: values[16], issuedBucketKeys: values[17] } } as PhysicalBackup;
          context.result({ backup, meta: active });
        });
        });
      });
    });
    if (result.kind !== 'committed') return result;
    const encoded = await this.backupValidation.serialize(result.value.backup, this.verifyDefinition);
    return encoded.kind === 'committed' ? { kind: 'committed', value: { text: encoded.value, meta: result.value.meta } } : encoded;
  }

  async previewRestore(text: string): Promise<StorageResult<RestorePreview>> {
    const validated = await this.backupValidation.validate(text, this.verifyDefinition);
    if (validated.kind !== 'committed') return validated;
    const backup = validated.value;
    return transact(this.database, ['meta', 'profile'], 'readonly', context => {
      context.request(context.store('meta').get('current'), value => {
        const expected = meta(value);
        context.request(context.store('profile').get(expected.generation), value => {
          const profile = decodeProfile(value); physicalGeneration(value, expected.generation);
          context.result({ expected, backup, summary: { replaceWallet: profile.wallet, importedWallet: backup.profile.wallet,
            activeAttempts: backup.attempts.length, receipts: backup.receipts.length, issued: backup.issued.length } });
        });
      });
    });
  }

  async stageRestore(preview: RestorePreview, options: StageOptions = {}): Promise<StorageResult<RestoreStage>> {
    const validationStarted = performance.now();
    const operation = ++this.backupSequence;
    const batchSize = options.batchSize ?? 256, onProgress = options.onProgress;
    if (batchSize !== 256 && batchSize !== 1024) return { kind: 'corrupt', reason: 'stage-batch-size' };
    let expected: GenerationMeta, expectedCounts;
    try { expected = structuredClone(meta(preview.expected)); expectedCounts = captureRestoreCounts(preview.backup); } catch (error) { return storageFailure(error).issue; }
    const generation = crypto.randomUUID();
    const validated = await this.backupValidation.prepare(preview.backup, generation, this.verifyDefinition);
    if (validated.kind !== 'committed') return validated;
    const validationMs = performance.now() - validationStarted;
    if (this.closed || operation !== this.backupSequence) return { kind: 'unavailable', reason: this.closed ? 'closed' : 'abort', detail: 'restore-cancelled' };
    let prepared;
    try { prepared = validatePreparedRestore(validated.value, generation, expectedCounts); } catch (error) { return storageFailure(error).issue; }
    const rows = prepared.rows, packingMs = prepared.packingMs;
    const registered = await transact(this.database, ['meta'], 'readwrite', context => current(context, expected.generation, active => {
      if (active.essentialRevision !== expected.essentialRevision) issue('revision');
      readMany(context, [context.store('meta').get('pendingRestore'), context.store('meta').get('recovery')], pointers => {
        const previous = pointers[0] as { generation: string } | undefined;
        const recovery = pointers[1] as { generation: string } | undefined;
        const register = () => {
          if (this.closed || operation !== this.backupSequence) throw new StorageFailure({ kind: 'unavailable', reason: this.closed ? 'closed' : 'abort', detail: 'restore-cancelled' });
          context.store('meta').put({ jobVersion: 1, generation, status: 'staging', complete: false, expected } satisfies RestoreJob, key(generation, 'stage'));
          context.store('meta').put({ generation, layout: 'buckets-v1' }, key(generation, 'layout'));
          context.store('meta').put({ generation }, 'pendingRestore'); context.result(true);
        };
        if (previous && previous.generation !== active.generation && previous.generation !== recovery?.generation) {
          context.request(context.store('meta').get(key(previous.generation, 'stage')), value => {
            const old = restoreJob(value); context.store('meta').put({ ...old, status: 'abandoned' }, key(old.generation, 'stage')); register();
          });
        } else register();
      });
    }));
    if (registered.kind !== 'committed') return registered;
    this.currentStageGeneration = generation;
    void this.cleanupGenerations();
    const started = performance.now(); let maxEnqueueMs = 0, maxCommitMs = 0, transactions = 0;
    // Inactive staging never mutates the active pointer/revision. Scope only the stores being written.
    for (let start = 0; start < rows.length;) {
      if (operation !== this.backupSequence) return { kind: 'unavailable', reason: 'abort', detail: 'restore-cancelled' };
      const batch: typeof rows = []; let bytes = 0;
      while (start + batch.length < rows.length && batch.length < Math.min(batchSize, 8)) {
        const row = rows[start + batch.length], size = new TextEncoder().encode(JSON.stringify(row.value)).byteLength;
        if (batch.length && bytes + size > 2 * 1024 * 1024) break;
        bytes += size; batch.push(row);
      }
      const stores = [...new Set(['meta', ...batch.map(row => row.store)])];
      const before = performance.now();
      const result = await transact(this.database, stores, 'readwrite', context => {
        readMany(context, [context.store('meta').get('pendingRestore'), context.store('meta').get(key(generation, 'stage'))], values => {
          const pending = object(values[0]), job = restoreJob(values[1]);
          if (pending.generation !== generation || job.status !== 'staging' || operation !== this.backupSequence) issue('intent');
          const enqueueAt = performance.now();
          for (const row of batch) context.store(row.store).put(row.value, row.key);
          maxEnqueueMs = Math.max(maxEnqueueMs, performance.now() - enqueueAt); context.result(true);
        });
      });
      if (result.kind !== 'committed') return result;
      transactions++; maxCommitMs = Math.max(maxCommitMs, performance.now() - before);
      start += batch.length; onProgress?.(start, rows.length);
    }
    if (operation !== this.backupSequence) return { kind: 'unavailable', reason: 'abort', detail: 'restore-cancelled' };
    this.stageTiming = { rows: rows.length, transactions, batchSize: Math.min(batchSize, 8), maxEnqueueMs, maxCommitMs, totalMs: performance.now() - started, validationMs, packingMs };
    return transact(this.database, ['meta'], 'readwrite', context => {
      readMany(context, [context.store('meta').get('pendingRestore'), context.store('meta').get(key(generation, 'stage'))], values => {
        if (object(values[0]).generation !== generation || restoreJob(values[1]).status !== 'staging' || operation !== this.backupSequence) issue('intent');
        context.store('meta').put({ jobVersion: 1, generation, status: 'ready', complete: true, expected } satisfies RestoreJob, key(generation, 'stage'));
        context.result({ generation, expected });
      });
    }, true);
  }

  async activateRestore(input: RestoreStage): Promise<StorageResult<GenerationMeta>> {
    let stage: RestoreStage;
    try { stage = structuredClone(input); identifier(stage.generation); meta(stage.expected); } catch (error) { return Promise.resolve(storageFailure(error).issue); }
    const result = await transact<GenerationMeta>(this.database, ['meta'], 'readwrite', context => current(context, stage.expected.generation, active => {
      if (active.essentialRevision !== stage.expected.essentialRevision) issue('revision');
      readMany(context, [context.store('meta').get(key(stage.generation, 'stage')), context.store('meta').get('pendingRestore')], values => {
        if (!values[1] || object(values[1]).generation !== stage.generation) issue('intent');
        const staged = restoreJob(values[0]);
        if (staged.status !== 'ready') issue('intent');
        if (staged.complete !== true || staged.generation !== stage.generation || !same(staged.expected, stage.expected)) corrupt('incomplete-stage');
        const next: GenerationMeta = { generation: stage.generation, essentialRevision: 0 };
        context.store('meta').put(next, 'current');
        context.store('meta').put({ ...active, replacedBy: stage.generation }, key(active.generation, 'recovery'));
        context.store('meta').put(active, 'recovery'); context.store('meta').delete('pendingRestore');
        context.result(next);
      });
    }), true);
    if (result.kind === 'committed') { this.currentStageGeneration = undefined; void this.cleanupGenerations(); }
    return result;
  }

  /** Keep current, immediate recovery and one pending restore. Never prune quarantine. */
  async cleanupGenerations(): Promise<void> {
    if (this.maintenance) return this.maintenance;
    const work = async () => {
      let removed = 0;
      while (!this.closed) {
      const candidates = await transact<string[]>(this.database, ['meta'], 'readonly', context => {
        readMany(context, [context.store('meta').get('current'), context.store('meta').get('recovery'), context.store('meta').get('pendingRestore'),
          context.store('meta').getAllKeys(), context.store('meta').getAll()], values => {
          const protectedIds = new Set(values.slice(0, 3).filter(Boolean).map(value => object(value).generation));
          const keys = values[3] as IDBValidKey[], entries = values[4] as unknown[];
          const result: string[] = [];
          for (let index = 0; index < keys.length; index++) {
            const recordKey = keys[index];
            if (Array.isArray(recordKey) && recordKey[1] === 'stage') {
              const job = restoreJob(entries[index]);
              if (!protectedIds.has(job.generation) && job.status !== 'staging') result.push(job.generation);
            }
          }
          context.result(result);
        });
      });
      if (candidates.kind !== 'committed') { this.maintenanceResult = candidates; return; }
      if (!candidates.value.length) { this.maintenanceResult = { kind: 'committed', value: removed }; return; }
      for (const generation of candidates.value) {
        if (this.closed) return;
        const mark = await transact<boolean>(this.database, ['meta'], 'readwrite', context => {
          this.protectGeneration(context, generation, allowed => {
            if (!allowed) { context.result(false); return; }
            context.request(context.store('meta').get(key(generation, 'stage')), value => {
              const job = restoreJob(value); if (job.status === 'staging') { context.result(false); return; }
              context.store('meta').put({ ...job, status: 'pruning' }, key(generation, 'stage')); context.result(true);
            });
          });
        });
        if (mark.kind !== 'committed') { this.maintenanceResult = mark; return; }
        if (!mark.value) continue;
        for (const store of ESSENTIAL.filter(store => store !== 'meta')) {
          let done = false;
          while (!done && !this.closed) {
            const batch = await transact<{ done: boolean; removed: number }>(this.database, ['meta', store], 'readwrite', context => {
              this.protectGeneration(context, generation, allowed => {
                if (!allowed) { context.result({ done: true, removed: 0 }); return; }
                let count = 0;
                context.request(context.store(store).index('generation').openKeyCursor(generation), cursor => {
                  if (!cursor || count === 8) { context.result({ done: !cursor, removed: count }); return; }
                  context.store(store).delete(cursor.primaryKey); count++; cursor.continue();
                });
              });
            });
            if (batch.kind !== 'committed') { this.maintenanceResult = batch; return; }
            removed += batch.value.removed; done = batch.value.done;
          }
        }
        if (this.closed) return;
        const cleared = await transact(this.database, ['meta'], 'readwrite', context => this.protectGeneration(context, generation, allowed => {
          if (allowed) { context.store('meta').delete(key(generation, 'stage')); context.store('meta').delete(key(generation, 'recovery')); context.store('meta').delete(key(generation, 'layout')); }
          context.result(true);
        }));
        if (cleared.kind !== 'committed') { this.maintenanceResult = cleared; return; }
      }
      }
    };
    this.maintenance = work().finally(() => { this.maintenance = undefined; });
    return this.maintenance;
  }
  private protectGeneration<T>(context: TransactionContext<T>, generation: string, accept: (allowed: boolean) => void): void {
    readMany(context, [context.store('meta').get('current'), context.store('meta').get('recovery'), context.store('meta').get('pendingRestore')], values => {
      accept(!values.filter(Boolean).some(value => object(value).generation === generation));
    });
  }

  /** The caller already validates the hash; this cache never owns gameplay state. */
  readonly cache: VerifiedShardCache = {
    get: async hash => {
      const result = await transact<Uint8Array | undefined>(this.database, ['cache'], 'readonly', context => {
        context.request(context.store('cache').get(hash), value => {
          const row = value as { bytes?: unknown } | undefined;
          context.result(row?.bytes instanceof Uint8Array ? row.bytes : undefined);
        });
      });
      return result.kind === 'committed' ? result.value : undefined;
    },
    put: async (hash, bytes) => {
      if (!/^[a-f0-9]{64}$/.test(hash) || bytes.byteLength > 96 * 1024) return;
      await transact(this.database, ['cache'], 'readwrite', context => {
        context.request(context.store('cache').getAllKeys(), keys => {
          const retained = keys.filter(key => key !== hash);
          while (retained.length >= 16) context.store('cache').delete(retained.shift()!);
          context.store('cache').put({ bytes: new Uint8Array(bytes) }, hash); context.result(true);
        });
      });
    },
  };
}
