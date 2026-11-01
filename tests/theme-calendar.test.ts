import { afterEach, describe, expect, it } from 'vitest';
import { EVENT_DAYS_EACH_SIDE, THEME_EVENTS, resolveAutomaticTheme, type AnnualThemeEvent } from '../src/lib/theme/calendar';
import { automaticThemeStatus, formatAutomaticThemeStatus } from '../src/lib/theme/event';

const zone = process.env.TZ;
afterEach(() => { if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone; });
const event = (overrides: Partial<AnnualThemeEvent> = {}): AnnualThemeEvent => ({
  id: 'winter', theme: 'cauldron', label: { en: 'Winter', de: 'Winter', es: 'Invierno' },
  date: { month: 1, day: 1 }, ...overrides,
});

describe('shared annual event-date window', () => {
  it('ships only the actual Halloween date and derives fourteen active calendar dates', () => {
    expect(THEME_EVENTS).toHaveLength(1);
    expect(THEME_EVENTS[0]).toMatchObject({ id: 'halloween', theme: 'cauldron', date: { month: 10, day: 31 } });
    expect(EVENT_DAYS_EACH_SIDE).toBe(7);
    const start = new Date(2026, 9, 24), end = new Date(2026, 10, 7);
    expect(resolveAutomaticTheme(new Date(start.getTime() - 1)).event).toBeUndefined();
    for (let offset = 0; offset < 14; offset++) {
      expect(resolveAutomaticTheme(new Date(2026, 9, 24 + offset)).event).toMatchObject({ startsAt: start, endsAt: end });
    }
    expect(resolveAutomaticTheme(new Date(end.getTime() - 1)).themeId).toBe('cauldron');
    expect(resolveAutomaticTheme(end)).toEqual({ themeId: 'pond' });
  });

  it.each([2026, 2027, 2032])('finds adjacent anchor years on both sides of New Year in %i', year => {
    const january = [event()], start = new Date(year, 11, 25), end = new Date(year + 1, 0, 8);
    const nextYear = resolveAutomaticTheme(start, january);
    expect(nextYear.event).toMatchObject({ startsAt: start, endsAt: end });
    expect(resolveAutomaticTheme(new Date(year + 1, 0, 1), january)).toEqual(nextYear);
    expect(resolveAutomaticTheme(new Date(start.getTime() - 1), january).event).toBeUndefined();
    expect(resolveAutomaticTheme(end, january).event).toBeUndefined();
    const december = [event({ date: { month: 12, day: 31 } })];
    expect(resolveAutomaticTheme(new Date(year + 1, 0, 1), december).event)
      .toMatchObject({ startsAt: new Date(year, 11, 24), endsAt: new Date(year + 1, 0, 7) });
  });

  it('chooses the first overlap and uses its derived deadline and localized label', () => {
    const first = event({ id: 'first', date: { month: 6, day: 8 } });
    const second = event({ id: 'second', theme: 'pond', label: { en: 'Summer', de: 'Sommer', es: 'Verano' }, date: { month: 6, day: 12 } });
    const schedule = Object.freeze([first, second]), before = structuredClone(schedule), now = new Date(2026, 5, 10);
    expect(resolveAutomaticTheme(now, schedule)).toMatchObject({ themeId: 'cauldron', event: { id: 'first', endsAt: new Date(2026, 5, 15) } });
    expect(resolveAutomaticTheme(now, [second, first])).toMatchObject({ themeId: 'pond', event: { id: 'second' } });
    const continued = automaticThemeStatus(new Date(2026, 5, 15), 'pond', false, schedule);
    expect(continued).toMatchObject({ expectedId: 'pond', phase: 'ready', event: { id: 'second', endsAt: new Date(2026, 5, 19) } });
    expect(formatAutomaticThemeStatus(continued, 'en').remaining).toBe('Pond ends in 4 days (Summer).');
    expect(formatAutomaticThemeStatus(continued, 'de').remaining).toBe('Teich: noch 4 Tage (Sommer).');
    expect(formatAutomaticThemeStatus(continued, 'es').remaining).toBe('Estanque termina en 4 días (Verano).');
    expect(resolveAutomaticTheme(new Date(2026, 5, 19), schedule)).toEqual({ themeId: 'pond' });
    expect(schedule).toEqual(before);
  });

  it('keeps fourteen local calendar days across short and long DST days', () => {
    process.env.TZ = 'America/Los_Angeles';
    for (const [month, day, hours] of [[3, 8, 335], [11, 1, 337]]) {
      const active = resolveAutomaticTheme(new Date(2026, month - 1, day), [event({ date: { month, day } })]).event!;
      expect(active.startsAt.getHours()).toBe(0); expect(active.endsAt.getHours()).toBe(0);
      expect((active.endsAt.getTime() - active.startsAt.getTime()) / 3_600_000).toBe(hours);
      const calendarStamp = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
      expect((calendarStamp(active.endsAt) - calendarStamp(active.startsAt)) / 86_400_000).toBe(14);
    }
  });

  it('skips a non-leap February 29 event before deriving its surrounding window', () => {
    const schedule = [event({ date: { month: 2, day: 29 } })];
    expect(resolveAutomaticTheme(new Date(2028, 1, 22), schedule).event)
      .toMatchObject({ startsAt: new Date(2028, 1, 22), endsAt: new Date(2028, 2, 7) });
    expect(resolveAutomaticTheme(new Date(2027, 1, 28), schedule).event).toBeUndefined();
    expect(resolveAutomaticTheme(new Date(2027, 2, 1), schedule).event).toBeUndefined();
  });

  it('falls back for empty schedules, invalid clocks and invalid actual event dates', () => {
    const now = new Date(2026, 9, 31);
    expect(resolveAutomaticTheme(now, [])).toEqual({ themeId: 'pond' });
    expect(resolveAutomaticTheme(new Date(NaN))).toEqual({ themeId: 'pond' });
    for (const date of [{ month: 13, day: 1 }, { month: 0, day: 1 }, { month: 4, day: 31 },
      { month: 1.5, day: 2 }, { month: 1, day: 0 }, { month: NaN, day: 1 }]) {
      expect(resolveAutomaticTheme(now, [event({ date })]).event).toBeUndefined();
    }
  });
});
