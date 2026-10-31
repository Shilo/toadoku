const rows = ['530070000', '600195000', '098000060', '800060003', '400803001', '700020006', '060000280', '000419005', '000080079'];
export const example = Object.freeze(rows.flatMap(row => [...row].map(Number)));
export const noteCell = 42;
export const exampleNotes = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8, 9]);

export function moveCell(id: number, key: string): number {
  const row = Math.floor(id / 9), col = id % 9;
  switch (key) {
    case 'ArrowLeft': return row * 9 + Math.max(0, col - 1);
    case 'ArrowRight': return row * 9 + Math.min(8, col + 1);
    case 'ArrowUp': return Math.max(0, row - 1) * 9 + col;
    case 'ArrowDown': return Math.min(8, row + 1) * 9 + col;
    case 'Home': return row * 9;
    case 'End': return row * 9 + 8;
    default: return id;
  }
}
