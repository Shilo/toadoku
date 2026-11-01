import { describe, expect, it } from 'vitest';
import { createLayout, type Rect } from '../src/lib/layout';
import { cauldronVessel } from '../src/lib/scene/cauldron';
import { evaluate, type Curve, type Point } from '../src/lib/scene/geometry';
import { medallionShape } from '../src/lib/leaves/medallion';
import { digitGeometry, noteGeometry, type Cubic } from '../src/lib/leaves/shape';
import { presentation } from '../src/lib/theme/presentation';

const sizes = [[304, 552], [344, 784], [784, 344], [1264, 704]];
const polygon = (curves: readonly Curve[]) => curves.flatMap(c => Array.from({ length: 16 }, (_, i) => evaluate(c, i / 16)));
function inside(points: Point[], p: Point): boolean {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
const pointsIn = (r: Rect) => Array.from({ length: 25 }, (_, i) => ({ x: r.x + .01 + (r.width - .02) * (i % 5) / 4, y: r.y + .01 + (r.height - .02) * Math.floor(i / 5) / 4 }));
const disjoint = (curve: Curve, rect: Rect) => Math.max(...curve.map(p => p.x)) < rect.x
  || Math.min(...curve.map(p => p.x)) > rect.x + rect.width
  || Math.max(...curve.map(p => p.y)) < rect.y
  || Math.min(...curve.map(p => p.y)) > rect.y + rect.height;

describe('Cauldron vessel presentation', () => {
  it('preserves every game leaf envelope while backing every dock target', () => {
    for (const [width, height] of sizes) for (const shape of ['fill', 'square'] as const) {
      const layout = createLayout(width, height, shape), before = structuredClone(layout);
      const vessel = cauldronVessel(layout, 'game');
      expect(layout).toEqual(before);
      expect(vessel).toEqual(cauldronVessel(layout, 'game'));
      expect(vessel.transpose).toBe(layout.landscape);
      expect(vessel.wet).not.toBe(vessel.dry);
      for (const curve of [...vessel.boundaries.wet, ...vessel.boundaries.dry]) {
        for (const p of curve) {
          expect(p.y).toBeGreaterThanOrEqual(vessel.leafLimit);
          expect(p.y).toBeLessThanOrEqual(vessel.dryLimit);
        }
      }
      const wet = polygon(vessel.contours.wet), dry = polygon(vessel.contours.dry);
      const map = (p: Point) => vessel.transpose ? { x: p.y, y: p.x } : p;
      for (const p of pointsIn(layout.dock)) expect(inside(dry, map(p)), `${width}x${height} dock`).toBe(true);
      for (const { anchor: a } of layout.cells) for (let n = 0; n < 24; n++) {
        const angle = n * Math.PI / 12, radius = a.width / 2 + presentation.geometry.waterClearance;
        expect(inside(wet, map({ x: a.x + a.width / 2 + Math.cos(angle) * radius, y: a.y + a.height / 2 + Math.sin(angle) * radius }))).toBe(false);
      }
      expect(vessel.wet + vessel.dry).not.toMatch(/NaN|Infinity/);
    }
  });

  it('backs menu actions without crossing full title/art float rectangles', () => {
    for (const [width, height] of sizes) {
      const layout = createLayout(width, height), vessel = cauldronVessel(layout, 'menu');
      const wet = polygon(vessel.contours.wet), dry = polygon(vessel.contours.dry);
      const controls = [layout.menuPanel, { x: width - layout.keySize, y: height - layout.keySize, width: layout.keySize, height: layout.keySize }];
      for (const p of controls.flatMap(pointsIn)) expect(inside(dry, p), `${width}x${height} menu at ${p.x},${p.y}`).toBe(true);
      for (const identity of [layout.menuTitle, layout.menuArt]) {
        const travel = presentation.motion.identityTravel;
        const protectedRect = { x: identity.x - travel, y: identity.y - travel, width: identity.width + travel * 2, height: identity.height + travel * 2 };
        for (const curve of vessel.boundaries.wet) expect(disjoint(curve, protectedRect), `${width}x${height} identity hull`).toBe(true);
        for (const p of pointsIn(protectedRect)) expect(inside(wet, p), `${width}x${height} identity interior`).toBe(false);
      }
      expect(vessel.transpose).toBe(false);
      for (const curves of [vessel.boundaries.wet, vessel.boundaries.dry]) for (let i = 1; i < curves.length; i++) {
        expect(curves[i - 1][3]).toEqual(curves[i][0]);
        const a = curves[i - 1], b = curves[i];
        const incoming = { x: a[3].x - a[2].x, y: a[3].y - a[2].y };
        const outgoing = { x: b[1].x - b[0].x, y: b[1].y - b[0].y };
        expect(incoming.x * outgoing.y - incoming.y * outgoing.x).toBeCloseTo(0);
        expect(incoming.x * outgoing.x + incoming.y * outgoing.y).toBeGreaterThan(0);
      }
    }
  });
});

describe('opaque potion medallions', () => {
  it('keeps all 81 deterministic faces within the existing hull and protects digits/notes', () => {
    const paths = new Set<string>();
    for (let id = 0; id < 81; id++) {
      const shape = medallionShape(id);
      expect(shape).toEqual(medallionShape(id));
      paths.add(shape.path);
      const curves = shape.curves.map((c: Cubic): Curve => [c.start, c.a, c.b, c.end]);
      for (const curve of curves) for (const p of curve) expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThanOrEqual(presentation.geometry.leafControlRadius * 100);
      const outline = polygon(curves);
      for (let n = 0; n < 72; n++) expect(inside(outline, { x: 50 + 36 * Math.cos(n * Math.PI / 36), y: 50 + 36 * Math.sin(n * Math.PI / 36) })).toBe(true);
      for (const diameter of [28, 33.77, 48, 80, 160]) {
        const digit = digitGeometry(diameter);
        const boxes = [{ x: 0, y: 0, width: digit.width, height: digit.height }, ...noteGeometry(diameter).map(n => ({ x: n.x, y: n.y, width: n.size, height: n.size }))];
        for (const box of boxes) for (const x of [-.5, .5]) for (const y of [-.5, .5]) expect(inside(outline, { x: 50 + (box.x + x * box.width) / diameter * 100, y: 50 + (box.y + y * box.height) / diameter * 100 })).toBe(true);
      }
      for (let i = 1; i < curves.length; i++) expect(curves[i - 1][3]).toEqual(curves[i][0]);
      expect(curves.at(-1)![3]).toEqual(curves[0][0]);
    }
    expect(paths.size).toBe(81);
  });
});
