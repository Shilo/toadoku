import { expect, it } from 'vitest';
import { assertThemeFontInventory, THEME_FONT_BUDGET } from '../../tools/pwa/theme-packs';

it('requires every declared font, rejects hidden extra fonts and counts shared bytes only once', () => {
  const a = { path: 'assets/one.woff2', bytes: 12000, sha256: 'a' }, b = { path: 'assets/two.woff2', bytes: 9000, sha256: 'b' };
  const declared = new Set(['a', 'b']);
  expect(() => assertThemeFontInventory([a,b], declared)).not.toThrow();
  expect(() => assertThemeFontInventory([a], declared)).toThrow('Incomplete');
  expect(() => assertThemeFontInventory([a,b,{...a,path:'assets/alias.woff2'}], declared)).toThrow('duplicated');
  expect(() => assertThemeFontInventory([a,b,{...a,sha256:'unreviewed'}], declared)).toThrow('Undeclared');
  expect(() => assertThemeFontInventory([{...a,bytes:THEME_FONT_BUDGET},b], declared)).toThrow('oversized');
  expect(() => assertThemeFontInventory([{...a,bytes:NaN},b], declared)).toThrow();
});
