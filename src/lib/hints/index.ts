import type { HintPayload } from '../gameplay/contracts.ts';
import { countSolutions, decodeBoard } from '../sudoku/index.ts';
import type { SolverOptions } from '../sudoku/index.ts';
import { findDeduction } from './detect.ts';
import { validateWitness } from './witness.ts';
export { findDeduction, validateWitness };

export interface HintInput { values: readonly number[]; givens: readonly number[]; logicalRevision: number; target: number }
export type HintResult = { kind: 'ready'; payload: HintPayload } |
  { kind: 'unavailable'; reason: 'invalid' | 'aborted' | 'budget' | 'callback' | 'no-target' | 'full' };

/** The caller must durably record assistance before displaying any ready payload. */
export function computeHint(input: HintInput, options: SolverOptions = {}): HintResult {
  const values = decodeBoard(input.values), givens = decodeBoard(input.givens);
  if (!values.ok || !givens.ok || !Number.isSafeInteger(input.logicalRevision) || input.logicalRevision < 0 ||
      !Number.isInteger(input.target) || input.target < 0 || input.target >= 81 ||
      givens.board.some((digit, cell) => digit !== 0 && digit !== values.board[cell])) return { kind: 'unavailable', reason: 'invalid' };
  const checked = countSolutions(values.board, options);
  if (checked.kind === 'aborted') return { kind: 'unavailable', reason: 'aborted' };
  if (checked.kind === 'unknown') return { kind: 'unavailable', reason: checked.reason };
  if (checked.kind === 'invalid') return checked.reason === 'contradictory-clues' ?
    { kind: 'ready', payload: { kind: 'inconsistent', logicalRevision: input.logicalRevision } } : { kind: 'unavailable', reason: 'invalid' };
  if (checked.count === 0) return { kind: 'ready', payload: { kind: 'inconsistent', logicalRevision: input.logicalRevision } };
  if (!values.board.includes(0)) return { kind: 'unavailable', reason: 'full' };
  const deduction = findDeduction(values.board, input.logicalRevision);
  if (deduction) return validateWitness(values.board, deduction) ? { kind: 'ready', payload: deduction } : { kind: 'unavailable', reason: 'invalid' };
  if (givens.board[input.target] !== 0 || values.board[input.target] !== 0) return { kind: 'unavailable', reason: 'no-target' };
  // A reveal must use the original unique puzzle, never an arbitrary solution of an ambiguous
  // partial player state. Rechecking original givens avoids depending on untrusted player notes.
  const original = countSolutions(givens.board, options);
  if (original.kind === 'aborted') return { kind: 'unavailable', reason: 'aborted' };
  if (original.kind === 'unknown') return { kind: 'unavailable', reason: original.reason };
  if (original.kind !== 'complete' || original.count !== 1 || !original.solution) return { kind: 'unavailable', reason: 'invalid' };
  return { kind: 'ready', payload: { kind: 'reveal', logicalRevision: input.logicalRevision, cell: input.target, digit: original.solution[input.target] } };
}
