import type { Conclusion, Deduction } from '../gameplay/contracts.ts';

/**
 * Independently reconstructs witnesses with coordinates and sets, without detector/topology helpers.
 * This validates the named local inference. Satisfiability is a separate mandatory compute/test gate.
 */
export function validateWitness(values: readonly number[], deduction: Deduction): boolean {
  if (!Array.isArray(values) || values.length !== 81 || !deduction || deduction.kind !== 'deduction' || deduction.techniqueVersion !== 1 ||
      !Number.isSafeInteger(deduction.logicalRevision) || deduction.logicalRevision < 0) return false;
  for (let cell = 0; cell < 81; cell++) if (!Object.hasOwn(values, cell) || !Number.isInteger(values[cell]) || values[cell] < 0 || values[cell] > 9) return false;
  const row = (cell: number) => Math.floor(cell / 9), col = (cell: number) => cell % 9;
  const box = (cell: number) => Math.floor(row(cell) / 3) * 3 + Math.floor(col(cell) / 3);
  const house = (id: number) => Array.from({ length: 81 }, (_, n) => n).filter(n => id < 9 ? row(n) === id : id < 18 ? col(n) === id - 9 : box(n) === id - 18);
  const candidates = values.map((value, cell) => {
    const result = new Set<number>();
    if (!value) for (let digit = 1; digit <= 9; digit++) {
      let blocked = false;
      for (let other = 0; other < 81; other++) if (values[other] === digit && (row(other) === row(cell) || col(other) === col(cell) || box(other) === box(cell))) { blocked = true; break; }
      if (!blocked) result.add(digit);
    }
    return result;
  });
  const witness = deduction.witness;
  if (!witness) return false;
  const { units, cells, digits } = witness;
  const list = (items: unknown, limit: number, min: number) => {
    if (!Array.isArray(items) || items.length > limit || Object.keys(items).length !== items.length || new Set(items).size !== items.length) return false;
    for (let index = 0; index < items.length; index++) if (!Object.hasOwn(items, index) || !Number.isInteger(items[index]) || items[index] < min || items[index] >= limit + min) return false;
    return true;
  };
  if (!list(units, 27, 0) || !list(cells, 81, 0) || !list(digits, 9, 1)) return false;
  function conclusions(actual: Conclusion[], expected: Conclusion[]): boolean {
    if (!Array.isArray(actual) || actual.length !== expected.length) return false;
    const keys = actual.map(item => item && Number.isInteger(item.cell) && Number.isInteger(item.digit) ? `${item.cell}:${item.digit}` : 'invalid');
    return new Set(keys).size === keys.length && expected.every(item => keys.includes(`${item.cell}:${item.digit}`));
  }
  const removed = (targets: number[], ds: number[]) => targets.flatMap(cell => ds.filter(digit => candidates[cell].has(digit)).map(digit => ({ cell, digit })));
  const sites = (unit: number, digit: number) => house(unit).filter(cell => candidates[cell].has(digit));
  const same = (a: number[], b: number[]) => a.length === b.length && a.every(n => b.includes(n));
  const noPlacement = Array.isArray(deduction.placements) && deduction.placements.length === 0;
  const useful = Array.isArray(deduction.eliminations) && deduction.eliminations.length > 0;
  switch (deduction.technique) {
    case 'naked-single':
      return units.length === 0 && cells.length === 1 && digits.length === 1 && candidates[cells[0]].size === 1 && candidates[cells[0]].has(digits[0]) &&
        conclusions(deduction.placements, [{ cell: cells[0], digit: digits[0] }]) && conclusions(deduction.eliminations, []);
    case 'hidden-single':
      return units.length === 1 && cells.length === 1 && digits.length === 1 && same(sites(units[0], digits[0]), cells) &&
        conclusions(deduction.placements, [{ cell: cells[0], digit: digits[0] }]) && conclusions(deduction.eliminations, []);
    case 'pointing': case 'claiming': {
      if (units.length !== 2 || digits.length !== 1 || cells.length < 2 || cells.length > 3 || !noPlacement || !useful) return false;
      const [source, target] = units;
      if (deduction.technique === 'pointing' ? source < 18 || target >= 18 : source >= 18 || target < 18) return false;
      if (!same(sites(source, digits[0]), cells) || !cells.every(cell => house(target).includes(cell))) return false;
      return conclusions(deduction.eliminations, removed(house(target).filter(cell => !house(source).includes(cell)), digits));
    }
    case 'naked-pair': case 'naked-triple': {
      const size = deduction.technique === 'naked-pair' ? 2 : 3;
      if (units.length !== 1 || cells.length !== size || digits.length !== size || !noPlacement || !useful || !cells.every(cell => house(units[0]).includes(cell))) return false;
      if (!cells.every(cell => candidates[cell].size >= 2 && candidates[cell].size <= size && [...candidates[cell]].every(digit => digits.includes(digit)))) return false;
      if (!digits.every(digit => cells.some(cell => candidates[cell].has(digit)))) return false;
      return conclusions(deduction.eliminations, removed(house(units[0]).filter(cell => !cells.includes(cell)), digits));
    }
    case 'hidden-pair': case 'hidden-triple': {
      const size = deduction.technique === 'hidden-pair' ? 2 : 3;
      if (units.length !== 1 || cells.length !== size || digits.length !== size || !noPlacement || !useful || !cells.every(cell => house(units[0]).includes(cell))) return false;
      if (!digits.every(digit => { const locations = sites(units[0], digit); return locations.length >= 2 && locations.length <= size && locations.every(cell => cells.includes(cell)); })) return false;
      if (!cells.every(cell => digits.some(digit => candidates[cell].has(digit)))) return false;
      return conclusions(deduction.eliminations, removed(cells, Array.from({ length: 9 }, (_, n) => n + 1).filter(digit => !digits.includes(digit))));
    }
    case 'x-wing': {
      if (units.length !== 4 || cells.length !== 4 || digits.length !== 1 || !noPlacement || !useful) return false;
      const bases = units.slice(0, 2), covers = units.slice(2);
      if (!(bases.every(u => u < 9) && covers.every(u => u >= 9 && u < 18) || bases.every(u => u >= 9 && u < 18) && covers.every(u => u < 9))) return false;
      const actualCells = bases.flatMap(unit => sites(unit, digits[0]));
      if (!bases.every(unit => sites(unit, digits[0]).length === 2) || !same(actualCells, cells) ||
          !actualCells.every(cell => covers.some(unit => house(unit).includes(cell))) || !covers.every(unit => actualCells.some(cell => house(unit).includes(cell)))) return false;
      return conclusions(deduction.eliminations, removed(covers.flatMap(unit => house(unit).filter(cell => !cells.includes(cell))), digits));
    }
    default: return false;
  }
}
