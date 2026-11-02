export interface ReleaseDecision { release: boolean; reason: string }
export const SHIPPED: string[];
export const EXCLUDED: string[];
export function releasePathspecs(): string[];
export function isReleaseInput(file: string): boolean;
export function pushDecision(before: string | undefined, after: string, cwd?: string): ReleaseDecision;
export function eventDecision(eventName: string, event: any, sha: string, ref: string, cwd?: string): ReleaseDecision;
export function currentDecision(source: string, latest: string, cwd?: string): ReleaseDecision;
export function fetchCurrentDecision(source: string, cwd?: string): ReleaseDecision;
