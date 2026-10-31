import { decodeManifest, decodeShard, sha256, verifyRecordIdentity } from './decode';
import { context, inclusionProof, manifestMembership, merkleLevels, recordLeaf, verifyAttestedRecord } from './attestation';
import type { AttestedRecord, CatalogManifest, CatalogRecord, CatalogResult, PoolId, ShardDescriptor, VerifiedShardCache } from './types';
class Corrupt extends Error {}
interface SharedRead { controller: AbortController; consumers: number; promise: Promise<Uint8Array> }
export class CatalogLoader {
  readonly base: URL;
  private manifest?: CatalogManifest;
  private membership?: NonNullable<Awaited<ReturnType<typeof manifestMembership>>>;
  private recordTrees = new Map<string, Promise<readonly (readonly string[])[]>>();
  private initializing?: Promise<CatalogResult<CatalogManifest>>;
  private decoded = new Map<string, readonly CatalogRecord[]>();
  private reads = new Map<string, SharedRead>();
  private queue: Promise<unknown> = Promise.resolve();
  private fetcher: typeof fetch;
  private cache?: VerifiedShardCache;
  constructor(base: string | URL, options: { fetcher?: typeof fetch; cache?: VerifiedShardCache } = {}) {
    this.base = new URL(base, typeof location === 'undefined' ? 'https://toadodu.invalid/' : location.href);
    if (!this.base.pathname.endsWith('/')) this.base.pathname += '/';
    const fetcher = options.fetcher ?? globalThis.fetch;
    this.fetcher = (input, init) => fetcher(input, init); this.cache = options.cache;
  }
  private url(path: string): URL {
    const url = new URL(path, this.base);
    if (url.origin !== this.base.origin || !url.pathname.startsWith(this.base.pathname) || url.search || url.hash) throw new Corrupt('catalog path');
    return url;
  }
  private async fetchBounded(path: string, limit: number, signal: AbortSignal): Promise<Uint8Array> {
    const response = await this.fetcher(this.url(path), { signal, redirect: 'error' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (!response.body) throw new Corrupt('missing body');
    const reader = response.body.getReader(); const parts: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const part = await reader.read(); if (part.done) break;
        size += part.value.length;
        if (size > limit) { await reader.cancel(); throw new Corrupt('byte limit'); }
        parts.push(part.value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes;
  }
  private read(path: string, limit: number, signal?: AbortSignal): Promise<Uint8Array> {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    let shared = this.reads.get(path);
    if (shared?.controller.signal.aborted) shared = undefined;
    if (!shared) {
      const controller = new AbortController();
      const promise = this.queue.then(() => this.fetchBounded(path, limit, controller.signal));
      this.queue = promise.catch(() => undefined);
      shared = { controller, consumers: 0, promise }; this.reads.set(path, shared);
      const current = shared;
      void promise.finally(() => { if (this.reads.get(path) === current) this.reads.delete(path); }).catch(() => undefined);
    }
    shared.consumers++;
    const current = shared;
    return new Promise((resolve, reject) => {
      let finished = false;
      const finish = (fn: () => void) => {
        if (finished) return; finished = true; signal?.removeEventListener('abort', abort);
        current.consumers--; if (current.consumers === 0) current.controller.abort(); fn();
      };
      const abort = () => finish(() => reject(new DOMException('Aborted', 'AbortError')));
      signal?.addEventListener('abort', abort, { once: true });
      current.promise.then(v => finish(() => resolve(v)), e => finish(() => reject(e)));
    });
  }
  private resultError(error: unknown): CatalogResult<never> {
    return error instanceof DOMException && error.name === 'AbortError' ? { kind: 'aborted', reason: 'canceled' } :
      error instanceof Corrupt || error instanceof SyntaxError || error instanceof TypeError && error.message.includes('decode') ? { kind: 'corrupt', reason: String(error) } : { kind: 'unavailable', reason: String(error) };
  }
  async initialize(): Promise<CatalogResult<CatalogManifest>> {
    if (this.manifest) return { kind: 'ready', value: this.manifest };
    if (this.initializing) return this.initializing;
    this.initializing = (async () => {
      try {
        const bytes = await this.read('manifest.json', 128 * 1024);
        try { this.manifest = decodeManifest(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))); } catch (e) { throw new Corrupt(String(e)); }
        const membership = await manifestMembership(this.manifest);
        if (!membership) { this.manifest = undefined; throw new Corrupt('untrusted manifest membership'); }
        this.membership = membership;
        return { kind: 'ready' as const, value: this.manifest };
      } catch (e) { return this.resultError(e); }
      finally { this.initializing = undefined; }
    })();
    return this.initializing;
  }
  private async shard(descriptor: ShardDescriptor, signal?: AbortSignal): Promise<readonly CatalogRecord[]> {
    const known = this.decoded.get(descriptor.sha256);
    if (known) { this.decoded.delete(descriptor.sha256); this.decoded.set(descriptor.sha256, known); return known; }
    let bytes: Uint8Array | undefined;
    try { bytes = await this.cache?.get(descriptor.sha256); } catch { /* Disposable cache failure does not fail essential play. */ }
    if (bytes && (bytes.length !== descriptor.bytes || await sha256(bytes) !== descriptor.sha256)) bytes = undefined;
    if (!bytes) bytes = await this.read(descriptor.path, 96 * 1024, signal);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (bytes.length !== descriptor.bytes || await sha256(bytes) !== descriptor.sha256) throw new Corrupt('shard hash/size');
    let records: readonly CatalogRecord[];
    try { records = decodeShard(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)), descriptor); } catch (e) { throw new Corrupt(String(e)); }
    this.decoded.set(descriptor.sha256, records);
    while (this.decoded.size > 3) { const oldest = this.decoded.keys().next().value!; this.decoded.delete(oldest); this.recordTrees.delete(oldest); }
    try { await this.cache?.put(descriptor.sha256, bytes); } catch { /* Separate disposable cache quota is nonfatal. */ }
    return records;
  }
  async getRecord(pool: PoolId, ordinal: number, signal?: AbortSignal): Promise<CatalogResult<AttestedRecord>> {
    if (signal?.aborted) return { kind: 'aborted', reason: 'canceled' };
    const initialized = await this.initialize(); if (initialized.kind !== 'ready') return initialized;
    if (signal?.aborted) return { kind: 'aborted', reason: 'canceled' };
    const data = initialized.value.pools[pool];
    if (!data || !Number.isSafeInteger(ordinal) || ordinal < 0 || ordinal >= data.count) return { kind: 'exhausted', reason: 'ordinal outside pool' };
    const descriptor = data.shards.find(s => ordinal >= s.start && ordinal < s.start + s.count)!;
    try {
      const records = await this.shard(descriptor, signal), record = records[ordinal - descriptor.start];
      if (!await verifyRecordIdentity(record)) throw new Corrupt('record identity');
      let tree = this.recordTrees.get(descriptor.sha256);
      if (!tree) {
        const metadata = context(initialized.value.catalogVersion, initialized.value.certificationVersion, initialized.value.sourceRevision);
        tree = Promise.all(records.map((r, i) => recordLeaf(r, pool, descriptor.start + i, metadata))).then(leaves => merkleLevels(leaves, 1));
        if (this.decoded.has(descriptor.sha256)) {
          this.recordTrees.set(descriptor.sha256, tree);
          while (this.recordTrees.size > 3) this.recordTrees.delete(this.recordTrees.keys().next().value!);
        }
      }
      const levels = await tree;
      if (levels.at(-1)![0] !== descriptor.recordRoot) throw new Corrupt('record membership root');
      const shardIndex = this.membership!.shards.findIndex(s => s.pool === pool && s.start === descriptor.start);
      const attested: AttestedRecord = { ...record, catalogVersion: initialized.value.catalogVersion, certificationVersion: initialized.value.certificationVersion, sourceRevision: initialized.value.sourceRevision, pool,
        attestation: { version: 1, shardStart: descriptor.start, recordCount: descriptor.count, recordIndex: ordinal - descriptor.start,
          recordSiblings: inclusionProof(levels, ordinal - descriptor.start), shardIndex, shardCount: this.membership!.shards.length, shardSiblings: inclusionProof(this.membership!.levels, shardIndex) } };
      if (!await verifyAttestedRecord(attested)) throw new Corrupt('record membership proof');
      if (signal?.aborted) return { kind: 'aborted', reason: 'canceled' };
      return { kind: 'ready', value: attested };
    } catch (e) { return this.resultError(e); }
  }
  dispose() { for (const shared of this.reads.values()) shared.controller.abort(); this.decoded.clear(); this.recordTrees.clear(); }
}
