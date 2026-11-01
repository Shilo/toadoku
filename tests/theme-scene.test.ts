import { describe, expect, it } from 'vitest';
import { createLayout, type Rect } from '../src/lib/layout';
import { cauldronVessel } from '../src/lib/scene/cauldron';
import { evaluate, protectedFaceRadius, rimBand, shore, type Curve, type Point } from '../src/lib/scene/geometry';
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
  it('fits the third-color ribbon inside each existing wet bank without widening it', () => {
    for (const [width, height] of [...sizes, [864, 870]]) for (const shape of ['fill', 'square'] as const) for (const screen of ['menu', 'game'] as const) {
      const layout = createLayout(width, height, shape);
      for (const [geometry, nominal] of [[shore(layout, screen), 1.5], [cauldronVessel(layout, screen), 2]] as const) {
        const { wet, dry } = geometry.boundaries, band = rimBand(wet, dry, nominal), n = wet.length;
        expect(band).toHaveLength(n * 2 + 2);
        expect(geometry.rim).toBeTruthy(); expect(geometry.rim).not.toMatch(/NaN|Infinity/);
        const wetRegion = polygon(geometry.contours.wet), dryRegion = polygon(geometry.contours.dry);
        for (let i = 0; i < n; i++) for (const t of [.25, .5, .75]) {
          const a = evaluate(band[i], t), b = evaluate(band[2 * n - i], 1 - t);
          expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(nominal + .000001);
          const p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const w = geometry.transpose ? height : width;
          if (p.x > 0 && p.x < w) {
            expect(inside(wetRegion, p)).toBe(true);
            expect(inside(dryRegion, p)).toBe(false);
          }
        }
      }
    }
    const curve: Curve = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }];
    expect(rimBand([curve], [curve], 2)).toEqual([]);
    // A zero corridor omits the optional band instead of serializing an empty path.
    const tiny = createLayout(344, 784); tiny.dock.y = 0;
    expect(cauldronVessel(tiny, 'game').rim).toBe('');
  });
  it('uses one exact single-concavity pot arc in every allocation', () => {
    for (const [width, height] of sizes) for (const screen of ['menu', 'game'] as const) {
      const layout = createLayout(width, height), vessel = cauldronVessel(layout, screen);
      const w = vessel.transpose ? layout.height : layout.width;
      for (const boundary of [vessel.boundaries.wet, vessel.boundaries.dry]) {
        expect(boundary).toHaveLength(3);
        const arc = boundary[1];
        expect(arc[0].x).toBe(0); expect(arc[3].x).toBe(w);
        expect(arc[1].x).toBeCloseTo(w / 3); expect(arc[2].x).toBeCloseTo(w * 2 / 3);
        expect(arc[0].y).toBe(arc[3].y); expect(arc[1].y).toBe(arc[2].y);
        expect(evaluate(arc, .5).y).toBeGreaterThan(arc[0].y);
        const first = arc[2].y - 2 * arc[1].y + arc[0].y;
        const last = arc[3].y - 2 * arc[2].y + arc[1].y;
        expect(first).toBeLessThan(0); expect(last).toBeCloseTo(first);
      }
    }
    const desktop = cauldronVessel(createLayout(1264, 704), 'menu').boundaries.wet[1];
    expect(evaluate(desktop, .5).y - desktop[0].y).toBeGreaterThan(48);
  });
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
          const w = vessel.transpose ? layout.height : layout.width;
          // Offscreen tangent continuations are disjoint by x. The complete
          // visible arc hull, including both endpoints, obeys the safe y strip.
          if (p.x >= 0 && p.x <= w) {
            expect(p.y).toBeGreaterThanOrEqual(vessel.leafLimit);
            expect(p.y).toBeLessThanOrEqual(vessel.dryLimit);
          }
        }
      }
      const wet = polygon(vessel.contours.wet), dry = polygon(vessel.contours.dry);
      const map = (p: Point) => vessel.transpose ? { x: p.y, y: p.x } : p;
      for (const p of pointsIn(layout.dock)) expect(inside(dry, map(p)), `${width}x${height} dock`).toBe(true);
      for (const { anchor: a } of layout.cells) for (let n = 0; n < 24; n++) {
        const angle = n * Math.PI / 12, radius = protectedFaceRadius(a.width);
        expect(inside(wet, map({ x: a.x + a.width / 2 + Math.cos(angle) * radius, y: a.y + a.height / 2 + Math.sin(angle) * radius }))).toBe(false);
      }
      expect(vessel.wet + vessel.dry).not.toMatch(/NaN|Infinity/);
    }
  });

  it('backs menu actions and title, with explicit short-landscape art straddling', () => {
    for (const [width, height] of sizes) {
      const layout = createLayout(width, height), vessel = cauldronVessel(layout, 'menu');
      const wet = polygon(vessel.contours.wet), dry = polygon(vessel.contours.dry);
      const controls = [layout.menuPanel, { x: width - layout.keySize, y: height - layout.keySize, width: layout.keySize, height: layout.keySize }];
      for (const p of controls.flatMap(pointsIn)) expect(inside(dry, p), `${width}x${height} menu at ${p.x},${p.y}`).toBe(true);
      const travel = presentation.motion.identityTravel;
      const artStraddles = layout.landscape && Math.max(layout.menuTitle.y + layout.menuTitle.height, layout.menuArt.y + layout.menuArt.height) + travel + 4 >= layout.menuPanel.y;
      const protectedIdentity = artStraddles ? [layout.menuTitle] : [layout.menuTitle, layout.menuArt];
      for (const identity of protectedIdentity) {
        const travel = presentation.motion.identityTravel;
        const protectedRect = { x: identity.x - travel, y: identity.y - travel, width: identity.width + travel * 2, height: identity.height + travel * 2 };
        for (const curve of vessel.boundaries.wet) expect(disjoint(curve, protectedRect), `${width}x${height} identity hull`).toBe(true);
        for (const p of pointsIn(protectedRect)) expect(inside(wet, p), `${width}x${height} identity interior`).toBe(false);
      }
      if (artStraddles) expect(pointsIn(layout.menuArt).some(p => inside(wet, p))).toBe(true);
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
