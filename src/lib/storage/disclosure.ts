import type { Attempt, Disclosure, StorageResult } from '../gameplay/contracts';
import { countSolutions } from '../sudoku';
import type { SolverOptions } from '../sudoku';
import { validateWitness } from '../hints';
import { compositeBoard } from './backup';
import { validateDisclosureAnswers } from './decode';
import { storageFailure } from './transaction';

/** Run outside write transactions. Unknown is technical failure, never useful information. */
export function validateDisclosureProof(attempt: Attempt, disclosure: Disclosure, options: SolverOptions = {}): StorageResult<true> {
  try { validateDisclosureAnswers(attempt.definition, disclosure); } catch (error) { return storageFailure(error).issue; }
  if (disclosure.payload.kind === 'reveal') return { kind: 'committed', value: true };
  const values = compositeBoard(attempt);
  const requested = options.nodeBudget;
  const nodeBudget = requested === undefined ? 1_000_000
    : Number.isSafeInteger(requested) && requested >= 0 ? Math.min(requested, 1_000_000) : requested;
  const solvability = countSolutions(values, { ...options, nodeBudget });
  if (solvability.kind === 'unknown' || solvability.kind === 'aborted') return { kind: 'unavailable', reason: 'abort', detail: 'hint-preflight-budget' };
  if (solvability.kind === 'invalid' && solvability.reason !== 'contradictory-clues') return { kind: 'unavailable', reason: 'abort', detail: 'hint-preflight-invalid' };
  const inconsistent = solvability.kind === 'invalid' || solvability.count === 0;
  if (disclosure.payload.kind === 'inconsistent' ? !inconsistent : inconsistent || !validateWitness(values, disclosure.payload)) {
    return { kind: 'corrupt', reason: 'hint-preflight-proof' };
  }
  return { kind: 'committed', value: true };
}
