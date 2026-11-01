import { seededUnit } from '../motion/float';
import { presentation } from '../theme/presentation';
import type { Cubic, Point } from './shape';

const TAU = Math.PI * 2, SEGMENTS = 32, STEP = TAU / SEGMENTS;
const pair = ({ x, y }: Point) => `${x.toFixed(4)} ${y.toFixed(4)}`;
const path = (curves: readonly Cubic[]) => `M${pair(curves[0].start)}${curves.map(({ a, b, end }) => `C${pair(a)} ${pair(b)} ${pair(end)}`).join('')}Z`;
const reverse = (curve: Cubic): Cubic => ({ start: curve.end, a: curve.b, b: curve.a, end: curve.start });
const segment = (start: Point, end: Point): Cubic => ({ start, a: start, b: end, end });

function squashGeometry(id: number, inset = 0): Cubic[] {
  const phase = seededUnit(id, 14) * TAU;
  const rawRadius = (angle: number) => 40.8 + 1.8 * Math.cos(angle * 4 + phase)
    + .9 * Math.sin(angle * 3 - phase) + .35 * Math.cos(angle * 2 + phase);
  const radius = (angle: number) => Math.max(37.2, rawRadius(angle) - inset);
  const point = (angle: number): Point => ({ x: 50 + Math.cos(angle) * radius(angle), y: 50 + Math.sin(angle) * radius(angle) });
  const tangent = (angle: number): Point => {
    const r = radius(angle), dr = rawRadius(angle) - inset <= 37.2 ? 0
      : -7.2 * Math.sin(angle * 4 + phase) + 2.7 * Math.cos(angle * 3 - phase) - .7 * Math.sin(angle * 2 + phase);
    return { x: -Math.sin(angle) * r + Math.cos(angle) * dr, y: Math.cos(angle) * r + Math.sin(angle) * dr };
  };
  const limit = (p: Point): Point => {
    const scale = Math.min(1, (presentation.geometry.leafControlRadius * 100 - .002) / Math.hypot(p.x - 50, p.y - 50));
    return { x: 50 + (p.x - 50) * scale, y: 50 + (p.y - 50) * scale };
  };
  const points = Array.from({ length: SEGMENTS }, (_, index) => point(index * STEP));
  return Array.from({ length: SEGMENTS }, (_, index): Cubic => {
    const angle = index * STEP, next = ((index + 1) % SEGMENTS) * STEP;
    const start = points[index], end = points[(index + 1) % SEGMENTS], a = tangent(angle), b = tangent(next);
    return { start, a: limit({ x: start.x + a.x * STEP / 3, y: start.y + a.y * STEP / 3 }),
      b: limit({ x: end.x - b.x * STEP / 3, y: end.y - b.y * STEP / 3 }), end };
  });
}

/** Rounded squash cuts, with visible variation outside the untouched opaque center. */
export function medallionShape(id: number): { path: string; curves: readonly Cubic[] } {
  const curves = squashGeometry(id);
  return { path: path(curves), curves };
}

/** One structural skin crescent. It cannot mark a digit, note or game state. */
export function squashRind(id: number): { path: string; curves: readonly Cubic[] } {
  const outer = squashGeometry(id), inner = squashGeometry(id, 3.5);
  const start = Math.floor(seededUnit(id, 15) * SEGMENTS);
  const indices = Array.from({ length: 10 }, (_, index) => (start + index) % SEGMENTS);
  const outside = indices.map(index => outer[index]), inside = indices.map(index => inner[index]).reverse().map(reverse);
  const curves = [...outside, segment(outside.at(-1)!.end, inside[0].start), ...inside,
    segment(inside.at(-1)!.end, outside[0].start)];
  return { path: path(curves), curves };
}

export const medallionPath = (id: number): string => medallionShape(id).path;
export const squashRindPath = (id: number): string => squashRind(id).path;
