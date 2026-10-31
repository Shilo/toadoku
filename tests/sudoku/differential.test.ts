import { expect, it } from 'vitest';
import { countSolutions } from '../../src/lib/sudoku/index.ts';
import { exactCover, independentlyValidSolution } from '../../tools/catalog/oracle-exact-cover.ts';

it('agrees with structurally independent Algorithm X on original generated boards', () => {
  let seed = 0x91de;
  const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  const solved = Array.from({ length: 81 }, (_, cell) => (Math.floor(cell / 9) * 3 + Math.floor(cell / 27) + cell % 9) % 9 + 1);
  for (let sample = 0; sample < 1000; sample++) {
    const remove = sample % 82;
    const cells = Array.from({ length: 81 }, (_, cell) => cell);
    for (let index = cells.length - 1; index > 0; index--) {
      const swap = next() % (index + 1); [cells[index], cells[swap]] = [cells[swap], cells[index]];
    }
    const board = solved.slice();
    for (const cell of cells.slice(0, remove)) board[cell] = 0;
    // Both legitimate subsets and deliberate contradictory/maybe-unsatisfiable edits.
    if (sample % 7 === 0) board[next() % 81] = next() % 9 + 1;
    const input = board.join('');
    const mrv = countSolutions(board, { nodeBudget: 1000000 });
    const dlx = exactCover(input, { nodeBudget: 1000000 });
    expect(mrv.kind, `MRV sample=${sample}`).toBe(dlx.kind);
    if (mrv.kind === 'complete' && dlx.kind === 'complete') {
      expect(mrv.count, `sample=${sample} input=${input}`).toBe(dlx.count);
      if (mrv.solution) expect(independentlyValidSolution(input, mrv.solution.join(''))).toBe(true);
      if (dlx.solution) expect(independentlyValidSolution(input, dlx.solution)).toBe(true);
      if (mrv.count === 1) expect(mrv.solution?.join('')).toBe(dlx.solution);
    } else expect(['invalid']).toContain(mrv.kind); // unknown is not a certified comparison
  }
}, 120000);
