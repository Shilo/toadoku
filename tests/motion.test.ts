import { describe, expect, it } from 'vitest';
import { createMotionClock, type MotionEnvironment } from '../src/lib/motion/clock';
import { floatOffset } from '../src/lib/motion/float';

function fixture(initialReduced = false, initialHidden = false) {
  let reduced = initialReduced;
  let hidden = initialHidden;
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const visibility = new Set<() => void>();
  const preference = new Set<() => void>();
  const environment: MotionEnvironment = {
    requestFrame(callback) { frames.set(++id, callback); return id; },
    cancelFrame(handle) { frames.delete(handle); },
    reduced: () => reduced,
    hidden: () => hidden,
    onVisibility(callback) { visibility.add(callback); return () => visibility.delete(callback); },
    onReduced(callback) { preference.add(callback); return () => preference.delete(callback); },
  };
  return {
    environment, frames, visibility, preference,
    tick(time: number) {
      const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback(time);
    },
    hide(value: boolean) { hidden = value; for (const callback of visibility) callback(); },
    reduce(value: boolean, notify = true) { reduced = value; if (notify) for (const callback of preference) callback(); },
  };
}

describe('shared active-time clock', () => {
  it('publishes the static pose if a frame observes reduced motion before the media event', () => {
    const f = fixture();
    const values: [number, boolean][] = [];
    const dispose = createMotionClock((time, reduced) => values.push([time, reduced]), f.environment);
    f.tick(0); f.tick(50);
    expect(values.at(-1)).toEqual([0.05, false]);
    f.reduce(true, false);
    f.tick(100);
    expect(values.at(-1)).toEqual([0, true]);
    expect(f.frames.size).toBe(0);
    f.reduce(false); f.tick(100000); f.tick(100040);
    expect(values.at(-1)).toEqual([0.04, false]);
    dispose();
  });
  it('stays static initially and reacts to runtime reduced motion without elapsed-time jumps', () => {
    const f = fixture(true);
    const values: [number, boolean][] = [];
    const dispose = createMotionClock((time, reduced) => values.push([time, reduced]), f.environment);
    expect(values).toEqual([[0, true]]);
    expect(f.frames.size).toBe(0);
    f.reduce(false);
    f.tick(100000); f.tick(100050);
    expect(values.at(-1)).toEqual([0.05, false]);
    f.reduce(true);
    expect(values.at(-1)).toEqual([0, true]);
    expect(f.frames.size).toBe(0);
    f.reduce(false); f.tick(500000); f.tick(500040);
    expect(values.at(-1)).toEqual([0.04, false]);
    dispose();
  });

  it('pauses hidden work and resumes from the same active time', () => {
    const f = fixture();
    const values: number[] = [];
    const dispose = createMotionClock((time) => values.push(time), f.environment);
    f.tick(0); f.tick(50);
    expect(values.at(-1)).toBe(0.05);
    f.hide(true);
    expect(f.frames.size).toBe(0);
    f.tick(1000000);
    f.hide(false); f.tick(1000000);
    expect(values.at(-1)).toBe(0.05);
    f.tick(1000050);
    expect(values.at(-1)).toBe(0.1);
    dispose();
  });

  it('cleans listeners and prevents a captured stale callback from scheduling after disposal', () => {
    const f = fixture();
    const values: number[] = [];
    const dispose = createMotionClock((time) => values.push(time), f.environment);
    const staleFrame = [...f.frames.values()][0];
    dispose(); dispose();
    staleFrame(100);
    f.hide(false); f.reduce(false);
    expect(f.frames.size).toBe(0);
    expect(f.visibility.size).toBe(0);
    expect(f.preference.size).toBe(0);
    expect(values).toEqual([0]);
  });

  it('caps emissions while preserving seeded static poses and shared float identity', () => {
    const f = fixture();
    const values: number[] = [];
    const dispose = createMotionClock((time) => values.push(time), f.environment);
    for (let time = 0; time <= 1000; time += 4) f.tick(time);
    expect(values.length).toBeLessThanOrEqual(31);
    expect(values.at(-1)).toBeGreaterThan(0.95);
    const profiles = new Set<string>();
    for (let id = 0; id < 81; id++) {
      expect(floatOffset(id, 0, 'leaf')).toEqual({ x: 0, y: 0 });
      profiles.add(JSON.stringify(floatOffset(id, 7, 'leaf')));
      expect(floatOffset(id, 7, 'leaf')).toEqual(floatOffset(id, 7, 'leaf'));
    }
    expect(profiles.size).toBe(81);
    dispose();
  });
});
