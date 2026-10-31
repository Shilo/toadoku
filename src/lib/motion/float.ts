import { pond } from '../theme/pond';

/** Stable integer mixing, independent of display size and rendering order. */
export function seededUnit(seed: number, channel = 0): number {
  let n = (seed + Math.imul(channel + 1, 0x9e3779b9)) | 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return ((n ^ (n >>> 15)) >>> 0) / 4294967296;
}

export interface Offset { x: number; y: number }

/** Two bounded waves share one clock. At time zero every object has a static pose. */
export function floatOffset(seed: number, seconds: number, kind: 'leaf' | 'identity'): Offset {
  const cap = kind === 'leaf' ? pond.motion.leafTravel : pond.motion.identityTravel;
  const wave = (channel: number) => {
    const phase = seededUnit(seed, channel) * Math.PI * 2;
    const period = (pond.motion.floatMinPeriod
      + seededUnit(seed, channel + 2) * (pond.motion.floatMaxPeriod - pond.motion.floatMinPeriod)) / 1000;
    return (Math.sin(phase + seconds * Math.PI * 2 / period) - Math.sin(phase)) / 2;
  };
  // sqrt(.6² + .8²) = 1, including independently phased waves.
  return { x: cap * 0.6 * wave(0), y: cap * 0.8 * wave(1) };
}
