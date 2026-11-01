import type { AttestedRecord, PoolId } from '../catalog/types';

export interface OfflineCatalogCache {
  getManifest(): Promise<Uint8Array | undefined>;
  putManifest(bytes: Uint8Array): Promise<boolean>;
  getRecord(pool: PoolId, ordinal: number): Promise<AttestedRecord | undefined>;
  putRecord(record: AttestedRecord): Promise<boolean>;
}
export interface OfflineStore extends OfflineCatalogCache {
  inventory(): Promise<{ keys: string[]; bytes: number; revision: number }>;
  replacePins(keys: readonly string[]): Promise<boolean>;
  clear(): Promise<boolean>;
  close(): void;
}

