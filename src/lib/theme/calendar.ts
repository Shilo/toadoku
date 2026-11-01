import type { Locale } from '../i18n';
import type { ThemeId } from './policy';

/** Device-local annual boundary. Month is 1-based; omitted time means midnight. */
export interface AnnualThemeTime {
  readonly month: number;
  readonly day: number;
  readonly hour?: number;
  readonly minute?: number;
}
export interface AnnualThemeEvent {
  readonly id: string;
  readonly theme: ThemeId;
  readonly label: Readonly<Record<Locale, string>>;
  readonly start: AnnualThemeTime;
  readonly end: AnnualThemeTime;
}
export interface ThemeEventOccurrence {
  readonly id: string;
  readonly label: Readonly<Record<Locale, string>>;
  readonly startsAt: Date;
  readonly endsAt: Date;
}

export const DEFAULT_THEME: ThemeId = 'pond';
/** Ordered metadata only. First active event wins; no theme implementation imports. */
export const THEME_EVENTS: readonly AnnualThemeEvent[] = [
  {
    id: 'halloween', theme: 'cauldron', label: { en: 'Halloween', de: 'Halloween', es: 'Halloween' },
    start: { month: 10, day: 24 }, end: { month: 11, day: 8 },
  },
];

const nominalTime = (time: AnnualThemeTime) => ((time.month * 32 + time.day) * 24 + (time.hour ?? 0)) * 60 + (time.minute ?? 0);
function localTime(year: number, time: AnnualThemeTime): Date | undefined {
  const { month, day, hour = 0, minute = 0 } = time;
  if (![month, day, hour, minute].every(Number.isInteger) || month < 1 || month > 12
    || day < 1 || day > new Date(year, month, 0).getDate() || hour < 0 || hour > 23 || minute < 0 || minute > 59) return;
  // Native local Date disambiguation handles DST gaps/folds. Invalid calendar
  // dates were checked separately, so February 29 never rolls into March.
  return new Date(year, month - 1, day, hour, minute);
}
function occurrence(event: AnnualThemeEvent, year: number): ThemeEventOccurrence | undefined {
  const start = nominalTime(event.start), end = nominalTime(event.end);
  if (start === end) return;
  const startsAt = localTime(year, event.start), endsAt = localTime(year + (end < start ? 1 : 0), event.end);
  if (!startsAt || !endsAt || !(startsAt.getTime() < endsAt.getTime())) return;
  return { id: event.id, label: event.label, startsAt, endsAt };
}

/** Start inclusive, end exclusive; windows crossing New Year repeat as one event. */
export function resolveAutomaticTheme(now: Date, events: readonly AnnualThemeEvent[] = THEME_EVENTS): {
  themeId: ThemeId; event?: ThemeEventOccurrence;
} {
  const stamp = now.getTime(), year = now.getFullYear();
  if (!Number.isFinite(stamp)) return { themeId: DEFAULT_THEME };
  for (const event of events) {
    for (const startYear of [year - 1, year]) {
      const active = occurrence(event, startYear);
      if (active && stamp >= active.startsAt.getTime() && stamp < active.endsAt.getTime()) return { themeId: event.theme, event: active };
    }
  }
  return { themeId: DEFAULT_THEME };
}

export function nextLocalMidnight(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

/** Wake at an intraday boundary or next local midnight, whichever is sooner.
 * Adjacent occurrences suffice for this daily-bounded search, including New Year. */
export function nextThemeRefresh(now: Date, events: readonly AnnualThemeEvent[] = THEME_EVENTS): Date {
  const stamp = now.getTime(), year = now.getFullYear();
  let next = nextLocalMidnight(now).getTime();
  for (const event of events) for (const startYear of [year - 1, year, year + 1]) {
    const candidate = occurrence(event, startYear);
    if (!candidate) continue;
    for (const boundary of [candidate.startsAt, candidate.endsAt]) {
      const time = boundary.getTime();
      if (time > stamp && time < next) next = time;
    }
  }
  return new Date(next);
}
