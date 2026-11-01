import type { ThemeId } from '../../src/lib/theme/policy.ts';

/** Current small themes are complete offline; new themes/fonts require explicit review. */
export const OFFLINE_THEME_PACKS = {
  pond: { fonts: ['Almendra-UI-Regular.woff2', 'Almendra-UI-Bold.woff2'], notices: ['Almendra-OFL.txt', 'Chewy-LICENSE.txt'] },
  cauldron: { fonts: ['GermaniaOne-UI.woff2'], notices: ['GermaniaOne-OFL.txt', 'Creepster-OFL.txt'] },
} satisfies Record<ThemeId, { fonts: readonly string[]; notices: readonly string[] }>;
export const SHARED_OFFLINE_FONTS = ['Outfit-Solving.woff2'];
export const THEME_FONT_BUDGET = 64 * 1024;

export function assertThemeFontInventory(fonts: readonly { path: string; bytes: number; sha256: string }[], declared: ReadonlySet<string>): void {
  const seen = new Set<string>(); let total = 0;
  for (const font of fonts) {
    if (!declared.has(font.sha256) || seen.has(font.sha256) || !Number.isSafeInteger(font.bytes) || font.bytes < 1) throw new Error('Undeclared or duplicated offline font');
    seen.add(font.sha256); total += font.bytes;
  }
  if (seen.size !== declared.size || total > THEME_FONT_BUDGET) throw new Error('Incomplete or oversized offline font packs');
}
