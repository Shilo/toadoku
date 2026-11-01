export interface ArtifactCapacity { budgetBytes: number; usedBytes: number; plannedBytes: number; projectedBytes: number; withinBudget: boolean; accountQuotaVerified: boolean }
export const DEFAULT_ARTIFACT_BUDGET: number;
export function checkArtifactCapacity(api: (path: string) => Promise<any>, plannedBytes: number, budgetBytes?: number): Promise<ArtifactCapacity>;

export function estimatedUploadBytes(inventories: Array<{ bytes: number; files: number; pathBytes: number; paddedBytes: number }>): number;
