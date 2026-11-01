import type { AttestedRecord, PoolId } from '../catalog/types';

export interface OfflineCatalogCache {
  getManifest(): Promise<Uint8Array | undefined>;
  putManifest(bytes: Uint8Array): Promise<boolean>;
  getRecord(pool: PoolId, ordinal: number): Promise<AttestedRecord | undefined>;
  getRevision(): Promise<number>;
  putRecord(record: AttestedRecord, expectedRevision: number): Promise<boolean>;
}
export interface OfflineStore extends OfflineCatalogCache {
  inventory(): Promise<{ keys: string[]; bytes: number; revision: number }>;
  replacePins(keys: readonly string[], expectedRevision: number): Promise<boolean>;
  clear(): Promise<boolean>;
  close(): void;
}

