export interface ActivePlayClock {
  setActive(active: boolean): number;
  sample(): number;
  dispose(): number;
}

/**
 * One document's monotonic segments, independent of decoration and input events.
 * Caller conceals board/notes before deactivation and owns periodic and semantic saves.
 * No Date subtraction across documents and no artificial cap on long thinking tasks.
 * Browser monotonic clocks differ during OS sleep; this class cannot promise uniform sleep accounting.
 */
export function createActivePlayClock(initialElapsedMs: number, now: () => number): ActivePlayClock {
  if (!Number.isSafeInteger(initialElapsedMs) || initialElapsedMs < 0) throw new RangeError('Invalid elapsed time');
  let total = initialElapsedMs;
  let start: number | undefined;
  let disposed = false;
  let previous: number | undefined;
  function readNow(): number {
    const value = now();
    if (!Number.isFinite(value) || value < 0 || previous !== undefined && value < previous) throw new RangeError('Invalid monotonic clock');
    previous = value;
    return value;
  }
  function rawSample(): number {
    const result = total + (start === undefined ? 0 : readNow() - start);
    if (!Number.isSafeInteger(Math.floor(result)) || result < 0) throw new RangeError('Elapsed time overflow');
    return result;
  }
  return {
    sample: () => Math.floor(rawSample()),
    setActive(active) {
      if (disposed) throw new Error('Clock disposed');
      if (active && start === undefined) start = readNow();
      else if (!active && start !== undefined) { total = rawSample(); start = undefined; }
      return Math.floor(rawSample());
    },
    dispose() {
      if (!disposed) { total = rawSample(); start = undefined; disposed = true; }
      return Math.floor(total);
    },
  };
}
