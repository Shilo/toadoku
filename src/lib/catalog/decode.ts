import { POOLS, ratingPool } from './types.ts';
import type { CatalogManifest, CatalogRecord, PoolId, RecordTuple, ShardDescriptor, SourceFile } from './types';
export const SOURCE_FILES: readonly SourceFile[] = ['easy.txt', 'medium.txt', 'hard.txt'];
export const SOURCE_REVISION = 'd8c8ebaee0c08c412cfba96af1923dfa61c83317';
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const integer = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
function object(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype; }
function keys(v: Record<string, unknown>, expected: string[]) { return Object.keys(v).sort().join(',') === [...expected].sort().join(','); }
function denseArray(value: unknown, limit = 256): value is unknown[] {
  if (!Array.isArray(value) || value.length > limit || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let i = 0; i < value.length; i++) if (!Object.prototype.propertyIsEnumerable.call(value, i)) return false;
  return true;
}
export function decodeManifest(value: unknown): CatalogManifest {
  if (!object(value) || !keys(value, ['schemaVersion', 'catalogVersion', 'certificationVersion', 'selectionVersion', 'sourceRevision', 'sourceHashes', 'pools']) || value.schemaVersion !== 1 || value.catalogVersion !== '1' || value.certificationVersion !== '1' || value.selectionVersion !== '1' || value.sourceRevision !== SOURCE_REVISION || !object(value.sourceHashes) || !keys(value.sourceHashes, [...SOURCE_FILES]) || !SOURCE_FILES.every(f => hash((value.sourceHashes as Record<string, unknown>)[f])) || !object(value.pools) || !keys(value.pools, [...POOLS])) throw new Error('manifest schema');
  let total = 0;
  for (const pool of POOLS) {
    const data = value.pools[pool];
    if (!object(data) || !keys(data, ['count', 'shards']) || !integer(data.count, 1000, 1_000_000) || !denseArray(data.shards, 5000)) throw new Error('pool schema');
    let start = 0;
    for (let index = 0; index < data.shards.length; index++) {
      const item = data.shards[index];
      if (!object(item) || !keys(item, ['path', 'sha256', 'bytes', 'count', 'start', 'pool', 'recordRoot']) || !hash(item.recordRoot) || item.pool !== pool || !integer(item.start, 0, data.count - 1) || item.start !== start || !integer(item.count, 1, 256) || !integer(item.bytes, 1, 96 * 1024) || !hash(item.sha256) || typeof item.path !== 'string' || item.path !== `${pool}-${item.start}-${item.sha256.slice(0, 16)}.json`) throw new Error('shard descriptor');
      start += item.count;
    }
    if (start !== data.count) throw new Error('pool count');
    total += data.count;
  }
  const pools = value.pools as CatalogManifest['pools'];
  if (total < 100000 || pools.easy.count < 25000 || pools['medium-low'].count + pools['medium-high'].count < 25000 || pools['hard-low'].count + pools['hard-high'].count < 50000) throw new Error('catalog quotas');
  return value as unknown as CatalogManifest;
}
function validDefinition(givens: string, solution: string): boolean {
  if (!givens.includes('0')) return false;
  for (let cell = 0; cell < 81; cell++) if (givens[cell] !== '0' && givens[cell] !== solution[cell]) return false;
  for (let u = 0; u < 9; u++) {
    const row = new Set(), col = new Set(), box = new Set();
    for (let k = 0; k < 9; k++) {
      row.add(solution[u * 9 + k]); col.add(solution[k * 9 + u]);
      box.add(solution[(Math.floor(u / 3) * 3 + Math.floor(k / 3)) * 9 + (u % 3) * 3 + k % 3]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return false;
  }
  return true;
}
export function decodeTuple(value: unknown, pool: PoolId): CatalogRecord {
  if (!denseArray(value) || value.length !== 7 || !hash(value[0]) || !hash(value[1]) || typeof value[2] !== 'string' || !/^[a-f0-9]{12}$/.test(value[2]) || typeof value[3] !== 'string' || !/^[0-9]{81}$/.test(value[3]) || typeof value[4] !== 'string' || !/^[1-9]{81}$/.test(value[4]) || !integer(value[5], 10, 49) || ratingPool(value[5]) !== pool || !integer(value[6], 0, 2) || !validDefinition(value[3], value[4])) throw new Error('catalog record');
  const tuple = value as unknown as RecordTuple;
  return Object.freeze({ id: tuple[0], groupId: tuple[1], sourceId: tuple[2], givens: tuple[3], solution: tuple[4], ratingTenths: tuple[5], sourceFile: SOURCE_FILES[tuple[6]] });
}
export function decodeShard(value: unknown, descriptor: ShardDescriptor): readonly CatalogRecord[] {
  if (!object(value) || !keys(value, ['schemaVersion', 'catalogVersion', 'pool', 'start', 'records']) || value.schemaVersion !== 1 || value.catalogVersion !== '1' || value.pool !== descriptor.pool || value.start !== descriptor.start || !denseArray(value.records) || value.records.length !== descriptor.count) throw new Error('shard schema');
  const records: CatalogRecord[] = [];
  for (let index = 0; index < value.records.length; index++) records.push(decodeTuple(value.records[index], descriptor.pool));
  if (new Set(records.map(r => r.id)).size !== records.length || new Set(records.map(r => r.groupId)).size !== records.length) throw new Error('duplicate shard identities');
  return Object.freeze(records);
}
export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
/** Browser-side identity recomputation deliberately has no Node dependency. */
export async function verifyRecordIdentity(record: CatalogRecord): Promise<boolean> {
  const enc = new TextEncoder();
  const variants: string[] = [];
  for (let flip = 0; flip < 2; flip++) for (let turns = 0; turns < 4; turns++) {
    const transformed = Array<string>(81);
    for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) {
      let row = y, col = flip ? 8 - x : x;
      for (let t = 0; t < turns; t++) { const previous = row; row = col; col = 8 - previous; }
      transformed[row * 9 + col] = record.givens[y * 9 + x];
    }
    const mapping: Record<string, string> = {}; let next = 1;
    variants.push(transformed.map(d => d === '0' ? '0' : mapping[d] ?? (mapping[d] = String(next++))).join(''));
  }
  const [id, group] = await Promise.all([sha256(enc.encode('toadodu:classic9:givens:v1\n' + record.givens)), sha256(enc.encode('toadodu:classic9:d4-label:v1\n' + variants.sort()[0]))]);
  return id === record.id && group === record.groupId;
}
