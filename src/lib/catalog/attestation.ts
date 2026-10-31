import { CATALOG_TRUST } from './trust.v1.ts';
import { decodeTuple, sha256, SOURCE_FILES, SOURCE_REVISION, verifyRecordIdentity } from './decode.ts';
import { POOLS } from './types.ts';
import type { AttestedRecord, CatalogManifest, CatalogRecord, MembershipAttestation, PoolId, RecordTuple, ShardDescriptor } from './types.ts';
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value));
const hex = /^[a-f0-9]{64}$/;
export function recordTuple(record: CatalogRecord): RecordTuple {
  return [record.id, record.groupId, record.sourceId, record.givens, record.solution, record.ratingTenths, SOURCE_FILES.indexOf(record.sourceFile)];
}
export function context(catalogVersion: string, certificationVersion: string, sourceRevision: string) {
  return ['toadodu:membership:v1:duplicate-odd', catalogVersion, certificationVersion, sourceRevision];
}
async function prefixed(prefix: number, bytes: Uint8Array): Promise<string> {
  const input = new Uint8Array(bytes.length + 1); input[0] = prefix; input.set(bytes, 1); return sha256(input);
}
export function recordLeaf(record: CatalogRecord, pool: PoolId, ordinal: number, metadata = context('1', '1', SOURCE_REVISION)): Promise<string> {
  return prefixed(0, encode([...metadata, pool, ordinal, ...recordTuple(record)]));
}
export function shardLeaf(descriptor: Pick<ShardDescriptor, 'pool' | 'start' | 'count' | 'recordRoot'>, metadata = context('1', '1', SOURCE_REVISION)): Promise<string> {
  return prefixed(2, encode([...metadata, descriptor.pool, descriptor.start, descriptor.count, descriptor.recordRoot]));
}
export function branch(left: string, right: string, prefix: 1 | 3): Promise<string> {
  if (!hex.test(left) || !hex.test(right)) throw new Error('membership hash');
  const pair = new Uint8Array(64);
  for (let i = 0; i < 32; i++) { pair[i] = parseInt(left.slice(i * 2, i * 2 + 2), 16); pair[32 + i] = parseInt(right.slice(i * 2, i * 2 + 2), 16); }
  return prefixed(prefix, pair);
}
export async function merkleLevels(leaves: readonly string[], prefix: 1 | 3): Promise<readonly (readonly string[])[]> {
  if (!leaves.length || leaves.some(h => !hex.test(h))) throw new Error('membership leaves');
  const levels: string[][] = [[...leaves]];
  while (levels.at(-1)!.length > 1) {
    const previous = levels.at(-1)!;
    levels.push(await Promise.all(Array.from({ length: Math.ceil(previous.length / 2) }, (_, i) => branch(previous[2 * i], previous[2 * i + 1] ?? previous[2 * i], prefix))));
  }
  return levels;
}
export function inclusionProof(levels: readonly (readonly string[])[], index: number): string[] {
  if (!Number.isInteger(index) || index < 0 || index >= levels[0].length) throw new Error('membership index');
  const siblings: string[] = [];
  for (const level of levels.slice(0, -1)) { siblings.push(level[index ^ 1] ?? level[index]); index = Math.floor(index / 2); }
  return siblings;
}
async function rootFromProof(leaf: string, index: number, count: number, siblings: readonly string[], prefix: 1 | 3): Promise<string | undefined> {
  if (!Number.isSafeInteger(index) || !Number.isSafeInteger(count) || count < 1 || index < 0 || index >= count || siblings.length !== Math.ceil(Math.log2(count)) || siblings.some(s => !hex.test(s))) return undefined;
  let current = leaf;
  for (const sibling of siblings) {
    if (index % 2 === 0 && index + 1 >= count && sibling !== current) return undefined;
    current = index % 2 ? await branch(sibling, current, prefix) : await branch(current, sibling, prefix);
    index = Math.floor(index / 2); count = Math.ceil(count / 2);
  }
  return current;
}
export async function manifestMembership(manifest: CatalogManifest): Promise<{ levels: readonly (readonly string[])[]; shards: readonly ShardDescriptor[] } | undefined> {
  const trusted = CATALOG_TRUST[[manifest.catalogVersion, manifest.certificationVersion, manifest.sourceRevision].join(':')];
  const shards = POOLS.flatMap(pool => [...manifest.pools[pool].shards]);
  if (!trusted || shards.length !== trusted.shards || POOLS.some(pool => manifest.pools[pool].count !== trusted.pools[pool])) return undefined;
  const metadata = context(manifest.catalogVersion, manifest.certificationVersion, manifest.sourceRevision);
  const levels = await merkleLevels(await Promise.all(shards.map(s => shardLeaf(s, metadata))), 3);
  return levels.at(-1)![0] === trusted.root ? { levels, shards } : undefined;
}
export async function verifyAttestedRecord(input: AttestedRecord): Promise<boolean> {
  try {
    const p: MembershipAttestation = input.attestation;
    if (!p || p.version !== 1 || !Array.isArray(p.recordSiblings) || p.recordSiblings.length > 8 || !Array.isArray(p.shardSiblings) || p.shardSiblings.length > 16 || !Number.isSafeInteger(p.shardStart) || p.shardStart < 0 || !Number.isSafeInteger(p.recordCount) || p.recordCount < 1 || p.recordCount > 256 || !POOLS.includes(input.pool)) return false;
    const key = [input.catalogVersion, input.certificationVersion, input.sourceRevision].join(':'), trusted = CATALOG_TRUST[key];
    if (!trusted || trusted.shards !== p.shardCount || !Number.isSafeInteger(p.recordIndex) || p.recordIndex < 0 || p.recordIndex >= p.recordCount || p.shardStart + p.recordCount > trusted.pools[input.pool]) return false;
    const record = decodeTuple(recordTuple(input), input.pool);
    if (!await verifyRecordIdentity(record)) return false;
    const metadata = context(input.catalogVersion, input.certificationVersion, input.sourceRevision);
    const leaf = await recordLeaf(record, input.pool, p.shardStart + p.recordIndex, metadata);
    const recordRoot = await rootFromProof(leaf, p.recordIndex, p.recordCount, p.recordSiblings, 1);
    if (!recordRoot) return false;
    const topLeaf = await shardLeaf({ pool: input.pool, start: p.shardStart, count: p.recordCount, recordRoot }, metadata);
    return await rootFromProof(topLeaf, p.shardIndex, p.shardCount, p.shardSiblings, 3) === trusted.root;
  } catch { return false; }
}
