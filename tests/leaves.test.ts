import { describe, expect, it } from 'vitest';
import { digitGeometry, focusGeometry, leafEnvelope, leafShape, noteGeometry, type Cubic, type Point } from '../src/lib/leaves/shape';
import { pond } from '../src/lib/theme/pond';
import { floatOffset } from '../src/lib/motion/float';

function cubic(curve: Cubic, t: number): Point {
  const s = 1 - t;
  return {
    x: s ** 3 * curve.start.x + 3 * s ** 2 * t * curve.a.x + 3 * s * t ** 2 * curve.b.x + t ** 3 * curve.end.x,
    y: s ** 3 * curve.start.y + 3 * s ** 2 * t * curve.a.y + 3 * s * t ** 2 * curve.b.y + t ** 3 * curve.end.y,
  };
}
function inside(point: Point, polygon: Point[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

describe('stable leaf geometry', () => {
  it('keeps every cubic hull bounded and the full opaque disk intact, with a real notch', () => {
    const paths = new Set<string>();
    for (let id = 0; id < 81; id++) {
      const shape = leafShape(id);
      expect(shape).toEqual(leafShape(id));
      paths.add(shape.path);
      for (const curve of shape.curves) {
        for (const point of [curve.start, curve.a, curve.b, curve.end]) {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
          expect(Math.hypot(point.x - 50, point.y - 50)).toBeLessThanOrEqual(pond.geometry.leafControlRadius * 100);
        }
      }
      const polygon = shape.curves.flatMap((curve) => Array.from({ length: 12 }, (_, n) => cubic(curve, n / 12)));
      for (let n = 0; n < 72; n++) {
        const angle = n * Math.PI * 2 / 72;
        expect(inside({ x: 50 + Math.cos(angle) * 36, y: 50 + Math.sin(angle) * 36 }, polygon)).toBe(true);
      }
      expect(inside({ x: 50 + Math.cos(shape.notchAngle) * 42,
        y: 50 + Math.sin(shape.notchAngle) * 42 }, polygon)).toBe(false);
      // Digit paint uses a circle; candidate line boxes include their corners.
      for (const diameter of [28, 33.77, 48, 80, 160]) {
        const digit = digitGeometry(diameter);
        expect(digit.width).toBe(digit.height);
        for (let n = 0; n < 72; n++) {
          const angle = n * Math.PI * 2 / 72;
          const point = { x: 50 + Math.cos(angle) * digit.width / diameter * 50,
            y: 50 + Math.sin(angle) * digit.height / diameter * 50 };
          expect(Math.hypot(point.x - 50, point.y - 50)).toBeLessThanOrEqual(36 + 1e-9);
          expect(inside(point, polygon)).toBe(true);
        }
        for (const note of noteGeometry(diameter)) {
          for (const dx of [-0.5, 0.5]) for (const dy of [-0.5, 0.5]) {
            const point = { x: 50 + (note.x + dx * note.size) / diameter * 100,
              y: 50 + (note.y + dy * note.size) / diameter * 100 };
            expect(Math.hypot(point.x - 50, point.y - 50)).toBeLessThan(36);
            expect(inside(point, polygon)).toBe(true);
          }
        }
      }
    }
    expect(paths.size).toBe(81);
  });

  it('bounds combined face/lip, independent float, and selected lift within the fixed anchor', () => {
    for (const diameter of [28, 33.77, 48, 80, 160]) {
      expect(leafEnvelope(diameter)).toBeLessThanOrEqual(diameter / 2);
      // Water worker receives a larger nominal-circle envelope.
      expect(leafEnvelope(diameter)).toBeLessThan(diameter / 2 + pond.geometry.waterClearance);
      for (const bead of focusGeometry(diameter)) {
        const focusedEnvelope = Math.hypot(bead.x, bead.y) + bead.outerRadius
          + pond.surface.leafSelectedLift + pond.motion.leafTravel;
        expect(bead.outerRadius * 2).toBe(pond.surface.focusBeadSize);
        expect(focusedEnvelope).toBeLessThan(leafEnvelope(diameter));
      }
    }
    for (let id = 0; id < 81; id++) for (let time = 0; time < 120; time += 0.37) {
      const offset = floatOffset(id, time, 'leaf');
      expect(Math.hypot(offset.x, offset.y)).toBeLessThanOrEqual(pond.motion.leafTravel);
      const identity = floatOffset(id, time, 'identity');
      expect(Math.hypot(identity.x, identity.y)).toBeLessThanOrEqual(pond.motion.identityTravel);
    }
  });
});
