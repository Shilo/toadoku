import { seededUnit } from '../motion/float';
import { presentation } from '../theme/presentation';
import type { Cubic, Point } from './shape';

const TAU = Math.PI * 2;
const pair = ({ x, y }: Point) => `${x.toFixed(4)} ${y.toFixed(4)}`;

/** Quiet, opaque potion medallion. Decoration never owns a cell's target or seed. */
export function medallionShape(id: number): { path: string; curves: readonly Cubic[] } {
  const phase = seededUnit(id, 14) * TAU;
  const radius = (angle: number) => 43.8 + .24 * Math.cos(angle * 4 + phase)
    + .06 * Math.sin(angle * 3 - phase);
  const point = (angle: number): Point => ({ x: 50 + Math.cos(angle) * radius(angle), y: 50 + Math.sin(angle) * radius(angle) });
  const tangent = (angle: number): Point => {
    const r = radius(angle), dr = -.96 * Math.sin(angle * 4 + phase) + .18 * Math.cos(angle * 3 - phase);
    return { x: -Math.sin(angle) * r + Math.cos(angle) * dr, y: Math.cos(angle) * r + Math.sin(angle) * dr };
  };
  const limit = (p: Point): Point => {
    const scale = Math.min(1, (presentation.geometry.leafControlRadius * 100 - .002) / Math.hypot(p.x - 50, p.y - 50));
    return { x: 50 + (p.x - 50) * scale, y: 50 + (p.y - 50) * scale };
  };
  const step = TAU / 32;
  const points = Array.from({ length: 32 }, (_, index) => point(index * step));
  const curves = Array.from({ length: 32 }, (_, index): Cubic => {
    const angle = index * step, next = ((index + 1) % 32) * step;
    const start = points[index], end = points[(index + 1) % 32], a = tangent(angle), b = tangent(next);
    return { start, a: limit({ x: start.x + a.x * step / 3, y: start.y + a.y * step / 3 }),
      b: limit({ x: end.x - b.x * step / 3, y: end.y - b.y * step / 3 }), end };
  });
  return { path: `M${pair(curves[0].start)}${curves.map(({ a, b, end }) => `C${pair(a)} ${pair(b)} ${pair(end)}`).join('')}Z`, curves };
}

export const medallionPath = (id: number): string => medallionShape(id).path;

