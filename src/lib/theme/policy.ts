/** Preference strings remain opaque in storage; resolution never rewrites them. */
export type ThemeId = 'pond' | 'cauldron';
export type AppearanceId = 'light' | 'dark';
export const THEME_CHOICES = ['auto', 'pond', 'cauldron'] as const;
export const APPEARANCE_CHOICES = ['system', 'light', 'dark'] as const;

/** Inclusive annual event dates in the device's local calendar, independent of DST. */
export function resolveTheme(choice: string, date: Date): ThemeId {
  if (choice === 'pond' || choice === 'cauldron') return choice;
  if (choice !== 'auto' || !Number.isFinite(date.getTime())) return 'pond';
  const month = date.getMonth(), day = date.getDate();
  return month === 9 && day >= 24 || month === 10 && day <= 7 ? 'cauldron' : 'pond';
}

export function resolveAppearance(choice: string, systemDark: boolean): AppearanceId {
  return choice === 'dark' || choice === 'system' && systemDark ? 'dark' : 'light';
}

/** Construct the next local date rather than adding a fixed 24-hour duration. */
export function nextLocalMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}
