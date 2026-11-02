export interface ReadPage { data: any; hasNext: boolean }
export interface BootstrapContext {
  confirmation?: boolean; repository?: string; base?: string; sha?: string; event?: string; ref?: string;
  runId: number; attempt: number; source: Uint8Array;
  read(path: string): Promise<ReadPage>;
}
export function workflowHash(source: Uint8Array): string;
export function initialReleaseProof(context: BootstrapContext): Promise<{ bootstrap: boolean; reason: string; priorAttempts?: number; assertion?: string; identity?: { repository: string; site: string; sha: string; runId: number; attempt: number } }>;
