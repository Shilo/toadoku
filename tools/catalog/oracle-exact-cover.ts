/** Independent Algorithm X/DLX oracle. No production Sudoku topology or predicates. */
export type ExactCoverResult = { kind: 'complete'; count: 0 | 1 | 2; solution?: string; nodes: number }
  | { kind: 'invalid'; reason: string } | { kind: 'unknown' | 'aborted'; nodes: number };
const CAPACITY = 1 + 324 + 729 * 4;
function template() {
  const left = new Int32Array(CAPACITY), right = new Int32Array(CAPACITY);
  const up = new Int32Array(CAPACITY), down = new Int32Array(CAPACITY);
  const column = new Int32Array(CAPACITY), size = new Int32Array(325), assignment = new Int32Array(CAPACITY);
  const rowNode = new Int32Array(729);
  for (let h = 0; h <= 324; h++) {
    left[h] = h - 1; right[h] = h + 1; up[h] = h; down[h] = h;
  }
  left[0] = 324; right[324] = 0;
  let node = 325;
  for (let row = 0; row < 9; row++) for (let col = 0; col < 9; col++) for (let digit = 0; digit < 9; digit++) {
    const a = (row * 9 + col) * 9 + digit;
    const constraints = [row * 9 + col, 81 + row * 9 + digit, 162 + col * 9 + digit,
      243 + (Math.floor(row / 3) * 3 + Math.floor(col / 3)) * 9 + digit];
    const first = node; rowNode[a] = first;
    for (const constraint of constraints) {
      const h = constraint + 1;
      column[node] = h; assignment[node] = a;
      up[node] = up[h]; down[node] = h; down[up[h]] = node; up[h] = node; size[h]++;
      left[node] = node === first ? first + 3 : node - 1;
      right[node] = node === first + 3 ? first : node + 1;
      node++;
    }
  }
  return { left, right, up, down, column, size, assignment, rowNode };
}
const BASE = template();
export function exactCover(givens: unknown, options: { nodeBudget?: number; shouldAbort?: () => boolean } = {}): ExactCoverResult {
  if (typeof givens !== 'string' || !/^[0-9]{81}$/.test(givens)) return { kind: 'invalid', reason: 'grid' };
  const budget = options.nodeBudget ?? 10_000_000;
  if (!Number.isSafeInteger(budget) || budget < 0 || (options.shouldAbort !== undefined && typeof options.shouldAbort !== 'function')) return { kind: 'invalid', reason: 'options' };
  const { column, assignment, rowNode } = BASE;
  const left = BASE.left.slice(), right = BASE.right.slice(), up = BASE.up.slice(), down = BASE.down.slice(), size = BASE.size.slice();
  const covered = new Uint8Array(325), chosen: number[] = [];
  function cover(h: number) {
    covered[h] = 1; right[left[h]] = right[h]; left[right[h]] = left[h];
    for (let i = down[h]; i !== h; i = down[i]) for (let j = right[i]; j !== i; j = right[j]) {
      down[up[j]] = down[j]; up[down[j]] = up[j]; size[column[j]]--;
    }
  }
  function uncover(h: number) {
    for (let i = up[h]; i !== h; i = up[i]) for (let j = left[i]; j !== i; j = left[j]) {
      size[column[j]]++; down[up[j]] = j; up[down[j]] = j;
    }
    right[left[h]] = h; left[right[h]] = h; covered[h] = 0;
  }
  for (let cell = 0; cell < 81; cell++) {
    const digit = Number(givens[cell]);
    if (!digit) continue;
    const n = rowNode[cell * 9 + digit - 1];
    let j = n;
    do { if (covered[column[j]]) return { kind: 'invalid', reason: 'duplicate clue' }; j = right[j]; } while (j !== n);
    chosen.push(assignment[n]); j = n;
    do { cover(column[j]); j = right[j]; } while (j !== n);
  }
  let count: 0 | 1 | 2 = 0, solution: string | undefined, nodes = 0;
  let stopped: 'unknown' | 'aborted' | undefined;
  function search() {
    try { if (options.shouldAbort?.()) { stopped = 'aborted'; return; } }
    catch { stopped = 'unknown'; return; }
    if (nodes >= budget) { stopped = 'unknown'; return; }
    nodes++;
    if (right[0] === 0) {
      count = count === 0 ? 1 : 2;
      if (!solution) {
        const values = Array<string>(81).fill('0');
        for (const a of chosen) values[Math.floor(a / 9)] = String(a % 9 + 1);
        solution = values.join('');
      }
      return;
    }
    let h = right[0];
    for (let c = right[h]; c !== 0; c = right[c]) if (size[c] < size[h]) h = c;
    if (size[h] === 0) return;
    cover(h);
    for (let r = down[h]; r !== h; r = down[r]) {
      chosen.push(assignment[r]);
      for (let j = right[r]; j !== r; j = right[j]) cover(column[j]);
      search();
      for (let j = left[r]; j !== r; j = left[j]) uncover(column[j]);
      chosen.pop();
      if (count === 2 || stopped) break;
    }
    uncover(h);
  }
  search();
  return stopped ? { kind: stopped, nodes } : { kind: 'complete', count, ...(solution ? { solution } : {}), nodes };
}
/** Separate direct unit checks, intentionally independent from exact-cover acceptance. */
export function independentlyValidSolution(givens: string, solution: string): boolean {
  if (!/^[0-9]{81}$/.test(givens) || !/^[1-9]{81}$/.test(solution)) return false;
  for (let cell = 0; cell < 81; cell++) if (givens[cell] !== '0' && givens[cell] !== solution[cell]) return false;
  for (let u = 0; u < 9; u++) {
    const row = new Set<string>(), col = new Set<string>(), box = new Set<string>();
    for (let k = 0; k < 9; k++) {
      row.add(solution[u * 9 + k]); col.add(solution[k * 9 + u]);
      box.add(solution[(Math.floor(u / 3) * 3 + Math.floor(k / 3)) * 9 + (u % 3) * 3 + k % 3]);
    }
    if (row.size !== 9 || col.size !== 9 || box.size !== 9) return false;
  }
  return true;
}
