/** Rules use 0 for empty; all public boundaries validate rather than trust this alias. */
export type Board = readonly number[];
export type DecodeResult = { ok: true; board: Board } | { ok: false; reason: string };
export type UnitKind = 'row' | 'column' | 'box';
export interface Conflict {
  readonly unit: number;
  readonly kind: UnitKind;
  readonly index: number;
  readonly digit: number;
  readonly cells: readonly number[];
}
export interface SolverOptions {
  readonly nodeBudget?: number;
  /** Checked synchronously. UI jobs need a worker/request identity for real cancellation. */
  readonly shouldAbort?: () => boolean;
}
export type CountResult =
  | { kind: 'complete'; count: 0 | 1 | 2; solution?: Board; nodes: number }
  | { kind: 'invalid'; reason: string }
  | { kind: 'aborted'; nodes: number }
  | { kind: 'unknown'; reason: 'budget' | 'callback'; nodes: number };
