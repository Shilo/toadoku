import type { Conclusion, Deduction } from '../gameplay/contracts.ts';

/**
 * Independently reconstructs witnesses with coordinates and sets, without detector/topology helpers.
 * This validates the named local inference. Satisfiability is a separate mandatory compute/test gate.
 */
export function validateWitness(values: readonly number[], deduction: Deduction): boolean {
  if (!Array.isArray(values) || values.length !== 81 || Reflect.ownKeys(values).length !== 82 || !deduction || deduction.kind !== 'deduction' || deduction.techniqueVersion !== 1 ||
      !Number.isSafeInteger(deduction.logicalRevision) || deduction.logicalRevision < 0) return false;
  const board: number[] = Array(81);
  for (let cell = 0; cell < 81; cell++) {
    const value = values[cell];
    if (!Object.prototype.propertyIsEnumerable.call(values, cell) || !Number.isInteger(value) || value < 0 || value > 9) return false;
    board[cell] = value;
  }
  const row = (cell: number) => Math.floor(cell / 9), col = (cell: number) => cell % 9;
  const box = (cell: number) => Math.floor(row(cell) / 3) * 3 + Math.floor(col(cell) / 3);
  const house = (id: number) => Array.from({ length: 81 }, (_, n) => n).filter(n => id < 9 ? row(n) === id : id < 18 ? col(n) === id - 9 : box(n) === id - 18);
  const candidates = board.map((value, cell) => {
    const result = new Set<number>();
    if (!value) for (let digit = 1; digit <= 9; digit++) {
      let blocked = false;
      for (let other = 0; other < 81; other++) if (board[other] === digit && (row(other) === row(cell) || col(other) === col(cell) || box(other) === box(cell))) { blocked = true; break; }
      if (!blocked) result.add(digit);
    }
    return result;
  });
  const witness = deduction.witness;
  if (!witness) return false;
  const list = (items: unknown, limit: number, min: number): number[] | undefined => {
    if (!Array.isArray(items) || items.length > limit || Reflect.ownKeys(items).length !== items.length + 1) return;
    const copy: number[] = [], seen = new Set<number>();
    for (let index = 0; index < items.length; index++) {
      const value = items[index];
      if (!Object.prototype.propertyIsEnumerable.call(items, index) || !Number.isInteger(value) || value < min || value >= limit + min || seen.has(value)) return;
      seen.add(value); copy.push(value);
    }
    return copy;
  };
  const units = list(witness.units, 27, 0), cells = list(witness.cells, 81, 0), digits = list(witness.digits, 9, 1);
  if (!units || !cells || !digits) return false;
  const conclusionList = (items: unknown): Conclusion[] | undefined => {
    if (!Array.isArray(items) || items.length > 729 || Reflect.ownKeys(items).length !== items.length + 1) return;
    const copy: Conclusion[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!Object.prototype.propertyIsEnumerable.call(items, index) || !item || typeof item !== 'object') return;
      const cell = item.cell, digit = item.digit;
      if (!Number.isInteger(cell) || cell < 0 || cell > 80 || !Number.isInteger(digit) || digit < 1 || digit > 9) return;
      copy.push({ cell, digit });
    }
    return copy;
  };
  const placements = conclusionList(deduction.placements), eliminations = conclusionList(deduction.eliminations);
  if (!placements || !eliminations) return false;
  function conclusions(actual: Conclusion[], expected: Conclusion[]): boolean {
    if (actual.length !== expected.length) return false;
    const keys = actual.map(item => `${item.cell}:${item.digit}`);
    return new Set(keys).size === keys.length && expected.every(item => keys.includes(`${item.cell}:${item.digit}`));
  }
  const removed = (targets: number[], ds: number[]) => targets.flatMap(cell => ds.filter(digit => candidates[cell].has(digit)).map(digit => ({ cell, digit })));
  const sites = (unit: number, digit: number) => house(unit).filter(cell => candidates[cell].has(digit));
  const same = (a: number[], b: number[]) => a.length === b.length && a.every(n => b.includes(n));
  const noPlacement = placements.length === 0;
  const useful = eliminations.length > 0;
  switch (deduction.technique) {
    case 'naked-single':
      return units.length === 0 && cells.length === 1 && digits.length === 1 && candidates[cells[0]].size === 1 && candidates[cells[0]].has(digits[0]) &&
        conclusions(placements, [{ cell: cells[0], digit: digits[0] }]) && conclusions(eliminations, []);
    case 'hidden-single':
      return units.length === 1 && cells.length === 1 && digits.length === 1 && same(sites(units[0], digits[0]), cells) &&
        conclusions(placements, [{ cell: cells[0], digit: digits[0] }]) && conclusions(eliminations, []);
    case 'pointing': case 'claiming': {
      if (units.length !== 2 || digits.length !== 1 || cells.length < 2 || cells.length > 3 || !noPlacement || !useful) return false;
      const [source, target] = units;
      if (deduction.technique === 'pointing' ? source < 18 || target >= 18 : source >= 18 || target < 18) return false;
      if (!same(sites(source, digits[0]), cells) || !cells.every(cell => house(target).includes(cell))) return false;
      return conclusions(eliminations, removed(house(target).filter(cell => !house(source).includes(cell)), digits));
    }
    case 'naked-pair': case 'naked-triple': {
      const size = deduction.technique === 'naked-pair' ? 2 : 3;
      if (units.length !== 1 || cells.length !== size || digits.length !== size || !noPlacement || !useful || !cells.every(cell => house(units[0]).includes(cell))) return false;
      if (!cells.every(cell => candidates[cell].size >= 2 && candidates[cell].size <= size && [...candidates[cell]].every(digit => digits.includes(digit)))) return false;
      if (!digits.every(digit => cells.some(cell => candidates[cell].has(digit)))) return false;
      return conclusions(eliminations, removed(house(units[0]).filter(cell => !cells.includes(cell)), digits));
    }
    case 'hidden-pair': case 'hidden-triple': {
      const size = deduction.technique === 'hidden-pair' ? 2 : 3;
      if (units.length !== 1 || cells.length !== size || digits.length !== size || !noPlacement || !useful || !cells.every(cell => house(units[0]).includes(cell))) return false;
      if (!digits.every(digit => { const locations = sites(units[0], digit); return locations.length >= 2 && locations.length <= size && locations.every(cell => cells.includes(cell)); })) return false;
      if (!cells.every(cell => digits.some(digit => candidates[cell].has(digit)))) return false;
      return conclusions(eliminations, removed(cells, Array.from({ length: 9 }, (_, n) => n + 1).filter(digit => !digits.includes(digit))));
    }
    case 'x-wing': {
      if (units.length !== 4 || cells.length !== 4 || digits.length !== 1 || !noPlacement || !useful) return false;
      const bases = units.slice(0, 2), covers = units.slice(2);
      if (!(bases.every(u => u < 9) && covers.every(u => u >= 9 && u < 18) || bases.every(u => u >= 9 && u < 18) && covers.every(u => u < 9))) return false;
      const actualCells = bases.flatMap(unit => sites(unit, digits[0]));
      if (!bases.every(unit => sites(unit, digits[0]).length === 2) || !same(actualCells, cells) ||
          !actualCells.every(cell => covers.some(unit => house(unit).includes(cell))) || !covers.every(unit => actualCells.some(cell => house(unit).includes(cell)))) return false;
      return conclusions(eliminations, removed(covers.flatMap(unit => house(unit).filter(cell => !cells.includes(cell))), digits));
    }
    default: return false;
  }
}
