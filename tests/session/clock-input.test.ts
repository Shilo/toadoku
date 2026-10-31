import { describe, expect, it } from 'vitest';
import { commandForKey, createActivePlayClock } from '../../src/lib/session/index.ts';
import type { InputScope } from '../../src/lib/session/index.ts';

describe('active-play clock', () => {
  it('counts revealed thinking/More time, stops concealed time, retains fractional samples', () => {
    let time = 100;
    const clock = createActivePlayClock(1200, () => time);
    expect(clock.sample()).toBe(1200); clock.setActive(true);
    time += 0.7; expect(clock.sample()).toBe(1200);
    time += 0.7; expect(clock.sample()).toBe(1201);
    clock.setActive(false); time += 600000; expect(clock.sample()).toBe(1201);
    clock.setActive(true); time += 0.7; expect(clock.sample()).toBe(1202);
    // A long task remains thinking time, with no artificial cap.
    time += 3600000; expect(clock.setActive(false)).toBe(3601202);
    expect(clock.dispose()).toBe(3601202); expect(clock.dispose()).toBe(3601202);
    expect(() => clock.setActive(true)).toThrow('disposed');
  });
  it('rejects invalid/backward clocks/overflow rather than inventing elapsed time', () => {
    for (const initial of [-1, NaN, 1.5, Infinity]) expect(() => createActivePlayClock(initial, () => 0)).toThrow(RangeError);
    let time = 20; const clock = createActivePlayClock(1000, () => time); clock.setActive(true); time = 10;
    expect(() => clock.sample()).toThrow(RangeError);
    for (const value of [-1, NaN, Infinity, -Infinity]) {
      const invalid = createActivePlayClock(0, () => value); expect(() => invalid.setActive(true)).toThrow(RangeError);
    }
    let end = 0; const overflow = createActivePlayClock(Number.MAX_SAFE_INTEGER, () => end); overflow.setActive(true); end = 2;
    expect(() => overflow.sample()).toThrow(RangeError);
  });
  it('keeps repeated activation active rather than treating it as a pause', () => {
    let time = 0; const clock = createActivePlayClock(0, () => time); clock.setActive(true);
    time = 20; expect(clock.setActive(true)).toBe(20);
    time = 30; expect(clock.sample()).toBe(30); expect(clock.setActive(false)).toBe(30);
    time = 1000; expect(clock.setActive(false)).toBe(30); expect(clock.sample()).toBe(30);
  });
});

describe('scoped keyboard commands', () => {
  const scope: InputScope = { active: true, modal: false, editable: false, platform: 'other', selection: 40 };
  it('maps keyboard and numpad key values to the same reducer commands', () => {
    for (let digit = 1; digit <= 9; digit++) expect(commandForKey({ key: String(digit) }, scope)).toEqual({ type: 'enter', digit });
    expect(commandForKey({ key: 'n' }, scope)).toEqual({ type: 'toggle-notes' });
    for (const key of ['Backspace', 'Delete']) expect(commandForKey({ key }, scope)).toEqual({ type: 'erase' });
    for (const [key, cell] of [['ArrowLeft', 39], ['ArrowRight', 41], ['ArrowUp', 31], ['ArrowDown', 49], ['Home', 36], ['End', 44]] as const) expect(commandForKey({ key, repeat: true }, scope)).toEqual({ type: 'select', cell });
    expect(commandForKey({ key: 'ArrowLeft' }, { ...scope, selection: 0 })).toEqual({ type: 'select', cell: 0 });
    expect(commandForKey({ key: 'ArrowDown' }, { ...scope, selection: 80 })).toEqual({ type: 'select', cell: 80 });
    expect(commandForKey({ key: 'ArrowRight' }, { ...scope, selection: 80 })).toEqual({ type: 'select', cell: 80 });
    expect(commandForKey({ key: 'ArrowUp' }, { ...scope, selection: 0 })).toEqual({ type: 'select', cell: 0 });
  });
  it('leaves dialogs/fields/IME/modifiers native and ignores held discrete input', () => {
    for (const extra of [{ active: false }, { modal: true }, { editable: true }]) expect(commandForKey({ key: '1' }, { ...scope, ...extra })).toBeUndefined();
    for (const key of ['1', 'n', 'Delete', 'Backspace']) expect(commandForKey({ key, repeat: true }, scope)).toBeUndefined();
    for (const event of [{ key: '1', isComposing: true }, { key: '1', ctrlKey: true }, { key: '1', altKey: true }, { key: '1', metaKey: true }, { key: '1', shiftKey: true }, { key: '0' }, { key: 'Enter' }]) expect(commandForKey(event, scope)).toBeUndefined();
    expect(commandForKey({ key: 'z', ctrlKey: true }, scope)).toEqual({ type: 'undo' });
    expect(commandForKey({ key: 'z', metaKey: true }, { ...scope, platform: 'mac' })).toEqual({ type: 'undo' });
    for (const event of [{ key: 'z', metaKey: true }, { key: 'z', ctrlKey: true, shiftKey: true }, { key: 'z', ctrlKey: true, repeat: true }]) expect(commandForKey(event, scope)).toBeUndefined();
    expect(commandForKey({ key: 'z', ctrlKey: true }, { ...scope, platform: 'mac' })).toBeUndefined();
    for (const platform of ['mac', 'other'] as const) expect(commandForKey({ key: 'z', ctrlKey: true, metaKey: true }, { ...scope, platform })).toBeUndefined();
    expect(commandForKey({ key: '1' }, { ...scope, selection: -1 })).toBeUndefined();
    expect(commandForKey({ key: '1' }, { ...scope, selection: 81 })).toBeUndefined();
    for (const key of ['F1', '1x']) expect(commandForKey({ key }, scope)).toBeUndefined();
  });
});
