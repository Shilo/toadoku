import type { GameRepositoryPort } from '../gameplay/repository-port';
import type { AllocationRequest, Backup, CurrentSave, IssuedRecord, RepositoryOptions, WriterGuard } from './repository';
import type { Attempt, CompletionReceipt, Disclosure, Preferences, StorageResult } from '../gameplay/contracts';
import { verifyAttestedRecord } from '../catalog/attestation';
import { nextOrdinal } from '../catalog/select';
import { rewardForAttempt } from '../rewards';
import { assertCompleted } from './backup';
import { decodeAttempt, decodeDisclosure, decodeIntent, decodePool, decodePreferences, decodeProfile, increment, mergeSnapshot, ROLES, same } from './decode';
import { validateDisclosureProof } from './disclosure';
import { BackupValidationClient } from './backup-client';
import { StorageFailure, storageFailure } from './transaction';

const conflict = (reason: 'generation' | 'revision' | 'owner' | 'role' | 'pool' | 'intent'): never => { throw new StorageFailure({ kind: 'conflict', reason }); };
const invalid = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason }); };
const denied = <T>(): Promise<StorageResult<T>> => Promise.resolve({ kind: 'unavailable', reason: 'denied', detail: 'ephemeral-no-restore' });

/** Fresh Quick Play only. Applied RAM commands are never durable saves or rewarded lineages. */
export class EphemeralRepository implements GameRepositoryPort {
  readonly durability = 'ephemeral' as const;
  private state: CurrentSave;
  private closed = false;
  private issued = new Map<string, IssuedRecord>();
  private groups = new Map<string, IssuedRecord>();
  private result?: CompletionReceipt;
  private lastIntent?: { id: string; attemptId: string };
  private forbidden: Set<string>;
  private backupValidation = new BackupValidationClient();
  constructor(initial: RepositoryOptions['initial'] & { forbiddenPuzzleIds?: readonly string[] },
    private readonly verifyDefinition: RepositoryOptions['verifyDefinition'] = verifyAttestedRecord) {
    const preferences = decodePreferences(initial.preferences), profile = decodeProfile(initial.profile), pools = initial.pools.map(decodePool);
    if (profile.wallet || profile.lifetimeEarned || profile.highestCompletedLeap || profile.frontier.leap !== 1 || profile.frontier.metamorphosis !== 1
      || pools.some(pool => pool.cursor || pool.epoch || pool.lifetimeIssued) || pools.length !== 5 || new Set(pools.map(pool => pool.pool)).size !== 5) invalid('ephemeral-fresh-only');
    const generation = `ephemeral:${crypto.randomUUID()}`;
    this.state = { meta: { generation, essentialRevision: 0 }, preferences, profile, pools,
      roles: ROLES.map(role => ({ generation, role, revision: 0, lastIntentSeq: 0 })), attempts: [] };
    this.forbidden = new Set(initial.forbiddenPuzzleIds);
  }
  private async applied<T>(work: () => T | Promise<T>): Promise<StorageResult<T>> {
    if (this.closed) return { kind: 'unavailable', reason: 'closed' };
    try { return { kind: 'committed', value: structuredClone(await work()) }; } catch (error) { return storageFailure(error).issue; }
  }
  private generation(generation: string): void { if (generation !== this.state.meta.generation) conflict('generation'); }
  private guard(input: WriterGuard, revision?: number): Attempt {
    this.generation(input.generation); const attempt = this.state.attempts[0];
    if (!attempt || attempt.id !== input.attemptId) conflict('role');
    if (!same(attempt!.writer, input.writer)) conflict('owner');
    if (revision !== undefined && attempt!.revision !== revision) conflict('revision');
    return attempt!;
  }
  private replace(attempt: Attempt): Attempt {
    this.state.attempts = [attempt]; this.state.meta.essentialRevision = increment(this.state.meta.essentialRevision); return attempt;
  }
  readCurrent(): Promise<StorageResult<CurrentSave>> { return this.applied(() => this.state); }
  readIssued(generation: string, id: string, groupId: string) {
    return this.applied(() => { this.generation(generation); return { id: this.issued.get(id), group: this.groups.get(groupId) }; });
  }
  acquireWriter(generation: string, attemptId: string, token: string) {
    return this.applied(() => {
      this.generation(generation); const current = this.state.attempts[0];
      if (!current || current.id !== attemptId) conflict('role');
      const next = decodeAttempt({ ...current, revision: increment(current!.revision), writer: { token, epoch: increment(current!.writer.epoch) } });
      return this.replace(next);
    });
  }
  saveSnapshot(guard: WriterGuard, revision: number, snapshot: Attempt) {
    return this.applied(() => {
      const current = this.guard(guard, revision); const next = mergeSnapshot(current, decodeAttempt(snapshot));
      next.revision = increment(current.revision); return this.replace(next);
    });
  }
  savePreferences(generation: string, input: Preferences) {
    return this.applied(() => { this.generation(generation); this.state.preferences = decodePreferences(input);
      this.state.meta.essentialRevision = increment(this.state.meta.essentialRevision); return this.state.preferences; });
  }
  disclose(guard: WriterGuard, input: Disclosure) {
    return this.applied(() => {
      const current = this.guard(guard), disclosure = decodeDisclosure(input);
      if (current.status !== 'playing' || disclosure.attemptId !== current.id || disclosure.logicalRevision !== current.logicalRevision) conflict('revision');
      const checked = validateDisclosureProof(current, disclosure); if (checked.kind !== 'committed') throw new StorageFailure(checked);
      if (current.pendingDisclosure?.id === disclosure.id) {
        if (!same(current.pendingDisclosure, disclosure)) invalid('disclosure-id-collision'); return current;
      }
      return this.replace(decodeAttempt({ ...current, revision: increment(current.revision), pendingDisclosure: disclosure,
        assistance: { used: true, exposed: [...new Set([...current.assistance.exposed, ...disclosure.exposed])].sort((a, b) => a - b) } }));
    });
  }
  allocate(input: AllocationRequest) {
    return this.applied(async () => {
      const request = structuredClone(input), attempt = decodeAttempt(request.attempt), intent = decodeIntent(request.intent), nextPool = decodePool(request.nextPool);
      if (attempt.role !== 'quick' || intent.role !== 'quick' || attempt.scored || !attempt.id.startsWith('ephemeral:') || attempt.status !== 'playing'
        || attempt.revision || attempt.commandSeq || attempt.logicalRevision || attempt.elapsedMs || attempt.undo.length || attempt.entries.some(Boolean)
        || attempt.notes.some(Boolean) || attempt.assistance.used || attempt.assistance.exposed.length || attempt.pendingDisclosure
        || this.forbidden.has(attempt.definition.id)) invalid('ephemeral-fresh-unscored-quick-only');
      if (!await this.verifyDefinition(attempt.definition)) invalid('ephemeral-provenance');
      if (this.closed) throw new StorageFailure({ kind: 'unavailable', reason: 'closed' });
      this.generation(request.generation); this.generation(attempt.generation); this.generation(intent.generation);
      const role = this.state.roles[0], old = this.state.attempts[0];
      if (this.lastIntent?.id === intent.id) {
        if (old?.id !== this.lastIntent.attemptId) conflict('intent'); return old!;
      }
      if (intent.sequence !== role.lastIntentSeq + 1 || intent.expectedRoleRevision !== role.revision || intent.previousAttemptId !== role.attemptId) conflict('intent');
      if (old?.status === 'pending-completion' || (old?.status === 'completed' ? request.authorization !== 'continue' || intent.receiptId !== old.receiptId
        : old ? request.authorization !== 'replace' : request.authorization !== 'initial')) conflict('role');
      const pool = this.state.pools.find(pool => pool.pool === attempt.definition.pool)!;
      if (!pool || pool.revision !== request.expectedPoolRevision || nextPool.revision !== pool.revision + 1 || nextPool.count !== pool.count
        || nextPool.seed !== pool.seed || nextPool.catalogVersion !== pool.catalogVersion || nextPool.selectionVersion !== pool.selectionVersion) conflict('pool');
      const excluded = old?.definition.pool === pool.pool ? [old.definition.attestation.shardStart + old.definition.attestation.recordIndex] : [];
      if (pool.count > 1 && pool.lastOrdinal !== undefined) excluded.push(pool.lastOrdinal);
      const preferred = nextOrdinal(pool, excluded), candidate = preferred ?? nextOrdinal(pool, pool.count > 1 && pool.lastOrdinal !== undefined ? [pool.lastOrdinal] : []);
      const ordinal = attempt.definition.attestation.shardStart + attempt.definition.attestation.recordIndex;
      const prior = this.issued.get(attempt.definition.id) ?? this.groups.get(attempt.definition.groupId);
      if (!candidate || candidate.ordinal !== ordinal || nextPool.cursor !== candidate.nextCursor || nextPool.epoch !== candidate.nextEpoch
        || !!request.allowActiveRepeat !== !preferred || (prior && pool.lifetimeIssued < pool.count)
        || nextPool.lifetimeIssued !== pool.lifetimeIssued + (prior ? 0 : 1)) conflict('pool');
      const issued: IssuedRecord = { generation: request.generation, id: attempt.definition.id, groupId: attempt.definition.groupId,
        catalogVersion: attempt.definition.catalogVersion, pool: pool.pool, firstAttemptId: prior?.firstAttemptId ?? attempt.id, issues: increment(prior?.issues ?? 0) };
      this.issued.set(issued.id, issued); this.groups.set(issued.groupId, issued);
      this.state.pools = this.state.pools.map(item => item.pool === pool.pool ? { ...nextPool, lastId: issued.id, lastOrdinal: ordinal } : item);
      this.state.roles[0] = { ...role, revision: increment(role.revision), lastIntentSeq: intent.sequence, attemptId: attempt.id };
      this.lastIntent = { id: intent.id, attemptId: attempt.id }; this.result = undefined; return this.replace(attempt);
    });
  }
  complete(guard: WriterGuard, revision: number) {
    return this.applied(() => {
      const attempt = this.guard(guard);
      if (this.result?.attemptId === attempt.id) return { attempt, receipt: this.result, profile: this.state.profile };
      if (attempt.revision !== revision) conflict('revision');
      if (attempt.status !== 'playing' && attempt.status !== 'pending-completion') conflict('role');
      assertCompleted(attempt);
      const receipt: CompletionReceipt = { schemaVersion: 1, id: attempt.id, attemptId: attempt.id, generation: attempt.generation,
        role: 'quick', scored: false, puzzleId: attempt.definition.id, groupId: attempt.definition.groupId,
        definition: attempt.definition, policy: attempt.policy, result: rewardForAttempt(attempt) };
      this.result = receipt; this.state.profile.revision = increment(this.state.profile.revision);
      const completed = this.replace({ ...attempt, revision: increment(attempt.revision), status: 'completed', receiptId: receipt.id });
      return { attempt: completed, receipt, profile: this.state.profile };
    });
  }
  async exportBackup() {
    const backup: Backup = { schemaVersion: 1, application: 'toadodu', ...this.state,
      receipts: this.result ? [this.result] : [], issued: [...this.issued.values()], intents: [] };
    delete (backup as Partial<CurrentSave>).meta;
    const encoded = await this.backupValidation.serialize(backup, this.verifyDefinition);
    return encoded.kind === 'committed' ? { kind: 'committed' as const, value: { text: encoded.value, meta: structuredClone(this.state.meta) } } : encoded;
  }
  previewRestore: GameRepositoryPort['previewRestore'] = () => denied();
  stageRestore: GameRepositoryPort['stageRestore'] = () => denied();
  activateRestore: GameRepositoryPort['activateRestore'] = () => denied();
  cancelBackupWork(): void { this.backupValidation.cancel(); }
  close(): void { this.closed = true; this.backupValidation.cancel(); }
}
