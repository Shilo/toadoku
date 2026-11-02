/** Worker snapshot and lease policy. Essential gameplay storage is deliberately separate. */
export const SHELL_FILE_LIMIT = 4 * 1024 * 1024;
export const SHELL_LIMIT = 8 * 1024 * 1024;
export const SHELL_TOTAL_LIMIT = 24 * 1024 * 1024;
export const INVENTORY_LIMIT = 128 * 1024;
export const LEASE_AGE = 30 * 86400_000;
export const BUILD_ID = /^[a-f0-9]{64}$/;
const DOCUMENT_ID = /^[A-Za-z0-9:_-]{1,128}$/;
export interface ShellFile { path: string; bytes: number; sha256: string; integrity: string }
export interface ShellInventory { protocol: 1; buildId: string; files: ShellFile[] }
export interface ShellSnapshot { buildId: string; inventoryHash?: string; state: 'ready' | 'deleting' }
export interface ShellLease { documentId?: string; buildId?: string; primary?: string; caches: string[]; observed: number }
export interface ShellState {
  protocol: 2; seeded: boolean; snapshots: Record<string, ShellSnapshot>; leases: Record<string, ShellLease>;
  overflow: Record<string, number>;
  capacityDeferred: boolean;
}
export const emptyShellState = (): ShellState => ({ protocol: 2, seeded: false, snapshots: {}, leases: {}, overflow: {}, capacityDeferred: false });
/** Lost ownership metadata cannot authenticate arbitrary old inventories or invent page identities. */
export function reconstructedShellState(names: readonly string[], ownName: string, own: ShellSnapshot | undefined, now: number, clients: readonly string[] = []): ShellState {
  if (names.length > 64) throw new Error('Too many snapshots to reconstruct safely');
  const state = emptyShellState(); state.seeded = true;
  for (const name of names) state.overflow[name] = now;
  for (const id of clients.slice(0, 256)) state.leases[id] = { caches: [...names], observed: now };
  if (own) state.snapshots[ownName] = own;
  return state;
}
export function shellPath(path: unknown): path is string {
  return typeof path === 'string' && (['index.html', 'manifest.webmanifest', 'release.json'].includes(path)
    || /^assets\/[\w.-]+\.(?:js|css|ttf|woff2?|png|svg|webp)$/.test(path)
    || /^pwa\/[\w.-]+\.(?:png|svg|txt)$/.test(path) || /^licenses\/[\w.-]+\.(?:txt|json)$/.test(path)
    || /^catalog\/v1\/(?:LICENSE.txt|PROVENANCE.json)$/.test(path));
}
export function immutableShellPath(path: string): boolean { return path.startsWith('assets/') && shellPath(path); }
export function decodeInventory(value: unknown, buildId: string): ShellInventory {
  const data = value as Partial<ShellInventory> | null;
  if (!data || data.protocol !== 1 || data.buildId !== buildId || !BUILD_ID.test(buildId)
    || !Array.isArray(data.files) || !data.files.length || data.files.length > 256) throw new Error('Invalid shell inventory');
  let bytes = 0;
  const paths = new Set<string>();
  for (const file of data.files) {
    if (!file || !shellPath(file.path) || file.path === 'release.json' || paths.has(file.path)
      || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > SHELL_FILE_LIMIT
      || !BUILD_ID.test(file.sha256) || !/^sha256-[A-Za-z0-9+/]{43}=$/.test(file.integrity)
      || file.integrity !== `sha256-${btoa(String.fromCharCode(...file.sha256.match(/../g)!.map(byte => Number.parseInt(byte, 16))))}`) throw new Error('Invalid shell inventory entry');
    paths.add(file.path); bytes += file.bytes;
  }
  if (!paths.has('index.html') || bytes > SHELL_LIMIT) throw new Error('Incomplete or oversized shell inventory');
  return data as ShellInventory;
}
export function assertImmutableCompatibility(inventories: readonly ShellInventory[]): void {
  const hashes = new Map<string, string>();
  for (const inventory of inventories) for (const file of inventory.files) if (immutableShellPath(file.path)) {
    if (hashes.has(file.path) && hashes.get(file.path) !== file.sha256) throw new Error('Immutable shell URL changed bytes');
    hashes.set(file.path, file.sha256);
  }
}
export function validDocumentId(value: unknown): value is string { return typeof value === 'string' && DOCUMENT_ID.test(value); }
export function validateShellState(state: ShellState, prefix: string): ShellState {
  const owned = (name: string) => name.startsWith(prefix) && BUILD_ID.test(name.slice(prefix.length));
  if (state?.protocol !== 2 || typeof state.seeded !== 'boolean' || typeof state.capacityDeferred !== 'boolean'
    || !state.snapshots || !state.leases || !state.overflow || Object.keys(state.snapshots).length > 64 || Object.keys(state.leases).length > 256 || Object.keys(state.overflow).length > 64) throw new Error('Shell metadata exceeds its bounds');
  for (const [name, observed] of Object.entries(state.overflow)) if (!owned(name) || !Number.isSafeInteger(observed) || observed < 0) throw new Error('Invalid shell overflow lease');
  for (const [name, snapshot] of Object.entries(state.snapshots)) {
    if (!owned(name) || snapshot.buildId !== name.slice(prefix.length) || !['ready', 'deleting'].includes(snapshot.state)
      || snapshot.inventoryHash !== undefined && !BUILD_ID.test(snapshot.inventoryHash)) throw new Error('Invalid shell snapshot metadata');
  }
  for (const [id, lease] of Object.entries(state.leases)) {
    if (!id || id.length > 256 || !lease || !Array.isArray(lease.caches) || lease.caches.length > 64
      || lease.caches.some(name => !owned(name)) || new Set(lease.caches).size !== lease.caches.length
      || !Number.isSafeInteger(lease.observed) || lease.observed < 0
      || lease.buildId !== undefined && !BUILD_ID.test(lease.buildId)
      || lease.documentId !== undefined && !validDocumentId(lease.documentId)
      || lease.primary !== undefined && !lease.caches.includes(lease.primary)) throw new Error('Invalid shell lease');
  }
  return state;
}
/** Seeding cannot expand with each release and turn every staged build into a legacy dependency. */
export function seedLegacy(state: ShellState, clients: readonly string[], names: readonly string[], primary: string | undefined, now: number): void {
  if (state.seeded) return;
  for (const id of clients) if (!state.leases[id] && Object.keys(state.leases).length < 256) state.leases[id] = { caches: [...names], primary, observed: now };
  // Legacy BFCache documents can be absent from matchAll before the first protocol 2 install.
  for (const name of names) state.overflow[name] = Math.max(state.overflow[name] ?? 0, now);
  state.seeded = true;
}
export function renewObserved(state: ShellState, clients: ReadonlySet<string>, now: number): void {
  for (const [id, lease] of Object.entries(state.leases)) {
    if (clients.has(id)) lease.observed = now;
    // Clock reversal is conservative. A live client is renewed before expiry is considered.
    else if (now >= lease.observed && now - lease.observed > LEASE_AGE) delete state.leases[id];
  }
  for (const [name, observed] of Object.entries(state.overflow)) if (now >= observed && now - observed > LEASE_AGE) delete state.overflow[name];
}
/** Missing known pages retain dependency bytes without an unbounded list of closed document IDs. */
export function compactAbsent(state: ShellState, clients: ReadonlySet<string>, now: number): void {
  for (const [id, lease] of Object.entries(state.leases)) if (!clients.has(id) && lease.buildId && lease.primary
    && now >= lease.observed && now - lease.observed >= 60_000) {
    for (const name of lease.caches) state.overflow[name] = Math.max(state.overflow[name] ?? 0, lease.observed);
    delete state.leases[id];
  }
}
/** Used inside the same transaction as GC tombstones. Unknown builds never receive mutable fallback. */
export function connectPage(state: ShellState, id: string, buildId: string, documentId: string, now: number): boolean {
  const name = Object.keys(state.snapshots).find(key => state.snapshots[key].buildId === buildId && state.snapshots[key].state === 'ready' && state.snapshots[key].inventoryHash);
  const previous = state.leases[id];
  if (!name) {
    if (previous || Object.keys(state.leases).length < 256) state.leases[id] = { documentId, buildId, caches: previous?.caches ?? [], observed: now };
    return false;
  }
  if (!previous && Object.keys(state.leases).length >= 256) { state.overflow[name] = now; return false; }
  state.leases[id] = { documentId, buildId, primary: name, caches: [name], observed: now };
  return true;
}
export function pinSnapshot(state: ShellState, id: string, name: string, now: number): boolean {
  if (state.snapshots[name]?.state !== 'ready' || !state.snapshots[name].inventoryHash) return false;
  const previous = state.leases[id];
  if (previous) {
    if (!previous.caches.includes(name)) previous.caches.push(name);
    previous.observed = now;
  } else {
    if (Object.keys(state.leases).length >= 256) { state.overflow[name] = now; return false; }
    state.leases[id] = { caches: [name], primary: name, buildId: state.snapshots[name].buildId, observed: now };
  }
  return true;
}
export function releasePage(state: ShellState, id: string, buildId: string, documentId: string, persisted: boolean): void {
  const lease = state.leases[id];
  if (!persisted && lease?.documentId === documentId && lease.buildId === buildId) delete state.leases[id];
}
/** The tombstone prevents a late announcement from resurrecting a cache selected for deletion. */
export function markDeleting(state: ShellState, names: readonly string[], protectedNames: ReadonlySet<string>): string[] {
  const pinned = new Set([...Object.values(state.leases).flatMap(lease => lease.caches), ...Object.keys(state.overflow)]);
  const deleting: string[] = [];
  for (const name of names) if (!protectedNames.has(name) && !pinned.has(name)) {
    const snapshot = state.snapshots[name];
    state.snapshots[name] = { buildId: snapshot?.buildId ?? name.slice(name.lastIndexOf(':') + 1), inventoryHash: snapshot?.inventoryHash, state: 'deleting' };
    deleting.push(name);
  }
  return deleting;
}
