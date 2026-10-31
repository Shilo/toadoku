import { createHash } from 'node:crypto';
export function sha256(bytes: string | Uint8Array): string { return createHash('sha256').update(bytes).digest('hex'); }
export const puzzleId = (givens: string) => sha256('toadodu:classic9:givens:v1\n' + givens);
export function normalizeDigits(grid: string): string {
  const mapping = new Map<string, string>(); let next = 1;
  return [...grid].map(d => d === '0' ? '0' : mapping.get(d) ?? (mapping.set(d, String(next++)), mapping.get(d)!)).join('');
}
export function d4(grid: string, transform: number): string {
  const out: string[] = Array(81);
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    let y = r, x = transform >= 4 ? 8 - c : c;
    for (let turn = 0; turn < transform % 4; turn++) [y, x] = [x, 8 - y];
    out[y * 9 + x] = grid[r * 9 + c];
  }
  return out.join('');
}
export function canonicalGivens(grid: string): string {
  return Array.from({ length: 8 }, (_, t) => normalizeDigits(d4(grid, t))).sort()[0];
}
export const groupId = (givens: string) => sha256('toadodu:classic9:d4-label:v1\n' + canonicalGivens(givens));
