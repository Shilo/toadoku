export const POOLS = ['easy', 'medium-low', 'medium-high', 'hard-low', 'hard-high'] as const;
export type PoolId = typeof POOLS[number];
export type SourceFile = 'easy.txt' | 'medium.txt' | 'hard.txt';
export interface CatalogRecord {
  readonly id: string;
  readonly groupId: string;
  readonly sourceId: string;
  readonly givens: string;
  readonly solution: string;
  readonly ratingTenths: number;
  readonly sourceFile: SourceFile;
}
export interface MembershipAttestation {
  version: 1;
  shardStart: number;
  recordCount: number;
  recordIndex: number;
  recordSiblings: string[];
  shardIndex: number;
  shardCount: number;
  shardSiblings: string[];
}
export interface AttestedRecord extends CatalogRecord {
  attestation: MembershipAttestation;
  catalogVersion: string;
  certificationVersion: string;
  sourceRevision: string;
  pool: PoolId;
}
/** Field order is versioned. Source file is 0=easy, 1=medium, 2=hard. */
export type RecordTuple = readonly [string, string, string, string, string, number, number];
export interface ShardDescriptor {
  readonly path: string;
  readonly sha256: string;
  readonly bytes: number;
  readonly count: number;
  readonly start: number;
  readonly pool: PoolId;
  readonly recordRoot: string;
}
export interface CatalogManifest {
  readonly schemaVersion: 1;
  readonly catalogVersion: '1';
  readonly certificationVersion: '1';
  readonly selectionVersion: '1';
  readonly sourceRevision: string;
  readonly sourceHashes: Readonly<Record<SourceFile, string>>;
  readonly pools: Readonly<Record<PoolId, { readonly count: number; readonly shards: readonly ShardDescriptor[] }>>;
}
export type CatalogResult<T> = { kind: 'ready'; value: T }
  | { kind: 'unavailable' | 'corrupt' | 'aborted' | 'exhausted'; reason: string };
export interface VerifiedShardCache {
  get(hash: string): Promise<Uint8Array | undefined>;
  put(hash: string, bytes: Uint8Array): Promise<void>;
}
export function ratingPool(rating: number): PoolId | undefined {
  if (!Number.isInteger(rating) || rating < 10 || rating >= 50) return undefined;
  return rating < 15 ? 'easy' : rating < 20 ? 'medium-low' : rating < 25 ? 'medium-high' : rating < 35 ? 'hard-low' : 'hard-high';
}
