/** Domain records contain data only. Schema, catalog, scoring and schedule versions are distinct. */
import type { AttestedRecord, PoolId } from '../catalog/types.ts';

export type Role = 'quick' | 'frontier' | 'replay';
export type Band = 'easy' | 'medium' | 'hard';
export interface Preferences {
  schemaVersion: 1;
  language: 'en' | 'de' | 'es';
  motion: 'system' | 'reduced' | 'full';
  boardShape: 'fill' | 'square';
  /** Preserve unknown future identifiers, render the supported Pond fallback. */
  theme: string;
  appearance: string;
}
export interface Definition extends AttestedRecord {
  catalogVersion: string;
  certificationVersion: string;
  sourceRevision: string;
  pool: PoolId;
}
export interface RewardPolicy {
  rewardVersion: 2;
  scheduleVersion: 1;
  band: Band;
  base: number;
  targetMs: number;
}
export interface Frontier {
  runId: string;
  metamorphosis: number;
  leap: number;
  scheduleVersion: 1;
}
export interface Profile {
  revision: number;
  wallet: number;
  lifetimeEarned: number;
  frontier: Frontier;
  highestCompletedLeap: number;
}
export interface CellChange {
  cell: number;
  beforeValue: number;
  afterValue: number;
  beforeNotes: number;
  afterNotes: number;
}
export interface EditPatch { cell: number; changes: CellChange[] }
export type Technique = 'naked-single' | 'hidden-single' | 'pointing' | 'claiming' |
  'naked-pair' | 'hidden-pair' | 'naked-triple' | 'hidden-triple' | 'x-wing';
export interface Conclusion { cell: number; digit: number }
export interface Deduction {
  kind: 'deduction';
  technique: Technique;
  techniqueVersion: 1;
  logicalRevision: number;
  witness: { units: number[]; cells: number[]; digits: number[] };
  placements: Conclusion[];
  eliminations: Conclusion[];
}
export type HintPayload = Deduction |
  { kind: 'reveal'; logicalRevision: number; cell: number; digit: number } |
  { kind: 'inconsistent'; logicalRevision: number };
export interface Disclosure {
  id: string;
  attemptId: string;
  logicalRevision: number;
  payload: HintPayload;
  exposed: number[];
  information: true;
}
export interface Attempt {
  schemaVersion: 1;
  id: string;
  generation: string;
  role: Role;
  revision: number;
  commandSeq: number;
  logicalRevision: number;
  writer: { token: string; epoch: number };
  definition: Definition;
  policy: RewardPolicy;
  binding?: Frontier;
  /** Clue positions always contain zero in these independent entry arrays. */
  entries: number[];
  /** Bits 0 through 8 correspond to digits 1 through 9. */
  notes: number[];
  selection: number;
  notesMode: boolean;
  undo: EditPatch[];
  elapsedMs: number;
  assistance: { used: boolean; exposed: number[] };
  pendingDisclosure?: Disclosure;
  status: 'playing' | 'pending-completion' | 'completed' | 'retired';
  scored: boolean;
  receiptId?: string;
}
export interface RewardInputs {
  blanks: number;
  exposed: number;
  elapsedMs: number;
  information: boolean;
}
export interface RewardResult extends RewardInputs {
  base: number;
  targetMs: number;
  bonusBasisPoints: number;
  dewdrops: number;
}
export interface CompletionReceipt {
  schemaVersion: 1;
  scored: boolean;
  id: string;
  generation: string;
  attemptId: string;
  puzzleId: string;
  groupId: string;
  definition: Definition;
  role: Role;
  policy: RewardPolicy;
  result: RewardResult;
  binding?: Frontier;
  grantId?: string;
}
export interface RoleRecord {
  generation: string;
  role: Role;
  revision: number;
  attemptId?: string;
  lastIntentSeq: number;
}
export interface AllocationIntent {
  id: string;
  generation: string;
  role: Role;
  sequence: number;
  expectedRoleRevision: number;
  previousAttemptId?: string;
  receiptId?: string;
  outcomeAttemptId?: string;
}
export interface PoolState {
  selectionVersion: '1';
  catalogVersion: string;
  pool: PoolId;
  revision: number;
  seed: number;
  epoch: number;
  cursor: number;
  lifetimeIssued: number;
  count: number;
  lastId?: string;
  lastOrdinal?: number;
}
export interface GenerationMeta {
  generation: string;
  essentialRevision: number;
}
export type StorageResult<T> = { kind: 'committed'; value: T } |
  { kind: 'conflict'; reason: 'generation' | 'revision' | 'owner' | 'role' | 'pool' | 'intent' | 'frontier' } |
  { kind: 'unavailable'; reason: 'blocked' | 'closed' | 'quota' | 'denied' | 'abort'; detail?: string } |
  { kind: 'corrupt'; reason: string } | { kind: 'unsupported-future'; reason: string };
