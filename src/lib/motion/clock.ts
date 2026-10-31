import { pond } from '../theme/pond';

/** Small injectable browser boundary makes lifecycle behavior independently testable. */
export interface MotionEnvironment {
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
  hidden(): boolean;
  reduced(): boolean;
  onVisibility(callback: () => void): () => void;
  onReduced(callback: () => void): () => void;
}

function browserEnvironment(): MotionEnvironment {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  return {
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (handle) => window.cancelAnimationFrame(handle),
    hidden: () => document.hidden,
    reduced: () => preference.matches,
    onVisibility(callback) {
      document.addEventListener('visibilitychange', callback);
      return () => document.removeEventListener('visibilitychange', callback);
    },
    onReduced(callback) {
      preference.addEventListener('change', callback);
      return () => preference.removeEventListener('change', callback);
    },
  };
}

/** One clock per mounted application. Only visible, non-reduced time is accumulated. */
export function createMotionClock(
  emit: (seconds: number, reduced: boolean) => void,
  environment: MotionEnvironment = browserEnvironment(),
): () => void {
  let disposed = false;
  let handle: number | undefined;
  let previous: number | undefined;
  let lastEmission = 0;
  let elapsed = 0;
  const interval = 1000 / pond.motion.updateRate;

  const active = () => !disposed && !environment.hidden() && !environment.reduced();
  const request = () => {
    if (active() && handle === undefined) handle = environment.requestFrame(frame);
  };
  function frame(timestamp: number) {
    handle = undefined;
    // A frame can observe a media change before its change event is delivered.
    // Publish the static pose here too, rather than freezing the previous phase.
    if (!active()) { sync(); return; }
    if (previous !== undefined) elapsed += Math.max(0, timestamp - previous);
    previous = timestamp;
    if (elapsed - lastEmission >= interval) {
      lastEmission = elapsed;
      emit(elapsed / 1000, false);
    }
    request();
  }
  function sync() {
    if (disposed) return;
    if (handle !== undefined) environment.cancelFrame(handle);
    handle = undefined;
    previous = undefined;
    const reduced = environment.reduced();
    if (reduced) {
      elapsed = 0;
      lastEmission = 0;
    }
    emit(elapsed / 1000, reduced);
    request();
  }
  const removeVisibility = environment.onVisibility(sync);
  const removeReduced = environment.onReduced(sync);
  sync();
  return () => {
    disposed = true;
    if (handle !== undefined) environment.cancelFrame(handle);
    handle = undefined;
    removeVisibility();
    removeReduced();
  };
}
