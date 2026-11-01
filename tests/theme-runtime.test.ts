import { afterEach, describe, expect, it, vi } from 'vitest';
import { pond } from '../src/lib/theme/pond';
import { createThemeRuntime, type AppliedTheme, type ThemeDefinition } from '../src/lib/theme/runtime';
import { nextLocalMidnight, resolveAppearance, resolveTheme } from '../src/lib/theme/policy';
import { themeStyle } from '../src/lib/theme/tokens';
import { presentation } from '../src/lib/theme/presentation';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const light = { ...pond, id: 'pond', water: { ...pond.water, deep: '#123456' } };
const dark = { ...pond, id: 'pond', water: { ...pond.water, deep: '#654321' } };
const definition: ThemeDefinition = { light, dark, font: { family: 'TestTitle', url: '/title.ttf' } };
const date = new Date(2026, 9, 31, 12);
afterEach(() => { vi.useRealTimers(); });

describe('local calendar theme policy', () => {
  it.each([2024, 2026, 2027, 2032])('uses all inclusive annual edges in %i', year => {
    for (const [month, day, hour, minute, expected] of [
      [9, 23, 23, 59, 'pond'], [9, 24, 0, 0, 'cauldron'], [9, 31, 12, 0, 'cauldron'],
      [10, 1, 0, 0, 'cauldron'], [10, 7, 23, 59, 'cauldron'], [10, 8, 0, 0, 'pond'],
      [0, 1, 0, 0, 'pond'], [1, 29, 12, 0, 'pond'], [11, 31, 23, 59, 'pond'],
    ] as const) expect(resolveTheme('auto', new Date(year, month, day, hour, minute))).toBe(expected);
  });
  it('keeps explicit selections fixed and unknown opaque preferences safe', () => {
    const unknown = 'future-theme';
    expect(resolveTheme('pond', date)).toBe('pond');
    expect(resolveTheme('cauldron', new Date(2026, 0, 1))).toBe('cauldron');
    expect(resolveTheme(unknown, date)).toBe('pond');
    expect(resolveTheme('auto', new Date(NaN))).toBe('pond');
  });
  it('refreshes across event boundaries without persisting the effective result', () => {
    const choice = 'auto';
    const before = new Date(2026, 9, 23, 23, 59, 59);
    expect(resolveTheme(choice, before)).toBe('pond');
    expect(resolveTheme(choice, nextLocalMidnight(before))).toBe('cauldron');
    const end = new Date(2026, 10, 7, 23, 59, 59);
    expect(resolveTheme(choice, end)).toBe('cauldron');
    expect(resolveTheme(choice, nextLocalMidnight(end))).toBe('pond');
  });
  it('uses local next midnight across 23-hour and 25-hour days', () => {
    const previous = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      for (const [month, day, expectedHours] of [[2, 8, 23], [10, 1, 25]] as const) {
        const start = new Date(2026, month, day);
        const next = nextLocalMidnight(start);
        expect(next.getHours()).toBe(0);
        expect(next.getDate()).toBe(day + 1);
        expect((next.getTime() - start.getTime()) / 3600000).toBe(expectedHours);
      }
      expect(nextLocalMidnight(new Date(2026, 11, 31)).getFullYear()).toBe(2027);
      expect(nextLocalMidnight(new Date(2028, 1, 28)).getDate()).toBe(29);
    } finally {
      if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
    }
  });
  it('resolves appearance independently of theme and preserves unknown strings', () => {
    expect(resolveAppearance('system', true)).toBe('dark');
    expect(resolveAppearance('system', false)).toBe('light');
    expect(resolveAppearance('light', true)).toBe('light');
    expect(resolveAppearance('dark', false)).toBe('dark');
    expect(resolveAppearance('future-appearance', true)).toBe('light');
  });
});

describe('atomic lazy theme publication', () => {
  it('waits for font readiness before one coherent publication and dedupes successful keys', async () => {
    const font = deferred<void>(), events: AppliedTheme[] = [];
    const load = vi.fn(async () => definition), loadFont = vi.fn(() => font.promise);
    const runtime = createThemeRuntime({ load, loadFont, onChange: value => events.push(value) });
    const request = runtime.request('pond', 'dark', date);
    await vi.waitFor(() => expect(loadFont).toHaveBeenCalledOnce());
    expect(events).toEqual([]);
    font.resolve(); await request;
    expect(events).toEqual([{ id: 'pond', appearance: 'dark', tokens: dark, fontFallback: false, definition }]);
    await runtime.request('pond', 'dark', date);
    expect(load).toHaveBeenCalledOnce();
    await runtime.request('pond', 'light', date);
    expect(loadFont).toHaveBeenCalledOnce();
    expect(events.at(-1)?.tokens).toBe(light);
    runtime.dispose();
  });
  it('dedupes a pending effective choice without persisting Auto as its result', async () => {
    const chunk = deferred<ThemeDefinition>(), load = vi.fn(() => chunk.promise), onChange = vi.fn();
    const runtime = createThemeRuntime({ load, loadFont: async () => {}, onChange });
    const a = runtime.request('auto', 'light', date), b = runtime.request('cauldron', 'light', date);
    expect(a).toBe(b);
    chunk.resolve(definition); await a;
    expect(load).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].id).toBe('cauldron');
    runtime.dispose();
  });
  it('rejects out-of-order A B A import successes and stale errors', async () => {
    const a = deferred<ThemeDefinition>(), b = deferred<ThemeDefinition>(), last = deferred<ThemeDefinition>();
    const queue = [a, b, last], events: AppliedTheme[] = [], errors: unknown[] = [];
    const runtime = createThemeRuntime({ load: () => queue.shift()!.promise, loadFont: async () => {},
      onChange: theme => events.push(theme), onError: error => errors.push(error) });
    const first = runtime.request('pond', 'light', date);
    const second = runtime.request('cauldron', 'light', date);
    const third = runtime.request('pond', 'dark', date);
    last.resolve(definition); await third;
    b.reject(new Error('stale chunk')); a.resolve(definition); await Promise.all([first, second]);
    expect(events).toHaveLength(1); expect(events[0].appearance).toBe('dark'); expect(errors).toEqual([]);
    runtime.dispose();
  });
  it('returning to applied A invalidates pending B even without another publication', async () => {
    const b = deferred<ThemeDefinition>(), events: AppliedTheme[] = [];
    const runtime = createThemeRuntime({ load: id => id === 'pond' ? Promise.resolve(definition) : b.promise,
      loadFont: async () => {}, onChange: theme => events.push(theme) });
    await runtime.request('pond', 'light', date);
    const pending = runtime.request('cauldron', 'light', date);
    await runtime.request('pond', 'light', date);
    b.resolve(definition); await pending;
    expect(events).toHaveLength(1); expect(events[0].id).toBe('pond');
    runtime.dispose();
  });
  it('guards combined appearance changes after the font await', async () => {
    const font = deferred<void | (() => void)>(), register = vi.fn(), events: AppliedTheme[] = [];
    const runtime = createThemeRuntime({ load: async () => definition, loadFont: () => font.promise,
      onChange: theme => events.push(theme) });
    const old = runtime.request('pond', 'light', date);
    await Promise.resolve(); await Promise.resolve();
    const latest = runtime.request('auto', 'system', date, true);
    await Promise.resolve(); await Promise.resolve();
    font.resolve(register); await Promise.all([old, latest]);
    expect(register).toHaveBeenCalledOnce();
    expect(events).toHaveLength(1); expect(events[0].id).toBe('cauldron'); expect(events[0].appearance).toBe('dark');
    runtime.dispose();
  });
  it('retains the applied theme on current chunk failure and permits same-choice retry', async () => {
    let fail = true; const events: AppliedTheme[] = [], onError = vi.fn();
    const runtime = createThemeRuntime({ load: async id => { if (id === 'cauldron' && fail) throw Error('chunk'); return definition; },
      loadFont: async () => {}, onChange: theme => events.push(theme), onError });
    await runtime.request('pond', 'light', date); await runtime.request('cauldron', 'light', date);
    expect(events).toHaveLength(1); expect(onError).toHaveBeenCalledOnce();
    fail = false; await runtime.request('cauldron', 'light', date);
    expect(events).toHaveLength(2); expect(events[1].id).toBe('cauldron'); runtime.dispose();
  });
  it('font rejection applies a complete fallback and permits retry', async () => {
    const events: AppliedTheme[] = [], loadFont = vi.fn().mockRejectedValueOnce(Error('font')).mockResolvedValue(undefined);
    const runtime = createThemeRuntime({ load: async () => definition, loadFont, onChange: theme => events.push(theme) });
    await runtime.request('pond', 'light', date);
    expect(events[0].fontFallback).toBe(true); expect(events[0].tokens).toBe(light);
    await runtime.request('pond', 'light', date);
    expect(events[1].fontFallback).toBe(false); expect(loadFont).toHaveBeenCalledTimes(2); runtime.dispose();
  });
  it('bounds a hanging font and never registers its late result', async () => {
    vi.useFakeTimers();
    const font = deferred<void | (() => void)>(), register = vi.fn(), events: AppliedTheme[] = [];
    const runtime = createThemeRuntime({ load: async () => definition, loadFont: () => font.promise,
      onChange: theme => events.push(theme) });
    const request = runtime.request('pond', 'light', date);
    await vi.advanceTimersByTimeAsync(5000); await request;
    expect(events).toHaveLength(1); expect(events[0].fontFallback).toBe(true);
    font.resolve(register); await Promise.resolve(); await Promise.resolve();
    expect(register).not.toHaveBeenCalled(); expect(events).toHaveLength(1); runtime.dispose();
  });
  it('disposal invalidates pending imports/fonts and rejects later requests', async () => {
    const chunk = deferred<ThemeDefinition>(), events: AppliedTheme[] = [], errors: unknown[] = [];
    const runtime = createThemeRuntime({ load: () => chunk.promise, onChange: theme => events.push(theme), onError: error => errors.push(error) });
    const request = runtime.request('pond', 'light', date); runtime.dispose(); chunk.reject(Error('late')); await request;
    await runtime.request('cauldron', 'dark', date);
    expect(events).toEqual([]); expect(errors).toEqual([]);
    const font = deferred<void | (() => void)>(), register = vi.fn();
    const second = createThemeRuntime({ load: async () => definition, loadFont: () => font.promise, onChange: theme => events.push(theme) });
    const pending = second.request('pond', 'light', date);
    await Promise.resolve(); await Promise.resolve(); second.dispose(); font.resolve(register); await pending;
    expect(register).not.toHaveBeenCalled(); expect(events).toEqual([]);
  });
});

it('retains fixed layout/motion/geometry budgets and maps semantic states without duplicate tokens', () => {
  for (const group of ['spacing', 'geometry', 'motion'] as const) expect(pond[group]).toEqual(presentation[group]);
  for (const [role, value] of Object.entries(presentation.surface)) expect(pond.surface[role as keyof typeof presentation.surface]).toBe(value);
  for (const [role, value] of Object.entries(presentation.typography)) expect(pond.typography[role as keyof typeof presentation.typography]).toBe(value);
  const style = themeStyle(pond), roles = style.split(';').map(item => item.slice(0, item.indexOf(':')));
  expect(new Set(roles).size).toBe(roles.length);
  expect(style).not.toContain('undefined');
  for (const name of ['entry-ink', 'note-ink', 'conflict-ink', 'control-hover-face', 'control-pressed-face', 'control-selected-face', 'control-selected-ink', 'button-radius', 'window-shadow']) expect(style).toContain(`--${name}:`);
});
