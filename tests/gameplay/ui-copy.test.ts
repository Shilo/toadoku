import { describe, expect, it } from 'vitest';
import { describeHint, formatElapsed, uiCopy } from '../../src/lib/gameplay/ui/copy';
import type { Deduction } from '../../src/lib/gameplay/contracts';
describe('gameplay surface copy', () => {
  it('has the same complete keys in all three locales and one displayed currency', () => {
    for (const locale of ['en', 'de', 'es'] as const) {
      expect(Object.keys(uiCopy[locale]).sort()).toEqual(Object.keys(uiCopy.en).sort());
      expect(Object.hasOwn(uiCopy[locale], 'score')).toBe(false);
      expect(uiCopy[locale].rewardHelp).not.toMatch(/score|puntos|Punkte/);
      for (const value of Object.values(uiCopy[locale])) if (typeof value === 'string') expect(value.length).toBeGreaterThan(0);
    }
    expect(formatElapsed(0)).toBe('0:00'); expect(formatElapsed(61_000)).toBe('1:01');
  });
  it('describes exact witness cells/digits/units and conclusions without extra answers', () => {
    const deduction: Deduction = { kind: 'deduction', technique: 'x-wing', techniqueVersion: 1, logicalRevision: 3, witness: { units: [0, 1, 9, 10], cells: [0, 1, 9, 10], digits: [7] }, placements: [], eliminations: [{ cell: 18, digit: 7 }] };
    for (const locale of ['en', 'de', 'es'] as const) {
      const description = describeHint(deduction, locale);
      expect(description.title).toBe('X-Wing'); expect(description.reason).toContain('7');
      expect(description.reason).toContain(uiCopy[locale].cell(1, 1));
      expect(description.reason).toContain(uiCopy[locale].unit(1, 1));
      expect(description.eliminations).toEqual([uiCopy[locale].answer(uiCopy[locale].cell(3, 1), 7)]);
      expect(description.placements).toEqual([]);
      expect(describeHint({ kind: 'reveal', logicalRevision: 3, cell: 80, digit: 9 }, locale).reason).toBe(uiCopy[locale].answer(uiCopy[locale].cell(9, 9), 9));
      expect(describeHint({ kind: 'inconsistent', logicalRevision: 3 }, locale).reason).toBe(uiCopy[locale].inconsistent);
    }
  });
});
