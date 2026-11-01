import { decodeManifest, sha256 } from '../catalog/decode';
import { manifestMembership } from '../catalog/attestation';
import { MANIFEST_V1_SHA256 } from '../catalog/manifest.v1';
import { POOLS } from '../catalog/types';
import type { CatalogManifest, PoolId } from '../catalog/types';
import type { CatalogLoader, BackgroundAllowance } from '../catalog/load';
import type { GameRepositoryPort } from '../gameplay/repository-port';
import type { CurrentSave } from '../storage/repository';
import { coveragePlans, exclusions, packBudget, packTarget, recordKey, saveFingerprint } from './plan';
import type { PackKind } from './plan';
import { openOfflineStore } from './store';
import type { OfflineStore } from './types';
import { verifyRetained } from './verify';
export type { PackKind } from './plan';

type RepositoryReader = Pick<GameRepositoryPort, 'readCurrent'>;
export interface OfflineState {
  phase: 'idle' | 'checking' | 'preparing' | 'partial' | 'ready' | 'failed' | 'cancelled';
  counts: Record<PoolId, number>;
  completed: number;
  total: number;
  downloadedBytes: number;
  plannedBytes: number;
  storedBytes: number;
  savedGame: boolean;
  problem?: string;
}
export interface OfflineEstimate { bytes: number; cap: number; target: number; records: number }
interface Job { pool: PoolId; ordinal: number; path: string; bytes: number }
interface PreparedPlan extends OfflineEstimate { manifest: CatalogManifest; jobs: Job[]; keys: string[]; fingerprint: string; metadataMissing: boolean }
const emptyCounts = () => Object.fromEntries(POOLS.map(pool => [pool, 0])) as Record<PoolId, number>;
const yieldInput = () => new Promise<void>(resolve => setTimeout(resolve, 0));

export class OfflineSupport {
  private value: OfflineState = { phase: 'idle', counts: emptyCounts(), completed: 0, total: 0, downloadedBytes: 0, plannedBytes: 0, storedBytes: 0, savedGame: false };
  private listeners = new Set<(state: OfflineState) => void>();
  private operation = 0;
  private abort?: AbortController;
  private inspecting?: Promise<OfflineState>;
  private disposed = false;
  private preparing?: Promise<void>;
  private channel?: BroadcastChannel;
  constructor(private readonly repository: RepositoryReader, private readonly catalog: CatalogLoader, private readonly store: OfflineStore) {
    catalog.setOfflineCache(store);
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('toadoku:offline:1:' + catalog.base.href);
        this.channel.onmessage = event => { if (event.data === 'cleared') { this.cancel(); void this.inspect(); } };
      } catch { /* Focus/open reconciliation remains available. */ }
    }
  }
  get state(): OfflineState { return this.value; }
  subscribe(listener: (state: OfflineState) => void): () => void {
    this.listeners.add(listener); listener(this.value); return () => this.listeners.delete(listener);
  }
  private publish(patch: Partial<OfflineState>) {
    if (this.disposed) return;
    this.value = { ...this.value, ...patch };
    for (const listener of this.listeners) listener(this.value);
  }
  private async current(): Promise<CurrentSave> {
    const result = await this.repository.readCurrent();
    if (result.kind !== 'committed') throw new Error('offline-save-unavailable');
    return result.value;
  }
  private async trustedManifest(): Promise<CatalogManifest | undefined> {
    const bytes = await this.store.getManifest();
    if (!bytes || bytes.byteLength > 128 * 1024 || await sha256(bytes) !== MANIFEST_V1_SHA256) return;
    try {
      const manifest = decodeManifest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
      return await manifestMembership(manifest) ? manifest : undefined;
    } catch { return undefined; }
  }
  private async retained(pool: PoolId, ordinal: number, manifest: CatalogManifest): Promise<boolean> {
    const record = await this.store.getRecord(pool, ordinal);
    return !!record && await verifyRetained(record, manifest, pool, ordinal);
  }
  inspect(): Promise<OfflineState> {
    if (this.inspecting) return this.inspecting;
    this.inspecting = this.inspectNow().finally(() => { this.inspecting = undefined; });
    return this.inspecting;
  }
  private async inspectNow(): Promise<OfflineState> {
    try {
      const save = await this.current(), fingerprint = saveFingerprint(save);
      const inventory = await this.store.inventory(), manifest = await this.trustedManifest();
      const counts = emptyCounts();
      if (manifest) for (const pool of POOLS) {
        const state = save.pools.find(item => item.pool === pool);
        if (!state || state.catalogVersion !== manifest.catalogVersion || state.count !== manifest.pools[pool].count) continue;
        const plans = coveragePlans(state, exclusions(save, state));
        const verified = new Set<number>();
        for (const ordinal of plans.at(-1)!) {
          if (await this.retained(pool, ordinal, manifest)) verified.add(ordinal);
          await yieldInput();
        }
        for (let index = 0; index < plans.length; index++) {
          if (!plans[index].every(ordinal => verified.has(ordinal))) break;
          counts[pool] = index + 1;
        }
      }
      const latest = await this.current();
      const latestInventory = await this.store.inventory();
      if (fingerprint !== saveFingerprint(latest) || inventory.revision !== latestInventory.revision) {
        this.publish({ counts: emptyCounts(), savedGame: latest.attempts.length > 0, storedBytes: inventory.bytes, problem: 'offline-state-changed' });
      } else {
        const ready = POOLS.every(pool => counts[pool] >= 3);
        const preserve = this.value.phase === 'preparing' || this.value.phase === 'cancelled' || this.value.phase === 'failed';
        this.publish({ counts, savedGame: save.attempts.length > 0, storedBytes: inventory.bytes,
          ...(!preserve ? { phase: ready ? 'ready' : inventory.keys.length ? 'partial' : 'idle' } : {}) });
      }
    } catch (error) { this.publish({ counts: emptyCounts(), phase: 'failed', problem: String(error) }); }
    return this.value;
  }
  private async plan(kind: PackKind, signal?: AbortSignal): Promise<PreparedPlan> {
    const metadataMissing = !await this.trustedManifest();
    const result = await this.catalog.initialize();
    if (result.kind !== 'ready') throw new Error('offline-catalog-' + result.kind);
    // initialize can predate attachment; setOfflineCache persists its trusted bytes.
    if (!await this.catalog.ensureOfflineManifest() || !await this.trustedManifest()) throw new Error('offline-manifest-write');
    const save = await this.current(), target = packTarget(kind), jobs: Job[] = [], keys: string[] = [];
    const paths = new Map<string, number>();
    for (const pool of POOLS) {
      const state = save.pools.find(item => item.pool === pool);
      if (!state || state.count !== result.value.pools[pool].count || state.catalogVersion !== result.value.catalogVersion) throw new Error('offline-catalog-migration');
      for (const ordinal of coveragePlans(state, exclusions(save, state), target).at(-1)!) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const key = recordKey(pool, ordinal); keys.push(key);
        if (await this.retained(pool, ordinal, result.value)) continue;
        const shard = result.value.pools[pool].shards.find(item => ordinal >= item.start && ordinal < item.start + item.count)!;
        jobs.push({ pool, ordinal, path: shard.path, bytes: shard.bytes }); paths.set(shard.path, shard.bytes);
        await yieldInput();
      }
    }
    jobs.sort((a, b) => a.path.localeCompare(b.path) || a.ordinal - b.ordinal);
    return { manifest: result.value, bytes: [...paths.values()].reduce((sum, bytes) => sum + bytes, 0) + (metadataMissing ? 128 * 1024 : 0),
      cap: packBudget(kind), target, records: jobs.length, jobs, keys, fingerprint: saveFingerprint(save), metadataMissing };
  }
  async estimate(kind: PackKind): Promise<OfflineEstimate> {
    const plan = await this.plan(kind);
    return { bytes: plan.bytes, cap: plan.cap, target: plan.target, records: plan.records };
  }
  async prepare(kind: PackKind): Promise<void> {
    if (this.preparing) { await this.preparing; return this.prepare(kind); }
    if (this.disposed) return;
    const work = this.prepareNow(kind); this.preparing = work;
    try { await work; } finally { if (this.preparing === work) this.preparing = undefined; }
  }
  private async prepareNow(kind: PackKind): Promise<void> {
    if (this.value.phase === 'preparing' || this.disposed) return;
    const operation = ++this.operation, abort = this.abort = new AbortController();
    this.publish({ phase: 'preparing', completed: 0, total: 0, downloadedBytes: 0, problem: undefined });
    let received = 0;
    try {
      const revision = await this.store.getRevision();
      if (operation !== this.operation || abort.signal.aborted) return;
      const plan = await this.plan(kind, abort.signal);
      if (operation !== this.operation || abort.signal.aborted) return;
      this.publish({ plannedBytes: plan.bytes, total: plan.jobs.length });
      let charged = plan.metadataMissing ? 128 * 1024 : 0;
      const allowance: BackgroundAllowance = {
        claim: maximumBytes => {
          if (operation !== this.operation || abort.signal.aborted || charged + maximumBytes > plan.cap) return false;
          charged += maximumBytes; return true;
        },
        received: bytes => {
          received += bytes;
          if (operation === this.operation) this.publish({ downloadedBytes: received });
        },
      };
      let completed = 0;
      for (const job of plan.jobs) {
        if (operation !== this.operation || abort.signal.aborted) return;
        const record = await this.catalog.getRecord(job.pool, job.ordinal, abort.signal, 'background', allowance);
        if (operation !== this.operation || abort.signal.aborted) return;
        if (record.kind !== 'ready') throw new Error(record.reason.includes('offline-download-limit') ? 'offline-download-limit' : 'offline-download-' + record.kind);
        // Write success and independent readback, not cache presence, acknowledge readiness.
        if (!await this.store.putRecord(record.value, revision) || !await this.retained(job.pool, job.ordinal, plan.manifest)) throw new Error('offline-record-write');
        this.publish({ completed: ++completed, downloadedBytes: received });
        await yieldInput();
      }
      if (plan.fingerprint !== saveFingerprint(await this.current())) throw new Error('offline-state-changed');
      if (!await this.store.replacePins(plan.keys, revision)) throw new Error('offline-pin-write');
      this.publish({ phase: 'partial' });
      await this.inspecting;
      await this.inspect();
    } catch (error) {
      if (operation === this.operation) {
        this.publish({ phase: 'failed', problem: String(error), downloadedBytes: received });
        await this.inspect();
      }
    } finally { if (this.abort === abort) this.abort = undefined; }
  }
  cancel(): void {
    this.operation++; this.abort?.abort(); this.abort = undefined;
    if (this.value.phase === 'preparing') this.publish({ phase: 'cancelled' });
  }
  async clear(): Promise<void> {
    this.cancel();
    await this.preparing;
    await this.inspecting;
    if (!await this.store.clear()) { this.publish({ phase: 'failed', problem: 'offline-clear-write' }); return; }
    this.channel?.postMessage('cleared');
    this.publish({ phase: 'idle', counts: emptyCounts(), problem: undefined });
    await this.inspect();
  }
  dispose(): void { this.cancel(); this.disposed = true; this.listeners.clear(); this.channel?.close(); this.store.close(); }
}
export async function createOfflineSupport(repository: RepositoryReader, catalog: CatalogLoader): Promise<OfflineSupport> {
  const store = await openOfflineStore(new URL('../../', catalog.base));
  return new OfflineSupport(repository, catalog, store);
}

