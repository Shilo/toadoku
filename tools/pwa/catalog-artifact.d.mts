export interface CatalogArtifactResult {
  puzzles: number;
  shards: number;
  shardBytes: number;
  manifestSha256: string;
  certificationReused: boolean;
}
export function validateCatalog(root: string, reader?: (path: string) => Promise<Buffer>): Promise<CatalogArtifactResult>;
