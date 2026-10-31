export const CELL_COUNT = 81;
export const ALL_DIGITS = 0x1ff;

const rows = Array.from({ length: 9 }, (_, row) => Array.from({ length: 9 }, (_, col) => row * 9 + col));
const columns = Array.from({ length: 9 }, (_, col) => Array.from({ length: 9 }, (_, row) => row * 9 + col));
const boxes = Array.from({ length: 9 }, (_, box) => Array.from({ length: 9 }, (_, offset) =>
  (Math.floor(box / 3) * 3 + Math.floor(offset / 3)) * 9 + box % 3 * 3 + offset % 3));

/** Unit IDs: rows 0..8, columns 9..17, boxes 18..26. */
export const UNITS: readonly (readonly number[])[] = Object.freeze(
  [...rows, ...columns, ...boxes].map(unit => Object.freeze(unit)));
export const CELL_UNITS: readonly (readonly number[])[] = Object.freeze(
  Array.from({ length: CELL_COUNT }, (_, cell) => Object.freeze([
    Math.floor(cell / 9), 9 + cell % 9,
    18 + Math.floor(cell / 27) * 3 + Math.floor(cell % 9 / 3),
  ])));
export const PEERS: readonly (readonly number[])[] = Object.freeze(
  CELL_UNITS.map((unitIds, cell) => Object.freeze(
    [...new Set(unitIds.flatMap(unit => UNITS[unit]))].filter(peer => peer !== cell).sort((a, b) => a - b))));

/** Notes/candidates use bits 0..8 for digits 1..9. */
export function digitBit(digit: number): number {
  if (!Number.isInteger(digit) || digit < 1 || digit > 9) throw new RangeError('Invalid digit');
  return 1 << (digit - 1);
}

export function assertCell(cell: number): void {
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELL_COUNT) throw new RangeError('Invalid cell');
}
