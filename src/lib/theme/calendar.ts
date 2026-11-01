import type { Locale } from '../i18n';
import type { ThemeId } from './policy';

/** Actual annual event date in the device's calendar. Month is 1-based. */
export interface AnnualThemeDate {
  readonly month: number;
  readonly day: number;
}
export interface AnnualThemeEvent {
  readonly id: string;
  readonly theme: ThemeId;
  readonly label: Readonly<Record<Locale, string>>;
  readonly date: AnnualThemeDate;
}
export interface ThemeEventOccurrence {
  readonly id: string;
  readonly label: Readonly<Record<Locale, string>>;
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export const DEFAULT_THEME: ThemeId = 'pond';
export const EVENT_DAYS_EACH_SIDE = 7;
/** Ordered metadata only. First active event wins; no theme implementation imports. */
export const THEME_EVENTS: readonly AnnualThemeEvent[] = [
  {
    id: 'halloween', theme: 'cauldron', label: { en: 'Halloween', de: 'Halloween', es: 'Halloween' },
    date: { month: 10, day: 31 },
  },
];

function occurrence(event: AnnualThemeEvent, year: number): ThemeEventOccurrence | undefined {
  const { month, day } = event.date;
  if (![month, day].every(Number.isInteger) || month < 1 || month > 12
    || day < 1 || day > new Date(year, month, 0).getDate()) return;
  // Derive each boundary from nominal calendar fields. Cloning an anchor whose
  // midnight was skipped by DST would incorrectly carry its normalized 01:00
  // into boundary dates where midnight exists.
  const startsAt = new Date(year, month - 1, day - EVENT_DAYS_EACH_SIDE);
  const endsAt = new Date(year, month - 1, day + EVENT_DAYS_EACH_SIDE);
  return { id: event.id, label: event.label, startsAt, endsAt };
}

/** Shared 14-calendar-day window: [event date - 7 days, event date + 7 days). */
export function resolveAutomaticTheme(now: Date, events: readonly AnnualThemeEvent[] = THEME_EVENTS): {
  themeId: ThemeId; event?: ThemeEventOccurrence;
} {
  const stamp = now.getTime(), year = now.getFullYear();
  if (!Number.isFinite(stamp)) return { themeId: DEFAULT_THEME };
  for (const event of events) {
    // Next year's January event may already be active in December, while last
    // year's December event may still be active in January.
    for (const eventYear of [year - 1, year, year + 1]) {
      const active = occurrence(event, eventYear);
      if (active && stamp >= active.startsAt.getTime() && stamp < active.endsAt.getTime()) return { themeId: event.theme, event: active };
    }
  }
  return { themeId: DEFAULT_THEME };
}

export function nextLocalMidnight(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}
