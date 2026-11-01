import { verifyAttestedRecord } from '../catalog/attestation';
import type { AttestedRecord, CatalogManifest, PoolId } from '../catalog/types';
const RECORD_KEYS = ['id','groupId','sourceId','givens','solution','ratingTenths','sourceFile','catalogVersion','certificationVersion','sourceRevision','pool','attestation'];
const PROOF_KEYS = ['version','shardStart','recordCount','recordIndex','recordSiblings','shardIndex','shardCount','shardSiblings'];
function exactObject(value: unknown, keys: readonly string[]): boolean {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && keys.every(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !!descriptor && descriptor.enumerable && 'value' in descriptor;
  });
}
function denseProof(value: unknown): boolean {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype || value.length > 16 || Reflect.ownKeys(value).length !== value.length + 1) return false;
  for (let index = 0; index < value.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !('value' in descriptor)) return false;
  }
  return true;
}
/** Match the strict allocation DTO shape as well as its certified leaf/proof. */
export async function verifyRetained(record: AttestedRecord, manifest: CatalogManifest, pool: PoolId, ordinal: number): Promise<boolean> {
  try {
    return exactObject(record, RECORD_KEYS) && exactObject(record.attestation, PROOF_KEYS) &&
      denseProof(record.attestation.recordSiblings) && denseProof(record.attestation.shardSiblings) &&
      record.catalogVersion === manifest.catalogVersion && record.certificationVersion === manifest.certificationVersion &&
      record.sourceRevision === manifest.sourceRevision && record.pool === pool &&
      record.attestation.shardStart + record.attestation.recordIndex === ordinal && await verifyAttestedRecord(record);
  } catch { return false; }
}

