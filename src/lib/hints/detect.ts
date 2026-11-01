import type { Conclusion, Deduction, Technique } from '../gameplay/contracts.ts';
import { CELL_UNITS, decodeBoard, getCandidates, UNITS } from '../sudoku/index.ts';

const ORDER: Technique[] = ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing'];
const digits = (mask: number) => Array.from({ length: 9 }, (_, n) => n + 1).filter(n => mask & (1 << (n - 1)));
function combinations<T>(items: readonly T[], count: number): T[][] {
  const result: T[][] = [];
  function choose(start: number, selected: T[]) {
    if (selected.length === count) { result.push(selected); return; }
    for (let i = start; i <= items.length - count + selected.length; i++) choose(i + 1, [...selected, items[i]]);
  }
  choose(0, []); return result;
}

/** Detector only. The compute boundary proves satisfiability before this can be disclosed. */
export function findDeduction(input: readonly number[], logicalRevision: number, only?: Technique): Deduction | undefined {
  const decoded = decodeBoard(input);
  if (!decoded.ok || !Number.isSafeInteger(logicalRevision) || logicalRevision < 0) return;
  const values = decoded.board;
  const masks = values.map((value, cell) => value ? 0 : getCandidates(values, cell));
  const sites = (unit: number, digit: number) => UNITS[unit].filter(cell => masks[cell] & (1 << (digit - 1)));
  function deduction(technique: Technique, units: number[], cells: number[], ds: number[], placements: Conclusion[], eliminations: Conclusion[]): Deduction {
    return { kind: 'deduction', technique, techniqueVersion: 1, logicalRevision, witness: { units, cells, digits: ds }, placements, eliminations };
  }
  function eliminations(cells: readonly number[], ds: number[]): Conclusion[] {
    return cells.flatMap(cell => ds.filter(digit => masks[cell] & (1 << (digit - 1))).map(digit => ({ cell, digit })));
  }
  // Explicit and normal requests share one supported-technique registry.
  for (const technique of only ? ORDER.filter(technique => technique === only) : ORDER) {
    if (technique === 'naked-single') {
      for (let cell = 0; cell < 81; cell++) {
        const ds = digits(masks[cell]);
        if (ds.length === 1) return deduction(technique, [], [cell], ds, [{ cell, digit: ds[0] }], []);
      }
    } else if (technique === 'hidden-single') {
      for (let unit = 0; unit < 27; unit++) for (let digit = 1; digit <= 9; digit++) {
        const cells = sites(unit, digit);
        if (cells.length === 1) return deduction(technique, [unit], cells, [digit], [{ cell: cells[0], digit }], []);
      }
    } else if (technique === 'pointing' || technique === 'claiming') {
      const sources = technique === 'pointing' ? Array.from({ length: 9 }, (_, i) => i + 18) : Array.from({ length: 18 }, (_, i) => i);
      for (const source of sources) for (let digit = 1; digit <= 9; digit++) {
        const cells = sites(source, digit);
        if (cells.length < 2 || cells.length > 3) continue;
        const targets = technique === 'pointing' ? CELL_UNITS[cells[0]].filter(unit => unit < 18) : CELL_UNITS[cells[0]].filter(unit => unit >= 18);
        for (const target of targets) if (cells.every(cell => UNITS[target].includes(cell))) {
          const removed = eliminations(UNITS[target].filter(cell => !UNITS[source].includes(cell)), [digit]);
          if (removed.length) return deduction(technique, [source, target], [...cells], [digit], [], removed);
        }
      }
    } else if (technique === 'naked-pair' || technique === 'naked-triple') {
      const size = technique === 'naked-pair' ? 2 : 3;
      for (let unit = 0; unit < 27; unit++) {
        const eligible = UNITS[unit].filter(cell => { const n = digits(masks[cell]).length; return n >= 2 && n <= size; });
        for (const cells of combinations(eligible, size)) {
          const ds = digits(cells.reduce((mask, cell) => mask | masks[cell], 0));
          if (ds.length !== size) continue;
          const removed = eliminations(UNITS[unit].filter(cell => !cells.includes(cell)), ds);
          if (removed.length) return deduction(technique, [unit], cells, ds, [], removed);
        }
      }
    } else if (technique === 'hidden-pair' || technique === 'hidden-triple') {
      const size = technique === 'hidden-pair' ? 2 : 3;
      for (let unit = 0; unit < 27; unit++) {
        const eligible = Array.from({ length: 9 }, (_, i) => i + 1).filter(digit => { const n = sites(unit, digit).length; return n >= 2 && n <= size; });
        for (const ds of combinations(eligible, size)) {
          const cells = [...new Set(ds.flatMap(digit => [...sites(unit, digit)]))].sort((a, b) => a - b);
          if (cells.length !== size) continue;
          const removed = eliminations(cells, Array.from({ length: 9 }, (_, i) => i + 1).filter(digit => !ds.includes(digit)));
          if (removed.length) return deduction(technique, [unit], cells, ds, [], removed);
        }
      }
    } else {
      // The closed registry leaves only X-Wing; new kinds must extend this dispatch.
      const kind: 'x-wing' = technique;
      for (const offset of [0, 9]) for (let digit = 1; digit <= 9; digit++) {
        const bases = Array.from({ length: 9 }, (_, n) => n + offset).filter(unit => sites(unit, digit).length === 2);
        for (const pair of combinations(bases, 2)) {
          const first = sites(pair[0], digit), second = sites(pair[1], digit);
          const cover = offset === 0 ? first.map(cell => 9 + cell % 9) : first.map(cell => Math.floor(cell / 9));
          // Two distinct sites in one row/column project to two distinct cover columns/rows.
          if (!second.every(cell => cover.some(unit => UNITS[unit].includes(cell)))) continue;
          const cells = [...first, ...second];
          const removed = eliminations(cover.flatMap(unit => UNITS[unit].filter(cell => !cells.includes(cell))), [digit]);
          if (removed.length) return deduction(kind, [...pair, ...cover], cells, [digit], [], removed);
        }
      }
    }
  }
}
