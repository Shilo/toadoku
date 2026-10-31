import { expect, it } from 'vitest';
import { createLayout } from '../src/lib/layout';
import { example, moveCell } from '../src/lib/fixture';
import { dictionaries, resolveLocale } from '../src/lib/i18n';

it('allocates all remaining space, exact gaps, inward square anchors and stable IDs', () => {
  for (const [w,h] of [[344,784],[784,344],[377,857],[857,377],[1264,704],[600,600]]) {
    const l = createLayout(w,h);
    expect(l.cells).toHaveLength(81); expect(new Set(l.cells.map(c => c.id)).size).toBe(81);
    expect(l.landscape ? l.dock.x - l.board.width : l.dock.y - l.board.height).toBeCloseTo(8);
    expect(l.landscape ? l.dock.x + l.dock.width : l.dock.y + l.dock.height).toBeCloseTo(l.landscape ? w : h);
    for (const c of l.cells) {
      expect(c.anchor.width).toBe(c.anchor.height);
      expect(c.anchor.x).toBeGreaterThanOrEqual(c.rect.x - .001);
      expect(c.anchor.y).toBeGreaterThanOrEqual(c.rect.y - .001);
      if (c.column < 8) expect(l.cells[c.id+1].rect.x - c.rect.x - c.rect.width).toBeCloseTo(c.column%3===2 ? 8 : 4);
      if (c.row < 8) expect(l.cells[c.id+9].rect.y - c.rect.y - c.rect.height).toBeCloseTo(c.row%3===2 ? 8 : 4);
    }
  }
});
it('keeps immutable example and logical keyboard edges', () => {
  expect(Object.isFrozen(example)).toBe(true); expect(example).toHaveLength(81);
  expect(moveCell(8,'ArrowRight')).toBe(8); expect(moveCell(9,'ArrowLeft')).toBe(9);
  expect(moveCell(80,'ArrowUp')).toBe(71); expect(moveCell(40,'Home')).toBe(36);
});
it('anchors Square to the unchanged dock and centers on the perpendicular axis', () => {
  for (const [w,h] of [[344,784],[784,344],[377,857],[857,377],[304,552],[1264,704],[704,984],[600,600]]) {
    const fill = createLayout(w,h), square = createLayout(w,h,'square');
    expect(square.allocation).toEqual(fill.board);
    expect(square.dock).toEqual(fill.dock);
    expect(square.board.width).toBe(square.board.height);
    expect(square.landscape ? square.dock.x - square.board.x - square.board.width : square.dock.y - square.board.y - square.board.height).toBeCloseTo(8);
    expect(square.landscape ? square.board.y * 2 + square.board.height : square.board.x * 2 + square.board.width).toBeCloseTo(square.landscape ? square.allocation.height : square.allocation.width);
    for (const cell of square.cells) {
      expect(cell.id).toBe(fill.cells[cell.id].id);
      expect(cell.rect.width).toBeCloseTo(cell.rect.height);
      expect(cell.rect.x).toBeGreaterThanOrEqual(square.board.x);
      expect(cell.rect.y).toBeGreaterThanOrEqual(square.board.y);
      expect(cell.rect.x + cell.rect.width).toBeLessThanOrEqual(square.board.x + square.board.width + .0001);
      expect(cell.rect.y + cell.rect.height).toBeLessThanOrEqual(square.board.y + square.board.height + .0001);
      if (cell.column<8) expect(square.cells[cell.id+1].rect.x-cell.rect.x-cell.rect.width).toBeCloseTo(cell.column%3===2?8:4);
      if (cell.row<8) expect(square.cells[cell.id+9].rect.y-cell.rect.y-cell.rect.height).toBeCloseTo(cell.row%3===2?8:4);
    }
  }
});
it('has complete dictionaries and safe browser locale defaults', () => {
  expect(resolveLocale('de-DE')).toBe('de'); expect(resolveLocale('fr-FR')).toBe('en');
  for(const copy of Object.values(dictionaries)) expect(Object.keys(copy).sort()).toEqual(Object.keys(dictionaries.en).sort());
});
