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
  it.each(['UTC', 'Europe/Vienna', 'America/Los_Angeles', 'Australia/Sydney', 'Asia/Kathmandu', 'America/Santiago'])
    ('matches an independent civil-date oracle across Gregorian years 2000–2399 in %s', timeZone => {
      process.env.TZ = timeZone;
      const anchors = [{ month: 1, day: 1 }, { month: 2, day: 28 }, { month: 2, day: 29 },
        { month: 3, day: 1 }, { month: 9, day: 6 }, { month: 10, day: 31 }, { month: 12, day: 31 }];
      const localCivilDate = (stamp: number) => {
        const civil = new Date(stamp);
        return new Date(civil.getUTCFullYear(), civil.getUTCMonth(), civil.getUTCDate());
      };
      for (let year = 2000; year < 2400; year++) for (const date of anchors) {
        const schedule = [event({ date })], anchorStamp = Date.UTC(year, date.month - 1, date.day);
        const civil = new Date(anchorStamp), label = `${timeZone} ${year}/${date.month}/${date.day}`;
        if (civil.getUTCMonth() !== date.month - 1 || civil.getUTCDate() !== date.day) {
          // Reject the nominal leap date before Date.UTC's normalization can
          // turn the independent oracle into an unintended March occurrence.
          for (const probe of [new Date(year, 1, 22), new Date(year, 1, 28), new Date(year, 2, 1)]) {
            expect(resolveAutomaticTheme(probe, schedule), label).toEqual({ themeId: 'pond' });
          }
          continue;
        }
        // UTC ordinal arithmetic defines expected calendar fields independently
        // from the implementation's nominal local month/day overflow.
        const start = localCivilDate(anchorStamp - 7 * 86_400_000), end = localCivilDate(anchorStamp + 7 * 86_400_000);
        const probes = [[start.getTime() - 1, false], [start.getTime(), true], [localCivilDate(anchorStamp).getTime(), true],
          [end.getTime() - 1, true], [end.getTime(), false]] as const;
        for (const [stamp, active] of probes) {
          const input = new Date(stamp), resolved = resolveAutomaticTheme(input, schedule);
          expect(input.getTime(), label).toBe(stamp);
          if (!active) expect(resolved, label).toEqual({ themeId: 'pond' });
          else {
            expect(resolved.themeId, label).toBe('cauldron');
            expect(resolved.event?.startsAt.getTime(), label).toBe(start.getTime());
            expect(resolved.event?.endsAt.getTime(), label).toBe(end.getTime());
          }
        }
      }
    }, 30_000);

  it('does not leak an event date midnight-gap hour into the surrounding boundaries', () => {
    process.env.TZ = 'America/Santiago';
    const schedule = [event({ date: { month: 9, day: 6 } })];
    const anchor = new Date(2026, 8, 6), start = new Date(2026, 7, 30), end = new Date(2026, 8, 13);
    expect(anchor.getHours()).toBe(1); // This event day's midnight does not exist.
    const active = resolveAutomaticTheme(anchor, schedule).event!;
    expect(active.startsAt).toEqual(start); expect(active.endsAt).toEqual(end);
    expect(active.startsAt.getHours()).toBe(0); expect(active.endsAt.getHours()).toBe(0);
    expect(resolveAutomaticTheme(new Date(start.getTime() - 1), schedule).event).toBeUndefined();
    expect(resolveAutomaticTheme(start, schedule).event).toBeDefined();
    expect(resolveAutomaticTheme(new Date(end.getTime() - 1), schedule).event).toBeDefined();
    expect(resolveAutomaticTheme(end, schedule).event).toBeUndefined();
  });

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
