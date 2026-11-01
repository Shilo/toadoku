import { afterEach, describe, expect, it } from 'vitest';
import { nextThemeRefresh, resolveAutomaticTheme, type AnnualThemeEvent } from '../src/lib/theme/calendar';
import { automaticThemeStatus, formatAutomaticThemeStatus } from '../src/lib/theme/event';

const zone = process.env.TZ;
afterEach(() => { if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone; });
const event = (overrides: Partial<AnnualThemeEvent> = {}): AnnualThemeEvent => ({
  id: 'winter', theme: 'cauldron', label: { en: 'Winter', de: 'Winter', es: 'Invierno' },
  start: { month: 12, day: 24 }, end: { month: 1, day: 8 }, ...overrides,
});

describe('authored annual theme schedule', () => {
  it.each([2026, 2027, 2032])('repeats a cross-year window with exact half-open boundaries in %i', year => {
    const schedule = [event()], start = new Date(year, 11, 24), end = new Date(year + 1, 0, 8);
    const before = new Date(start.getTime() - 1);
    expect(resolveAutomaticTheme(before, schedule)).toEqual({ themeId: 'pond' });
    const first = resolveAutomaticTheme(start, schedule);
    expect(first.themeId).toBe('cauldron');
    expect(first.event).toMatchObject({ id: 'winter', startsAt: start, endsAt: end });
    expect(resolveAutomaticTheme(new Date(year + 1, 0, 1), schedule).event).toEqual(first.event);
    expect(resolveAutomaticTheme(new Date(end.getTime() - 1), schedule).themeId).toBe('cauldron');
    expect(resolveAutomaticTheme(end, schedule)).toEqual({ themeId: 'pond' });
    expect(before.getTime()).toBe(start.getTime() - 1);
  });

  it('chooses the first overlap without sorting and uses that same event for its countdown', () => {
    const first = event({ id: 'first', start: { month: 6, day: 1 }, end: { month: 6, day: 10 } });
    const second = event({ id: 'second', theme: 'pond', label: { en: 'Summer', de: 'Sommer', es: 'Verano' },
      start: { month: 6, day: 5 }, end: { month: 6, day: 20 } });
    const schedule = Object.freeze([first, second]), now = new Date(2026, 5, 7);
    expect(resolveAutomaticTheme(now, schedule)).toMatchObject({ themeId: 'cauldron', event: { id: 'first', endsAt: new Date(2026, 5, 10) } });
    expect(resolveAutomaticTheme(now, [second, first])).toMatchObject({ themeId: 'pond', event: { id: 'second' } });
    const continued = automaticThemeStatus(new Date(2026, 5, 10), 'pond', false, schedule);
    expect(continued).toMatchObject({ expectedId: 'pond', phase: 'ready', event: { id: 'second', endsAt: new Date(2026, 5, 20) } });
    expect(formatAutomaticThemeStatus(continued, 'en').remaining).toBe('Pond ends in 10 days (Summer).');
    expect(formatAutomaticThemeStatus(continued, 'de').remaining).toBe('Teich: noch 10 Tage (Sommer).');
    expect(formatAutomaticThemeStatus(continued, 'es').remaining).toBe('Estanque termina en 10 días (Verano).');
    expect(resolveAutomaticTheme(new Date(2026, 5, 20), schedule)).toEqual({ themeId: 'pond' });
    expect(schedule).toEqual([first, second]);
  });

  it('supports annual hour/minute windows and schedules their actual boundaries', () => {
    const schedule = [event({ start: { month: 4, day: 2, hour: 9, minute: 30 }, end: { month: 4, day: 2, hour: 11 } })];
    for (const year of [2026, 2027]) {
      const before = new Date(year, 3, 2, 9, 29, 59, 999), start = new Date(year, 3, 2, 9, 30), end = new Date(year, 3, 2, 11);
      expect(resolveAutomaticTheme(before, schedule).event).toBeUndefined();
      expect(nextThemeRefresh(before, schedule)).toEqual(start);
      expect(resolveAutomaticTheme(start, schedule).event?.endsAt).toEqual(end);
      expect(nextThemeRefresh(start, schedule)).toEqual(end);
      expect(resolveAutomaticTheme(end, schedule).event).toBeUndefined();
      expect(nextThemeRefresh(end, schedule)).toEqual(new Date(year, 3, 3));
    }
  });

  it('keeps midnight as a daily upper bound and handles a New Year time boundary', () => {
    const schedule = [event({ start: { month: 12, day: 31, hour: 23 }, end: { month: 1, day: 1, hour: 1 } })];
    expect(nextThemeRefresh(new Date(2026, 11, 30), schedule)).toEqual(new Date(2026, 11, 31));
    expect(nextThemeRefresh(new Date(2026, 11, 31, 23, 30), schedule)).toEqual(new Date(2027, 0, 1));
    expect(nextThemeRefresh(new Date(2027, 0, 1), schedule)).toEqual(new Date(2027, 0, 1, 1));
  });

  it('skips non-leap February 29 instead of silently activating March 1', () => {
    const schedule = [event({ start: { month: 2, day: 29 }, end: { month: 3, day: 1 } })];
    expect(resolveAutomaticTheme(new Date(2028, 1, 29), schedule).themeId).toBe('cauldron');
    expect(resolveAutomaticTheme(new Date(2027, 1, 28), schedule).event).toBeUndefined();
    expect(resolveAutomaticTheme(new Date(2027, 2, 1), schedule).event).toBeUndefined();
  });

  it('uses native local DST disambiguation without turning a normalized empty window into a year', () => {
    process.env.TZ = 'America/Los_Angeles';
    const gap = event({ start: { month: 3, day: 8, hour: 2, minute: 30 }, end: { month: 3, day: 8, hour: 4 } });
    const active = resolveAutomaticTheme(new Date(2026, 2, 8, 3, 30), [gap]);
    expect(active.event?.startsAt).toEqual(new Date(2026, 2, 8, 3, 30));
    expect(nextThemeRefresh(new Date(2026, 2, 8, 3), [gap])).toEqual(new Date(2026, 2, 8, 3, 30));
    const empty = event({ start: { month: 3, day: 8, hour: 2 }, end: { month: 3, day: 8, hour: 3 } });
    expect(resolveAutomaticTheme(new Date(2026, 6, 1), [empty]).event).toBeUndefined();
    expect(resolveAutomaticTheme(new Date(2026, 2, 8, 3), [empty]).event).toBeUndefined();
    const fold = event({ start: { month: 11, day: 1, hour: 1, minute: 30 }, end: { month: 11, day: 1, hour: 2, minute: 30 } });
    expect((resolveAutomaticTheme(new Date(2026, 10, 1, 1, 45), [fold]).event!.endsAt.getTime()
      - new Date(2026, 10, 1, 1, 30).getTime()) / 3_600_000).toBe(2);
  });

  it('falls back for empty schedules, invalid clocks, malformed dates and empty windows', () => {
    const now = new Date(2026, 9, 31);
    expect(resolveAutomaticTheme(now, [])).toEqual({ themeId: 'pond' });
    expect(resolveAutomaticTheme(new Date(NaN))).toEqual({ themeId: 'pond' });
    for (const start of [{ month: 13, day: 1 }, { month: 4, day: 31 }, { month: 1, day: 1, hour: 24 },
      { month: 1, day: 1, minute: 60 }, { month: 1.5, day: 2 }, { month: 1, day: 1, hour: NaN }]) {
      expect(resolveAutomaticTheme(now, [event({ start })]).event).toBeUndefined();
    }
    expect(resolveAutomaticTheme(now, [event({ start: { month: 1, day: 1 }, end: { month: 1, day: 1 } })]).event).toBeUndefined();
  });
});
