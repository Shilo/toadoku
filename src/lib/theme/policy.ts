import { DEFAULT_THEME, resolveAutomaticTheme } from './calendar';
export { nextLocalMidnight } from './calendar';

/** Preference strings remain opaque in storage; resolution never rewrites them. */
export type ThemeId = 'pond' | 'cauldron';
export type AppearanceId = 'light' | 'dark';
export const THEME_CHOICES = ['auto', 'pond', 'cauldron'] as const;
export const APPEARANCE_CHOICES = ['system', 'light', 'dark'] as const;

/** Explicit choices bypass the annual Auto schedule without rewriting preferences. */
export function resolveTheme(choice: string, date: Date): ThemeId {
  if (choice === 'pond' || choice === 'cauldron') return choice;
  return choice === 'auto' ? resolveAutomaticTheme(date).themeId : DEFAULT_THEME;
}

export function resolveAppearance(choice: string, systemDark: boolean): AppearanceId {
  return choice === 'dark' || choice === 'system' && systemDark ? 'dark' : 'light';
}
