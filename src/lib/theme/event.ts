import type { Locale } from '../i18n';
import { themeCopy } from './copy';
import type { ThemeId } from './policy';
import { resolveAutomaticTheme, type AnnualThemeEvent } from './calendar';

export interface EventRemaining {
  readonly days: number;
  readonly hours: number;
  readonly lessThanHour: boolean;
}
export interface AutomaticThemeStatus {
  readonly activeId?: ThemeId;
  readonly expectedId: ThemeId;
  readonly phase: 'ready' | 'loading' | 'error';
  readonly event?: {
    readonly id: string;
    readonly label: Readonly<Record<Locale, string>>;
    readonly endsAt: Date;
    readonly remaining: EventRemaining;
  };
}

const HOUR_MS = 60 * 60 * 1000;

/** Calendar policy chooses the deadline; displayed days are 24-hour durations.
 * Round remaining hours upward so an active event never says zero hours.
 * The caller supplies the actually rendered theme, including failed switches. */
export function automaticThemeStatus(now: Date, activeId?: ThemeId, failed = false, events?: readonly AnnualThemeEvent[]): AutomaticThemeStatus {
  const resolved = resolveAutomaticTheme(now, events), expectedId = resolved.themeId;
  const phase = failed ? 'error' : activeId === expectedId ? 'ready' : 'loading';
  const status = { activeId, expectedId, phase } as const;
  if (!resolved.event) return status;
  const { id, label, endsAt } = resolved.event;
  const remainingMs = endsAt.getTime() - now.getTime();
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return status;
  const totalHours = Math.ceil(remainingMs / HOUR_MS);
  return {
    ...status,
    event: {
      id, label, endsAt,
      remaining: { days: Math.floor(totalHours / 24), hours: totalHours % 24, lessThanHour: remainingMs < HOUR_MS },
    },
  };
}

/** No live-region semantics or timer work: presentation owns when to refresh. */
export function formatAutomaticThemeStatus(status: AutomaticThemeStatus, locale: Locale): {
  active: string;
  transition?: string;
  remaining?: string;
} {
  const copy = themeCopy[locale];
  const active = status.activeId ? copy.activeTheme.replace('{theme}', copy[status.activeId]) : copy.loading;
  const transition = status.phase === 'error' ? copy.failed
    : status.phase === 'loading' && status.activeId ? copy.loadingTarget.replace('{theme}', copy[status.expectedId]) : undefined;
  if (!status.event) return { active, transition };
  const { days, hours, lessThanHour } = status.event.remaining;
  const units: string[] = [];
  if (days) units.push(new Intl.NumberFormat(locale, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(days));
  if (hours) units.push(new Intl.NumberFormat(locale, { style: 'unit', unit: 'hour', unitDisplay: 'long' }).format(hours));
  const duration = lessThanHour ? copy.lessThanHour : new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(units);
  const remaining = copy.eventRemaining.replace('{theme}', copy[status.expectedId])
    .replace('{event}', status.event.label[locale]).replace('{duration}', duration);
  return { active, transition, remaining };
}
