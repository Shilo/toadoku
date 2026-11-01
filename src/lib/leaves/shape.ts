import { presentation as pond } from '../theme/presentation';
import { seededUnit } from '../motion/float';

export interface Point { x: number; y: number }
export interface Cubic { start: Point; a: Point; b: Point; end: Point }
export interface LeafShape { path: string; curves: readonly Cubic[]; notchAngle: number }
const TAU = Math.PI * 2;
const center = { x: 50, y: 50 };
const polar = (angle: number, radius: number): Point => ({
  x: center.x + Math.cos(angle) * radius,
  y: center.y + Math.sin(angle) * radius,
});
const pair = ({ x, y }: Point) => `${x.toFixed(4)} ${y.toFixed(4)}`;

function limit(point: Point): Point {
  const dx = point.x - 50;
  const dy = point.y - 50;
  const length = Math.hypot(dx, dy);
  const scale = Math.min(1, (pond.geometry.leafControlRadius * 100 - 0.002) / length);
  return { x: 50 + dx * scale, y: 50 + dy * scale };
}

/** Fresh smooth perimeter. No runtime randomness, IDs, assets or viewport dependencies. */
export function leafShape(id: number): LeafShape {
  const phase = seededUnit(id, 5) * TAU;
  const angle = Math.floor(seededUnit(id, 6) * 4) * Math.PI / 2
    + (seededUnit(id, 7) - 0.5) * 0.22;
  const mouth = 0.065 + seededUnit(id, 8) * 0.025;
  const radius = (theta: number) => pond.geometry.leafRadius * 100
    + 0.18 * Math.sin(theta * 2 + phase)
    + 0.12 * Math.sin(theta * 3 - phase)
    + 0.08 * Math.sin(theta * 5 + phase * 2);
  const startAngle = angle + mouth;
  const span = TAU - 2 * mouth;
  const segments = 32;
  const points = Array.from({ length: segments + 1 }, (_, n) => {
    const theta = startAngle + span * n / segments;
    return polar(theta, radius(theta));
  });
  const tangent = (theta: number): Point => {
    const e = 0.0001;
    const before = polar(theta - e, radius(theta - e));
    const after = polar(theta + e, radius(theta + e));
    return { x: (after.x - before.x) / (2 * e), y: (after.y - before.y) / (2 * e) };
  };
  const curves: Cubic[] = [];
  const step = span / segments;
  for (let n = 0; n < segments; n++) {
    const start = points[n];
    const end = points[n + 1];
    const t1 = tangent(startAngle + n * step);
    const t2 = tangent(startAngle + (n + 1) * step);
    curves.push({ start, a: limit({ x: start.x + t1.x * step / 3, y: start.y + t1.y * step / 3 }),
      b: limit({ x: end.x - t2.x * step / 3, y: end.y - t2.y * step / 3 }), end });
  }
  const depth = pond.geometry.cleftMinDepth
    + seededUnit(id, 9) * (pond.geometry.cleftMaxDepth - pond.geometry.cleftMinDepth);
  const tipRadius = Math.max(38.1, (pond.geometry.leafRadius - depth) * 100);
  const tip = polar(angle, tipRadius);
  curves.push({ start: points[segments], a: polar(angle - mouth * 0.65, 42),
    b: polar(angle - 0.012, tipRadius), end: tip });
  curves.push({ start: tip, a: polar(angle + 0.012, tipRadius),
    b: polar(angle + mouth * 0.65, 42), end: points[0] });
  const path = `M${pair(points[0])}${curves.map(({ a, b, end }) => `C${pair(a)} ${pair(b)} ${pair(end)}`).join('')}Z`;
  return { path, curves, notchAngle: angle };
}

/** Convex-hull plus triangle inequality, valid for independently phased translations. */
export function leafEnvelope(diameter: number): number {
  return pond.geometry.leafControlRadius * diameter
    + Math.max(pond.surface.leafSelectedLift, pond.surface.leafLipDepth)
    + pond.motion.leafTravel;
}

/** Candidate centers and full square line boxes fit radius .3501D within opaque .36D. */
export function noteGeometry(diameter: number) {
  const size = Math.min(diameter * 0.165, pond.typography.noteMax);
  return Array.from({ length: 9 }, (_, index) => ({
    digit: index + 1,
    x: ((index % 3) - 1) * size,
    y: (Math.floor(index / 3) - 1) * size,
    size,
  }));
}

/** This complete paint box fits the guaranteed opaque disk, including fallback fonts. */
export function digitGeometry(diameter: number) {
  return { width: diameter * 0.44, height: diameter * 0.56 };
}

/** Focus cues use a physical-size semantic token while their centers follow the leaf. */
export function focusGeometry(diameter: number) {
  return [
    { x: -diameter * 0.1, y: diameter * 0.36 },
    { x: diameter * 0.02, y: diameter * 0.37 },
  ].map((center, index) => ({ ...center, id: index,
    outerRadius: pond.surface.focusBeadSize / 2 }));
}
