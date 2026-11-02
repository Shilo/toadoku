import type { ReadPage } from './bootstrap.mjs';
export interface PreviousArchive {
  id: number; name: string; expired: boolean; size_in_bytes: number; created_at: string;
  workflow_run: { id: number; head_sha: string; head_branch: string; repository_id: number; head_repository_id: number };
}
export function previousArchive(context: {
  repository: string; runId: number; attempt: number;
  read(path: string): Promise<ReadPage>; now?: number;
}): Promise<PreviousArchive | undefined>;
