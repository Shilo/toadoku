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
it('has complete dictionaries and safe browser locale defaults', () => {
  expect(resolveLocale('de-DE')).toBe('de'); expect(resolveLocale('fr-FR')).toBe('en');
  for(const copy of Object.values(dictionaries)) expect(Object.keys(copy).sort()).toEqual(Object.keys(dictionaries.en).sort());
});
