import type { Attempt, StorageResult } from './contracts.ts';

export interface SavePort {
  save(snapshot: Attempt, expectedRevision: number): Promise<StorageResult<Attempt>>;
}
export interface SaveState {
  committedSeq: number;
  pending: boolean;
  failure?: Exclude<StorageResult<Attempt>, { kind: 'committed' }>;
}

/**
 * P003: one in-flight snapshot and one coalesced newest snapshot for one attempt.
 * The coordinator flushes before changing roles or crossing a disclosure barrier.
 * Acknowledgements carry durable metadata, never authority to roll back newer edits.
 */
export class AttemptSaveQueue {
  private pending?: Attempt;
  private running?: Promise<void>;
  private committed: Attempt;
  private failure?: SaveState['failure'];
  private closed = false;
  private highestEnqueuedSeq: number;
  constructor(
    initial: Attempt,
    private readonly port: SavePort,
    private readonly acknowledge: (saved: Attempt) => void,
    private readonly notify: (state: SaveState) => void,
  ) { this.committed = initial; this.highestEnqueuedSeq = initial.commandSeq; }

  get state(): SaveState {
    return { committedSeq: this.committed.commandSeq, pending: !!this.pending || !!this.running, ...(this.failure ? { failure: this.failure } : {}) };
  }

  enqueue(snapshot: Attempt): void {
    if (this.closed) throw new Error('Closed save queue');
    const old = this.committed;
    if (snapshot.id !== old.id || snapshot.generation !== old.generation ||
        snapshot.writer.token !== old.writer.token || snapshot.writer.epoch !== old.writer.epoch) {
      throw new Error('Flush and replace the queue before changing attempt or writer');
    }
    if (snapshot.commandSeq <= this.highestEnqueuedSeq) {
      throw new Error('Out-of-order local snapshot');
    }
    this.highestEnqueuedSeq = snapshot.commandSeq;
    this.pending = snapshot;
    this.publish();
    if (!this.running && !this.failure) this.start();
  }

  private publish(): void { this.notify(this.state); }

  private start(): void {
    // Start on the next microtask so running is installed before synchronous ports finish.
    this.running = Promise.resolve().then(() => this.pump()).finally(() => {
      this.running = undefined;
      this.publish();
      if (this.pending && !this.running && !this.failure && !this.closed) this.start();
    });
    this.publish();
  }

  private async pump(): Promise<void> {
    while (this.pending && !this.failure) {
      const sent = this.pending;
      this.pending = undefined;
      let result: StorageResult<Attempt>;
      try { result = await this.port.save({ ...sent, revision: this.committed.revision }, this.committed.revision); }
      catch (error) { result = { kind: 'unavailable', reason: 'abort', detail: error instanceof Error ? error.name : 'UnknownError' }; }
      if (result.kind !== 'committed') {
        this.failure = result;
        // Keep the newest unsaved state, not only the failed older in-flight snapshot.
        this.pending ??= sent;
        this.publish();
        return;
      }
      const saved = result.value;
      if (saved.id !== sent.id || saved.generation !== sent.generation ||
          saved.writer.token !== sent.writer.token || saved.writer.epoch !== sent.writer.epoch ||
          saved.commandSeq !== sent.commandSeq || saved.revision <= this.committed.revision) {
        this.failure = { kind: 'corrupt', reason: 'invalid-save-acknowledgement' };
        this.pending ??= sent;
        this.publish();
        return;
      }
      this.committed = saved;
      this.acknowledge(saved);
      this.publish();
    }
  }

  /** A failed flush never discards the pending snapshot or silently retries forever. */
  async flush(): Promise<StorageResult<Attempt>> {
    if (this.pending && !this.running && !this.failure) this.start();
    while (this.running) await this.running;
    return this.failure ?? { kind: 'committed', value: this.committed };
  }

  async retry(): Promise<StorageResult<Attempt>> {
    if (this.failure?.kind === 'conflict' || this.failure?.kind === 'corrupt' || this.failure?.kind === 'unsupported-future') return this.failure;
    this.failure = undefined;
    return this.flush();
  }

  /** Only after successful flush. Failed local state remains exportable by the coordinator. */
  close(): void {
    if (this.pending || this.running) throw new Error('Cannot close a dirty save queue');
    this.closed = true;
  }
}
