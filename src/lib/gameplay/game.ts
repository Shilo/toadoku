import type { AllocationIntent, Attempt, Band, CompletionReceipt, Disclosure, HintPayload, Preferences, Role, StorageResult } from './contracts.ts';
import type { CatalogManifest, PoolId } from '../catalog/types.ts';
import type { CurrentSave, RestorePreview, WriterGuard } from '../storage/repository.ts';
import type { GameRepositoryPort } from './repository-port.ts';
import type { HintInput, HintResult } from '../hints/index.ts';
import { CatalogLoader } from '../catalog/load.ts';
import { nextOrdinal, nextPool, uniformBelow } from '../catalog/select.ts';
import { bandForPool, policyForBand, poolForLeap } from '../modes/index.ts';
import { createActivePlayClock, getValues, reduceAttempt } from '../session/index.ts';
import type { ActivePlayClock, SessionCommand, SessionResult } from '../session/index.ts';
import { isComplete } from '../sudoku/index.ts';
import { AttemptSaveQueue } from './controller.ts';

export interface HintComputer { compute(input: HintInput): Promise<HintResult>; cancel(): void }
export interface GameState {
  save?: CurrentSave;
  attempt?: Attempt;
  receipt?: CompletionReceipt;
  hint?: HintPayload;
  owned: boolean;
  canStudy: boolean;
  busy: boolean;
  hintComputing: boolean;
  saveState: 'saved' | 'pending' | 'unsaved';
  problem?: string;
  /** An event counter, incremented only for a newly committed completion. */
  completionEvent: number;
  durability?: 'durable' | 'ephemeral';
  restorePhase?: 'staging' | 'activating';
  conflictedChanges?: boolean;
}
export interface StartRequest {
  role: Role;
  band?: Band;
  leap?: number;
  authorization: 'initial' | 'replace' | 'continue';
  /** Identity of the role the player explicitly chose to continue or replace. */
  expectedCurrent?: { generation: string; attemptId?: string };
}

/** P003: application-lifetime authority. Presentation sends commands, never wallet writes. */
export class GameController {
  private value: GameState = { owned: false, canStudy: false, busy: false, hintComputing: false, saveState: 'saved', completionEvent: 0 };
  private listeners = new Set<(state: GameState) => void>();
  private queue?: AttemptSaveQueue;
  private clock?: ActivePlayClock;
  private view = { board: false, concealed: false, visible: true };
  private intent?: { request: StartRequest; intent: AllocationIntent };
  private hintSequence = 0;
  private authoritySequence = 0;
  private allocationSequence = 0;
  private backupSequence = 0;
  private allocationAbort?: AbortController;
  private destroyed = false;
  private readonly writerToken: string;
  constructor(
    readonly repository: GameRepositoryPort,
    readonly catalog: CatalogLoader,
    private readonly hints: HintComputer,
    private readonly now: () => number = () => performance.now(),
    private readonly uuid: () => string = () => crypto.randomUUID(),
    private readonly random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0],
  ) { this.writerToken = uuid(); this.value.durability = repository.durability ?? 'durable'; }

  get state(): GameState { return this.value; }
  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener); listener(this.value);
    return () => this.listeners.delete(listener);
  }
  private publish(): void {
    this.value = { ...this.value };
    for (const listener of this.listeners) listener(this.value);
  }
  private problem(result: { kind: string; reason?: string }, authority = true): void {
    this.value.problem = `${result.kind}:${result.reason ?? ''}`;
    if (authority && (result.kind === 'conflict' || result.kind === 'corrupt' || result.kind === 'unsupported-future')) {
      this.value.owned = false; this.syncClock();
    }
    this.publish();
  }
  private guard(attempt = this.value.attempt!): WriterGuard {
    return { generation: attempt.generation, attemptId: attempt.id, writer: attempt.writer };
  }
  private syncClock(): void {
    const attempt = this.value.attempt;
    const readable = !!attempt && this.value.owned && this.view.board && this.view.visible && !this.view.concealed && !this.value.restorePhase;
    this.value.canStudy = readable;
    this.clock?.setActive(readable && attempt?.status === 'playing');
  }
  /** Visibility and concealment change synchronously, before presentation reveals any values. */
  setView(view: Partial<typeof this.view>): void {
    this.view = { ...this.view, ...view };
    this.syncClock(); this.checkpoint(); this.publish();
  }

  async initialize(): Promise<boolean> {
    const result = await this.repository.readCurrent();
    if (result.kind !== 'committed') { this.problem(result); return false; }
    this.value.save = result.value; this.value.problem = undefined; this.publish(); return true;
  }
  private attach(attempt: Attempt, recoverSolved = false): void {
    const persisted = attempt;
    if (recoverSolved) attempt = { ...attempt, status: 'pending-completion', commandSeq: attempt.commandSeq + 1 };
    this.authoritySequence++;
    const carriedTime = this.value.attempt?.id === attempt.id && attempt.status === 'playing'
      ? this.clock?.sample() ?? attempt.elapsedMs : attempt.elapsedMs;
    this.clock?.dispose(); this.cancelHint();
    this.value.attempt = attempt; this.value.owned = true;
    this.value.conflictedChanges = false;
    this.value.receipt = undefined;
    this.value.hint = attempt.status === 'playing' && attempt.pendingDisclosure?.logicalRevision === attempt.logicalRevision
      ? attempt.pendingDisclosure.payload : undefined;
    this.value.problem = undefined;
    this.value.saveState = this.repository.durability === 'ephemeral' ? 'unsaved' : 'saved';
    this.clock = createActivePlayClock(Math.max(attempt.elapsedMs, carriedTime), this.now);
    this.queue = new AttemptSaveQueue(persisted, {
      save: (snapshot, revision) => this.repository.saveSnapshot(this.guard(snapshot), revision, snapshot),
    }, saved => {
      const latest = this.value.attempt;
      if (latest?.id !== saved.id) return;
      this.value.attempt = { ...latest, revision: saved.revision,
        elapsedMs: Math.max(latest.elapsedMs, saved.elapsedMs),
        assistance: { used: latest.assistance.used || saved.assistance.used,
          exposed: [...new Set([...latest.assistance.exposed, ...saved.assistance.exposed])].sort((a,b) => a-b) } };
    }, state => {
      this.value.conflictedChanges = state.failure?.kind === 'conflict';
      this.value.saveState = state.failure || this.repository.durability === 'ephemeral' ? 'unsaved' : state.pending ? 'pending' : 'saved';
      if (state.failure) this.problem(state.failure);
      else this.publish();
    });
    this.syncClock();
    // A recovered full playing snapshot must be frozen before any observer sees it.
    if (recoverSolved) this.queue.enqueue(attempt);
    this.checkpoint(true); this.publish();
  }
  private async barrier(work: () => Promise<boolean>, allowConflictedFlush = false): Promise<boolean> {
    if (this.value.busy || this.destroyed) return false;
    this.value.busy = true; this.publish();
    try {
      this.checkpoint(true);
      const flushed = await this.queue?.flush();
      if (flushed && flushed.kind !== 'committed' && !(allowConflictedFlush && flushed.kind === 'conflict')) { this.problem(flushed); return false; }
      return await work();
    } finally { this.value.busy = false; this.checkpoint(); this.publish(); }
  }
  cancelStart(): void { this.allocationSequence++; this.allocationAbort?.abort(); }
  cancelHint(): void { this.hintSequence++; this.hints.cancel(); this.value.hintComputing = false; }
  async resume(role: Role): Promise<boolean> {
    return this.resumeRole(role);
  }
  /** Explicitly opening the saved puzzle discards only this tab's conflicted local commands. */
  async resumeSaved(role: Role): Promise<boolean> {
    if (this.queue?.state.failure?.kind !== 'conflict') return false;
    return this.resumeRole(role, true);
  }
  private async resumeRole(role: Role, allowConflictedFlush = false): Promise<boolean> {
    return this.barrier(async () => {
      if (!await this.initialize()) return false;
      const attempt = this.value.save!.attempts.find(item => item.role === role);
      if (!attempt) return false;
      const owned = await this.repository.acquireWriter(attempt.generation, attempt.id, this.writerToken);
      if (owned.kind !== 'committed') { this.problem(owned); return false; }
      const recovered = owned.value.status === 'playing' && this.solved(owned.value);
      if (recovered && owned.value.commandSeq === Number.MAX_SAFE_INTEGER) {
        this.problem({ kind: 'corrupt', reason: 'exhausted-command-sequence' }); return false;
      }
      this.attach(owned.value, recovered);
      if (recovered) {
        const saved = await this.queue!.flush();
        if (saved.kind !== 'committed') { this.problem(saved); return false; }
      }
      if (recovered || owned.value.status === 'completed' || owned.value.status === 'pending-completion') return this.commitCompletion(false);
      return true;
    }, allowConflictedFlush);
  }
  async start(input: StartRequest): Promise<boolean> {
    if (this.value.busy) return false;
    // Capture the decision before any flush/read can refresh the displayed role or caller DTO.
    const request: StartRequest = { role: input.role, band: input.band, leap: input.leap, authorization: input.authorization,
      ...(input.expectedCurrent ? { expectedCurrent: { generation: input.expectedCurrent.generation, attemptId: input.expectedCurrent.attemptId } } : {}) };
    const observedSave = this.value.save, observedRole = observedSave?.roles.find(item => item.role === request.role);
    const observed = observedSave && observedRole ? { generation: observedSave.meta.generation, attemptId: observedRole.attemptId, revision: observedRole.revision } : undefined;
    const shown = request.authorization === 'continue' && this.value.attempt?.role === request.role ? this.value.attempt : undefined;
    const expected = request.expectedCurrent ?? (shown ? { generation: shown.generation, attemptId: shown.id } : observed);
    if (!observed && request.authorization !== 'initial') { this.problem({ kind: 'conflict', reason: 'role' }); return false; }
    if (this.repository.durability === 'ephemeral' && request.role !== 'quick') { this.problem({kind:'unavailable',reason:'unscored-quick-only'},false); return false; }
    const allocation = ++this.allocationSequence;
    this.allocationAbort?.abort();
    const abort = this.allocationAbort = new AbortController();
    const current = () => allocation === this.allocationSequence && !abort.signal.aborted && !this.destroyed;
    return this.barrier(async () => {
      if (!await this.initialize()) return false;
      if (!current()) return false;
      const save = this.value.save!, role = save.roles.find(item => item.role === request.role)!;
      if (observed && (save.meta.generation !== observed.generation || role.attemptId !== observed.attemptId || role.revision !== observed.revision) ||
        expected && (save.meta.generation !== expected.generation || role.attemptId !== expected.attemptId)) {
        this.problem({ kind: 'conflict', reason: 'role' }); return false;
      }
      const old = save.attempts.find(item => item.id === role.attemptId);
      const sameIntent = this.intent && JSON.stringify(this.intent.request) === JSON.stringify(request) &&
        this.intent.intent.generation === save.meta.generation && this.intent.intent.expectedRoleRevision === role.revision;
      if (!sameIntent) this.intent = { request, intent: { id: this.uuid(), generation: save.meta.generation, role: request.role,
        sequence: role.lastIntentSeq + 1, expectedRoleRevision: role.revision,
        ...(role.attemptId ? { previousAttemptId: role.attemptId } : {}), ...(old?.receiptId ? { receiptId: old.receiptId } : {}) } };
      const initialized = await this.catalog.initialize();
      if (!current()) return false;
      if (initialized.kind !== 'ready') { this.problem(initialized, false); return false; }
      const manifest: CatalogManifest = initialized.value;
      if (save.pools.some(pool => pool.catalogVersion !== manifest.catalogVersion || pool.count !== manifest.pools[pool.pool].count)) {
        this.problem({ kind: 'unsupported-future', reason: 'catalog-migration' }); return false;
      }
      const eligible: PoolId[] = request.role === 'quick'
        ? request.band === 'easy' ? ['easy'] : request.band === 'medium' ? ['medium-low','medium-high'] : request.band === 'hard' ? ['hard-low','hard-high'] : []
        : [poolForLeap(request.role === 'frontier' ? save.profile.frontier.leap : request.leap!)];
      if (!eligible.length) { this.problem({ kind: 'corrupt', reason: 'difficulty' }); return false; }
      const poolId = nextPool(eligible, save.pools, this.random), pool = save.pools.find(item => item.pool === poolId)!;
      const excluded = save.attempts.filter(item => item.definition.pool === poolId && item.definition.catalogVersion === pool.catalogVersion)
        .map(item => item.definition.attestation.shardStart + item.definition.attestation.recordIndex);
      const previous = pool.count > 1 && pool.lastOrdinal !== undefined ? [pool.lastOrdinal] : [];
      excluded.push(...previous);
      let ordinal = nextOrdinal(pool, excluded), allowActiveRepeat = false;
      if (!ordinal) { ordinal = nextOrdinal(pool, previous); allowActiveRepeat = true; }
      if (!ordinal) { this.problem({ kind: 'exhausted', reason: 'pool' }); return false; }
      const record = await this.catalog.getRecord(poolId, ordinal.ordinal, abort.signal);
      if (!current()) return false;
      if (record.kind !== 'ready') { this.problem(record, false); return false; }
      const issued = await this.repository.readIssued(save.meta.generation, record.value.id, record.value.groupId);
      if (!current()) return false;
      if (issued.kind !== 'committed') { this.problem(issued); return false; }
      const first = !issued.value.id && !issued.value.group;
      const attempt: Attempt = {
        schemaVersion: 1, id: `${this.repository.durability === 'ephemeral' ? 'ephemeral:' : ''}${this.uuid()}`, generation: save.meta.generation, role: request.role, revision: 0, commandSeq: 0, logicalRevision: 0,
        writer: { token: this.writerToken, epoch: 1 }, definition: record.value, policy: policyForBand(bandForPool(poolId)),
        ...(request.role === 'quick' ? {} : { binding: request.role === 'frontier' ? save.profile.frontier : { ...save.profile.frontier, leap: request.leap! } }),
        entries: Array(81).fill(0), notes: Array(81).fill(0), selection: 0, notesMode: false, undo: [], elapsedMs: 0,
        assistance: { used: false, exposed: [] }, status: 'playing', scored: this.repository.durability !== 'ephemeral',
      };
      const allocated = await this.repository.allocate({ generation: save.meta.generation, intent: this.intent!.intent, attempt,
        authorization: request.authorization, expectedPoolRevision: pool.revision, allowActiveRepeat,
        nextPool: { ...pool, revision: pool.revision + 1, epoch: ordinal.nextEpoch, cursor: ordinal.nextCursor,
          lifetimeIssued: pool.lifetimeIssued + (first ? 1 : 0), lastId: record.value.id, lastOrdinal: ordinal.ordinal } });
      if (allocated.kind !== 'committed') { this.problem(allocated); return false; }
      if (!current()) {
        // The transaction may already have committed. The old role snapshot is now obsolete.
        this.value.owned = false; this.syncClock(); this.queue = undefined;
        await this.initialize(); this.publish(); return false;
      }
      this.intent = undefined; this.attach(allocated.value);
      await this.initialize(); return true;
    });
  }
  command(command: SessionCommand): SessionResult {
    if (!this.value.attempt || !this.value.owned || this.value.busy || !this.value.canStudy) return { kind: 'rejected', reason: 'frozen' };
    const previous = this.value.attempt;
    const result = reduceAttempt(previous, command);
    if (result.kind === 'changed') {
      const completed = result.attempt.status === 'playing' && this.solved(result.attempt);
      // Recognition is part of the final command, before queue callbacks or observers.
      // Storage latency is not thinking time and a failed save must never unfreeze it.
      if (completed) result.attempt = { ...result.attempt, status: 'pending-completion',
        elapsedMs: Math.max(result.attempt.elapsedMs, this.clock?.sample() ?? result.attempt.elapsedMs) };
      this.value.attempt = result.attempt;
      if ((command.type === 'select' || result.attempt.logicalRevision !== previous.logicalRevision) && this.value.problem?.startsWith('hint-unavailable:')) this.value.problem = undefined;
      if (result.attempt.logicalRevision !== previous.logicalRevision) { this.cancelHint(); this.value.hint = undefined; }
      if (completed) { this.cancelHint(); this.value.hint = undefined; this.syncClock(); }
      this.queue!.enqueue(result.attempt); this.publish();
      if (completed) void this.finish();
    }
    return result;
  }
  private solved(attempt: Attempt): boolean {
    return isComplete(getValues(attempt), [...attempt.definition.givens].map(Number));
  }
  checkpoint(force = false): void {
    const attempt = this.value.attempt;
    if (!attempt || !this.value.owned || attempt.status !== 'playing' || !this.clock || this.value.busy && !force) return;
    const result = reduceAttempt(attempt, { type: 'checkpoint', elapsedMs: this.clock.sample() });
    if (result.kind === 'changed') { this.value.attempt = result.attempt; this.queue!.enqueue(result.attempt); }
  }
  private async finish(): Promise<boolean> {
    return this.barrier(() => this.commitCompletion(true));
  }
  private async commitCompletion(announce: boolean): Promise<boolean> {
    const attempt = this.value.attempt!;
    const result = await this.repository.complete(this.guard(attempt), attempt.revision);
    if (result.kind !== 'committed') { this.problem(result); return false; }
    const save = this.value.save, completed = result.value.attempt;
    if (!save || save.meta.generation !== completed.generation || completed.id !== attempt.id ||
      !save.attempts.some(item => item.id === completed.id && item.generation === completed.generation && item.role === completed.role)) {
      this.problem({ kind: 'conflict', reason: 'role' }); await this.initialize(); return false;
    }
    // Publish the committed role status and wallet together; selectors also use this snapshot.
    this.value.save = { ...save, profile: result.value.profile,
      attempts: save.attempts.map(item => item.id === completed.id && item.generation === completed.generation ? completed : item) };
    this.attach(result.value.attempt); this.value.receipt = result.value.receipt;
    if (announce) this.value.completionEvent++;
    this.publish(); return true;
  }
  async retry(): Promise<boolean> {
    if (this.value.busy) return false;
    const result = await this.queue?.retry();
    if (result && result.kind !== 'committed') { this.problem(result); return false; }
    this.value.problem = undefined;
    if (this.value.attempt?.status === 'pending-completion') return this.barrier(() => this.commitCompletion(true));
    this.publish(); return true;
  }
  async restart(): Promise<boolean> {
    const initial = this.value.attempt;
    if (!initial || initial.status !== 'playing' || !this.value.owned) return false;
    return this.barrier(async () => {
      const current = this.value.attempt;
      if (!current || current.id !== initial.id || current.status !== 'playing' || !this.value.owned) return false;
      const result = reduceAttempt(current, { type: 'restart' });
      if (result.kind === 'noop') return true;
      if (result.kind !== 'changed') return false;
      if (result.attempt.logicalRevision !== current.logicalRevision) { this.cancelHint(); this.value.hint = undefined; }
      this.value.attempt = result.attempt; this.queue!.enqueue(result.attempt); this.publish();
      const saved = await this.queue!.flush();
      if (saved.kind !== 'committed') { this.problem(saved); return false; }
      return true;
    });
  }
  async requestHint(choice: 'logical' | 'reveal'): Promise<boolean> {
    const frozen = this.value.attempt;
    if (!frozen || frozen.status !== 'playing' || !this.value.owned || this.value.busy || this.value.hintComputing) return false;
    const request = ++this.hintSequence;
    this.value.hintComputing = true; this.value.problem = undefined; this.publish();
    let computed: HintResult;
    try { computed = choice === 'reveal'
      ? (frozen.definition.givens[frozen.selection] === '0' && !frozen.entries[frozen.selection]
        ? { kind: 'ready' as const, payload: { kind: 'reveal' as const, logicalRevision: frozen.logicalRevision, cell: frozen.selection, digit: Number(frozen.definition.solution[frozen.selection]) } }
        : { kind: 'unavailable' as const, reason: 'no-target' as const })
      : await this.hints.compute({ values: getValues(frozen), givens: [...frozen.definition.givens].map(Number), logicalRevision: frozen.logicalRevision, target: frozen.selection });
    } catch { computed = { kind: 'unavailable', reason: 'invalid' }; }
    finally { if (request === this.hintSequence) this.value.hintComputing = false; }
    const latest = this.value.attempt;
    if (request !== this.hintSequence || !latest || latest.id !== frozen.id || latest.definition.id !== frozen.definition.id || latest.logicalRevision !== frozen.logicalRevision ||
        latest.generation !== frozen.generation || latest.writer.epoch !== frozen.writer.epoch || !this.value.owned) { this.publish(); return false; }
    if (computed.kind !== 'ready') { this.problem({ kind: 'hint-unavailable', reason: computed.reason }, false); return false; }
    if (choice === 'logical' && computed.payload.kind === 'reveal') {
      this.problem({ kind: 'hint-unavailable', reason: 'reveal-choice' }, false); return false;
    }
    return this.barrier(async () => {
      const current = this.value.attempt!;
      if (request !== this.hintSequence || current.logicalRevision !== frozen.logicalRevision || current.id !== frozen.id) return false;
      const payload = computed.payload;
      const exposed = payload.kind === 'reveal' ? [payload.cell] : payload.kind === 'deduction' ? payload.placements.map(item => item.cell) : [];
      const disclosure: Disclosure = { id: this.uuid(), attemptId: current.id, logicalRevision: current.logicalRevision, payload, exposed, information: true };
      const recorded = await this.repository.disclose(this.guard(current), disclosure);
      if (recorded.kind !== 'committed') { this.problem(recorded); return false; }
      // The payload becomes visible only after the complete-event acknowledgement.
      this.attach(recorded.value); this.value.hint = payload; this.publish(); return true;
    });
  }
  async preferences(preferences: Preferences): Promise<boolean> {
    const save = this.value.save;
    if (!save) return false;
    const result = await this.repository.savePreferences(save.meta.generation, preferences);
    if (result.kind !== 'committed') { this.problem(result); return false; }
    if (this.value.save?.meta.generation !== save.meta.generation) {
      this.value.owned = false; this.syncClock(); await this.initialize(); return false;
    }
    this.value.save = { ...this.value.save, preferences: result.value }; this.publish(); return true;
  }
  /** Read-only check: returning from a concealed pane never silently takes another tab's writer. */
  async checkAuthority(): Promise<boolean> {
    const frozen = this.value.attempt;
    if (!frozen) return false;
    const request = ++this.authoritySequence;
    const result = await this.repository.readCurrent();
    const current = this.value.attempt;
    if (request !== this.authoritySequence || current?.id !== frozen.id || current.generation !== frozen.generation ||
        current.writer.epoch !== frozen.writer.epoch || current.writer.token !== frozen.writer.token) return false;
    if (result.kind !== 'committed') { this.problem(result); return false; }
    const durable = result.value.attempts.find(attempt => attempt.id === frozen.id && attempt.role === frozen.role);
    if (result.value.meta.generation !== frozen.generation || !durable || durable.writer.epoch !== frozen.writer.epoch || durable.writer.token !== frozen.writer.token) {
      this.problem({ kind: 'conflict', reason: 'owner' }); return false;
    }
    this.value.save = result.value; this.syncClock(); this.publish(); return this.value.owned;
  }
  async flush(): Promise<StorageResult<Attempt | undefined>> {
    this.checkpoint();
    return await this.queue?.flush() ?? { kind: 'committed', value: undefined };
  }
  async exportBackup() {
    const request = ++this.backupSequence;
    const flushed = await this.flush();
    if (request !== this.backupSequence) return { kind: 'unavailable' as const, reason: 'abort' as const, detail: 'backup-cancelled' };
    if (flushed.kind !== 'committed') { this.problem(flushed); return flushed; }
    const result = await this.repository.exportBackup();
    return request === this.backupSequence ? result : { kind: 'unavailable' as const, reason: 'abort' as const, detail: 'backup-cancelled' };
  }
  /** Emergency recovery is deliberately distinct from an importable, validated backup. */
  exportRecovery(): { text: string } {
    const attempt = this.value.attempt;
    const save = this.value.save;
    const artifact = {
      application: 'toadodu', kind: 'toadodu-emergency-recovery', schemaVersion: 1,
      createdAt: new Date().toISOString(), durability: this.value.durability,
      saveState: this.value.saveState, problem: this.value.problem,
      importableBackup: false, durableReadback: 'not-requested',
      localAttempt: attempt ? { ...attempt, elapsedMs: Math.max(attempt.elapsedMs, this.clock?.sample() ?? attempt.elapsedMs) } : undefined,
      lastKnownSave: save ? { meta: save.meta, preferences: save.preferences, profile: save.profile, roles: save.roles } : undefined,
      omitted: [] as string[],
    };
    let text = JSON.stringify(artifact);
    const limit = 2 * 1024 * 1024;
    if (new TextEncoder().encode(text).byteLength > limit && artifact.localAttempt) {
      artifact.localAttempt = { ...artifact.localAttempt, undo: [] };
      artifact.omitted.push('localAttempt.undo'); text = JSON.stringify(artifact);
    }
    if (new TextEncoder().encode(text).byteLength > limit) throw new Error('Recovery artifact exceeds its bounded format');
    return { text };
  }
  async previewRestore(text: string) {
    const request = ++this.backupSequence;
    const flushed = await this.flush();
    if (request !== this.backupSequence) return { kind: 'unavailable' as const, reason: 'abort' as const, detail: 'backup-cancelled' };
    if (flushed.kind !== 'committed') { this.problem(flushed); return flushed; }
    const result = await this.repository.previewRestore(text);
    return request === this.backupSequence ? result : { kind: 'unavailable' as const, reason: 'abort' as const, detail: 'backup-cancelled' };
  }
  cancelBackupWork(): void {
    if (this.value.restorePhase === 'activating') return;
    this.backupSequence++; this.repository.cancelBackupWork?.();
  }
  async restore(preview: RestorePreview): Promise<boolean> {
    if (this.value.busy || this.destroyed) return false;
    const request = ++this.backupSequence;
    return this.barrier(async () => {
      if (request !== this.backupSequence) return false;
      this.value.restorePhase = 'staging'; this.syncClock(); this.publish();
      try {
        const stage = await this.repository.stageRestore(preview);
        if (request !== this.backupSequence) return false;
        if (stage.kind !== 'committed') { this.problem(stage); return false; }
        this.value.restorePhase = 'activating'; this.syncClock(); this.publish();
        const activated = await this.repository.activateRestore(stage.value);
        if (activated.kind !== 'committed') { this.problem(activated); return false; }
        this.cancelHint(); this.cancelStart(); this.authoritySequence++;
        this.clock?.dispose(); this.clock = undefined; this.queue = undefined;
        this.value.attempt = undefined; this.value.receipt = undefined; this.value.hint = undefined;
        this.value.owned = false; this.syncClock();
        return await this.initialize();
      } finally { this.value.restorePhase = undefined; this.syncClock(); this.publish(); }
    });
  }
  async dispose(): Promise<void> {
    this.setView({ board: false }); this.destroyed = true; this.cancelHint(); this.cancelStart(); this.cancelBackupWork();
    await this.queue?.flush(); this.clock?.dispose(); this.catalog.dispose(); this.repository.close(); this.listeners.clear();
  }
}
