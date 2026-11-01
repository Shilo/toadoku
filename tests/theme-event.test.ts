import { afterEach, describe, expect, it } from 'vitest';
import { automaticThemeStatus, formatAutomaticThemeStatus } from '../src/lib/theme/event';
import { themeCopy } from '../src/lib/theme/copy';

const initialZone = process.env.TZ;
afterEach(() => {
  if (initialZone === undefined) delete process.env.TZ;
  else process.env.TZ = initialZone;
});
const HOUR_MS = 3_600_000;

describe('automatic theme event metadata', () => {
  it.each([2024, 2026, 2027, 2032])('uses the current annual local window and exclusive deadline in %i', year => {
    const before = automaticThemeStatus(new Date(year, 9, 23, 23, 59, 59, 999), 'pond');
    expect(before).toEqual({ activeId: 'pond', expectedId: 'pond', phase: 'ready' });
    const start = new Date(year, 9, 24), stamp = start.getTime();
    const active = automaticThemeStatus(start, 'cauldron');
    expect(active).toMatchObject({ activeId: 'cauldron', expectedId: 'cauldron', phase: 'ready', event: { id: 'halloween' } });
    expect(active.event!.endsAt).toEqual(new Date(year, 10, 8));
    expect(start.getTime()).toBe(stamp);
    expect(automaticThemeStatus(new Date(year, 10, 7, 23, 59, 59, 999), 'cauldron').event!.remaining.lessThanHour).toBe(true);
    expect(automaticThemeStatus(new Date(year, 10, 8), 'cauldron')).toEqual({ activeId: 'cauldron', expectedId: 'pond', phase: 'loading' });
  });

  it('separates the rendered theme from the desired theme during loading and failure', () => {
    const date = new Date(2026, 9, 31, 12);
    expect(automaticThemeStatus(date)).toMatchObject({ activeId: undefined, expectedId: 'cauldron', phase: 'loading' });
    const pending = automaticThemeStatus(date, 'pond');
    expect(pending).toMatchObject({ activeId: 'pond', expectedId: 'cauldron', phase: 'loading' });
    expect(pending.event?.id).toBe('halloween');
    expect(automaticThemeStatus(date, 'pond', true)).toMatchObject({ activeId: 'pond', expectedId: 'cauldron', phase: 'error' });
    expect(automaticThemeStatus(date, 'cauldron')).toMatchObject({ activeId: 'cauldron', expectedId: 'cauldron', phase: 'ready' });
    expect(automaticThemeStatus(new Date(NaN), 'pond')).toEqual({ activeId: 'pond', expectedId: 'pond', phase: 'ready' });
  });

  it('keeps a calendar deadline while measuring real duration across a 25-hour day', () => {
    process.env.TZ = 'America/Los_Angeles';
    const start = automaticThemeStatus(new Date(2026, 9, 24), 'cauldron');
    expect(start.event!.endsAt.getHours()).toBe(0);
    expect(start.event!.endsAt.getMonth()).toBe(10);
    expect(start.event!.endsAt.getDate()).toBe(8);
    expect(start.event!.remaining).toEqual({ days: 15, hours: 1, lessThanHour: false });
    const beforeFallback = automaticThemeStatus(new Date(2026, 10, 1), 'cauldron').event!.remaining;
    const afterFallback = automaticThemeStatus(new Date(2026, 10, 2), 'cauldron').event!.remaining;
    expect(beforeFallback.days * 24 + beforeFallback.hours - afterFallback.days * 24 - afterFallback.hours).toBe(25);
  });

  it('rounds hours rather than whole days and never reports zero hours while active', () => {
    const end = new Date(2026, 10, 8).getTime();
    for (const [hours, days, remainder] of [[48 + 1 / 60, 2, 1], [48, 2, 0], [25, 1, 1], [24, 1, 0], [1, 0, 1]] as const) {
      expect(automaticThemeStatus(new Date(end - hours * HOUR_MS), 'cauldron').event!.remaining)
        .toEqual({ days, hours: remainder, lessThanHour: false });
    }
    for (const milliseconds of [HOUR_MS - 1, 60_000, 1]) {
      expect(automaticThemeStatus(new Date(end - milliseconds), 'cauldron').event!.remaining)
        .toEqual({ days: 0, hours: 1, lessThanHour: true });
    }
    expect(automaticThemeStatus(new Date(end), 'cauldron').event).toBeUndefined();
  });
});

describe('localized automatic theme status', () => {
  it.each([
    ['en', 'Active theme: Cauldron', 'Cauldron ends in 2 days and 1 hour (Halloween).'],
    ['de', 'Aktives Thema: Kessel', 'Kessel: noch 2 Tage und 1 Stunde (Halloween).'],
    ['es', 'Tema activo: Caldero', 'Caldero termina en 2 d\u00edas y 1 hora (Halloween).'],
  ] as const)('names the active theme and duration in %s', (locale, active, remaining) => {
    const end = new Date(2026, 10, 8).getTime();
    const text = formatAutomaticThemeStatus(automaticThemeStatus(new Date(end - 49 * HOUR_MS), 'cauldron'), locale);
    expect(text).toEqual({ active, transition: undefined, remaining });
    expect(Object.values(text).filter(value => value !== undefined).join(' ')).not.toMatch(/[{}\uFFFD]/);
  });

  it('does not announce an expected theme as active when its load fails', () => {
    const text = formatAutomaticThemeStatus(automaticThemeStatus(new Date(2026, 9, 31), 'pond', true), 'en');
    expect(text.active).toBe('Active theme: Pond');
    expect(text.transition).toBe(themeCopy.en.failed);
    expect(text.remaining).toMatch(/^Cauldron ends in /);
    const pending = formatAutomaticThemeStatus(automaticThemeStatus(new Date(2026, 9, 31), 'pond'), 'en');
    expect(pending.active).toBe('Active theme: Pond');
    expect(pending.transition).toBe('Switching to Cauldron...');
  });

  it.each(['en', 'de', 'es'] as const)('formats the final hour honestly and removes expired event text in %s', locale => {
    const end = new Date(2026, 10, 8).getTime();
    const before = formatAutomaticThemeStatus(automaticThemeStatus(new Date(end - 1), 'cauldron'), locale);
    expect(before.remaining).toContain(themeCopy[locale].lessThanHour);
    const after = formatAutomaticThemeStatus(automaticThemeStatus(new Date(end), 'cauldron'), locale);
    expect(after.remaining).toBeUndefined();
    expect(after.transition).toBe(themeCopy[locale].loadingTarget.replace('{theme}', themeCopy[locale].pond));
  });
});
