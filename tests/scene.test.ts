import { describe, expect, it } from 'vitest';
import { createLayout, type Rect } from '../src/lib/layout';
import { boardWater, evaluate, menuShallows, shore, protectedFaceRadius, type Contour, type Point } from '../src/lib/scene/geometry';
import { pond } from '../src/lib/theme/pond';

const sizes = [[344, 784], [784, 344], [377, 857], [857, 377], [1000, 700], [700, 1000], [480, 480], [304, 584], [292, 552], [344, 487.2], [487.2, 344]];
function polygon(contour: Contour): Point[] {
  return contour.curves.flatMap(c => Array.from({ length: 12 }, (_, i) => evaluate(c, i / 12)));
}
function winding(points: Point[], p: Point): number {
  let result = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
    if (a.y <= p.y && b.y > p.y && cross > 0) result++;
    if (a.y > p.y && b.y <= p.y && cross < 0) result--;
  }
  return result;
}
const ownership = (shapes: { color: number; points: Point[] }[], p: Point) => [0, 1, 2].filter(color => shapes.filter(s => s.color === color).reduce((n, s) => n + winding(s.points, p), 0) !== 0);

describe('shared three-color scene partition', () => {
  it('preserves every actual visible face union with independent full motion reserve', () => {
    for (const [width, height] of sizes) {
      const layout = createLayout(width, height);
      for (let frame = 0; frame < 24; frame++) {
        const water = boardWater(layout, frame);
        const shapes = water.contours.map(c => ({ color: c.color, points: polygon(c) }));
        expect(water.layers).toHaveLength(3);
        expect(water.layers.every(l => !/NaN|Infinity/.test(l.d))).toBe(true);
        expect(water.junctionRadii.every(r => r > 0)).toBe(true);
        for (const cell of layout.cells) {
          const a = cell.anchor, radius = protectedFaceRadius(a.width);
          const expected = (Math.floor(cell.row / 3) + Math.floor(cell.column / 3)) % 3;
          for (let angle = 0; angle < 16; angle++) {
            const p = { x: a.x + a.width / 2 + radius * Math.cos(angle * Math.PI / 8), y: a.y + a.height / 2 + radius * Math.sin(angle * Math.PI / 8) };
            expect(ownership(shapes, p), `${width}x${height}, frame${frame}, cell${cell.id}, angle${angle}`).toEqual([expected]);
          }
        }
      }
    }
  }, 30000);

  it('partitions winding junctions exactly once, with finite broad fillets', () => {
    const layout = createLayout(344, 784);
    for (let frame = 0; frame < 24; frame += 3) {
      const shapes = boardWater(layout, frame).contours.map(c => ({ color: c.color, points: polygon(c) }));
      for (let y = 1.371; y < layout.board.height; y += 11.3) for (let x = .783; x < layout.board.width; x += 9.7) {
        expect(ownership(shapes, { x, y })).toHaveLength(1);
      }
    }
  });

  it('has a repeatable 24 second clock without geometry state', () => {
    const layout = createLayout(344, 784);
    const zero = boardWater(layout, 0).layers;
    expect(boardWater(layout, 24).layers).toEqual(zero);
    expect(boardWater(layout, 6).layers).not.toEqual(zero);
  });
});

describe('ground clearance', () => {
  it('keeps every bank hull between independent leaf envelopes and all dock controls', () => {
    for (const [width, height] of sizes) {
      const layout = createLayout(width, height), ground = shore(layout, 'game');
      for (const boundary of [ground.boundaries.wet, ground.boundaries.dry]) {
        // Every actual cubic control, including the formerly implicit S
        // reflection, is inside the strip. Convexity protects every phase.
        const nearShore = boundary.flat().map(p => p.y);
        expect(Math.min(...nearShore)).toBeGreaterThanOrEqual(ground.leafLimit);
        expect(Math.max(...nearShore)).toBeLessThanOrEqual(ground.dryLimit);
      }
      expect(ground.transpose).toBe(layout.landscape);
      expect(ground.dry).not.toBe(ground.wet);
      const wet = polygon({ color: 0, curves: ground.contours.wet });
      for (const { anchor: a } of layout.cells) for (let angle = 0; angle < 16; angle++) {
        const radius = a.width / 2 + 1.5;
        const x = a.x + a.width / 2 + radius * Math.cos(angle * Math.PI / 8);
        const y = a.y + a.height / 2 + radius * Math.sin(angle * Math.PI / 8);
        expect(winding(wet, ground.transpose ? { x: y, y: x } : { x, y })).toBe(0);
      }
    }
  });

  it('covers every gameplay dock and maximum menu panel, including landscape cove corners', () => {
    const pointsIn = (r: Rect) => Array.from({ length: 81 }, (_, i) => ({ x: r.x + .01 + (r.width - .02) * (i % 9) / 8, y: r.y + .01 + (r.height - .02) * Math.floor(i / 9) / 8 }));
    for (const [width, height] of [...sizes, [400, 300], [1600, 700]]) {
      const layout = createLayout(width, height);
      for (const screen of ['game', 'menu'] as const) {
        const ground = shore(layout, screen), dry = polygon({ color: 0, curves: ground.contours.dry });
        const controls = screen === 'game' ? [layout.dock] : [layout.menuPanel, { x: width - layout.keySize, y: height - layout.keySize, width: layout.keySize, height: layout.keySize }];
        for (const p of controls.flatMap(pointsIn)) expect(winding(dry, ground.transpose ? { x: p.y, y: p.x } : p), `${width}x${height} ${screen}: ${p.x},${p.y}`).not.toBe(0);
        if (screen === 'menu' && layout.landscape) {
          // The cove cannot cut into the panel: the left bank is above it;
          // remaining cubic hulls are entirely to its right.
          expect(Math.max(...ground.boundaries.dry[0].map(p => p.y))).toBeLessThan(layout.menuPanel.y);
          expect(Math.min(...ground.boundaries.dry.slice(1).flat().map(p => p.x))).toBeGreaterThanOrEqual(layout.menuPanel.width);
          expect(Math.max(...ground.boundaries.dry.flat().map(p => p.x))).toBeLessThan(width - layout.keySize);
        }
      }
    }
  });
});

describe('cream title water contrast corridor', () => {
  const layouts = [[344, 784], [784, 344], [377, 857], [857, 377], [1000, 700], [700, 1000], [400, 300], [1600, 700]];
  it('excludes shallow/ground from the entire independent title float envelope', () => {
    for (const [width, height] of layouts) {
      const layout = createLayout(width, height), ground = shore(layout, 'menu');
      for (let phase = 0; phase < 24; phase++) {
        const water = menuShallows(layout, phase), title = water.protectedTitle;
        const shapes = water.contours.map(polygon);
        const wet = polygon({ color: 0, curves: ground.contours.wet });
        for (let y = 0; y <= 8; y++) for (let x = 0; x <= 8; x++) {
          const p = { x: title.x + title.width * x / 8, y: title.y + title.height * y / 8 };
          expect(shapes.every(s => winding(s, p) === 0)).toBe(true);
          expect(winding(wet, p)).toBe(0);
        }
      }
    }
  });

  it('proves all-time title exclusion with convex hulls and smooth vertical joins', () => {
    for (const [width, height] of layouts) {
      const layout = createLayout(width, height), { boundaries, protectedTitle: title } = menuShallows(layout);
      for (const [i, curves] of boundaries.entries()) {
        expect(Math.max(...curves.slice(0, 2).flat().map(p => p.y))).toBeLessThan(title.y);
        expect(Math.min(...curves.slice(3).flat().map(p => p.y))).toBeGreaterThan(title.y + title.height);
        const bandX = curves[2].map(p => p.x);
        if (i === 0) expect(Math.max(...bandX)).toBeLessThan(title.x);
        else expect(Math.min(...bandX)).toBeGreaterThan(title.x + title.width);
        const pre = curves[1];
        const preHorizontalSpan = Math.max(...pre.map(p => p.x)) - Math.min(...pre.map(p => p.x));
        expect(preHorizontalSpan).toBeLessThanOrEqual((pre[3].y - pre[0].y) * .5 + 1e-9);
        for (let join = 1; join < 4; join++) {
          const a = curves[join], b = curves[join + 1];
          expect(a[3]).toEqual(b[0]);
          expect(a[3].x - a[2].x).toBeCloseTo(0);
          expect(b[1].x - b[0].x).toBeCloseTo(0);
          expect(a[3].y - a[2].y).toBeCloseTo(b[1].y - b[0].y);
          expect(b[1].y - b[0].y).toBeGreaterThan(0);
        }
        // C1 alone permits almost straight diagonals and pointed-looking
        // turns. Lower joins need useful physical handles independent of the
        // tiny pre-title clearance in landscape.
        expect(curves[2][3].y - curves[2][2].y).toBeGreaterThan(8);
        expect(curves[3][3].y - curves[3][2].y).toBeGreaterThan(8);
        const bend = curves[4], continuation = curves[5];
        expect(bend[3]).toEqual(continuation[0]);
        expect(bend[3].y - bend[2].y).toBeCloseTo(0);
        expect(continuation[1].y - continuation[0].y).toBeCloseTo(0);
        expect(Math.abs(bend[3].x - bend[2].x)).toBeGreaterThan(8);
      }
      const ground = shore(layout, 'menu');
      if (layout.landscape) {
        const bottom = layout.menuTitle.y + layout.menuTitle.height + pond.motion.identityTravel;
        expect(bottom).toBeLessThan(layout.menuPanel.y);
        for (const curve of ground.boundaries.wet) {
          const minX = Math.min(...curve.map(p => p.x)), maxX = Math.max(...curve.map(p => p.x));
          if (minX <= title.x + title.width && maxX >= title.x) expect(Math.min(...curve.map(p => p.y))).toBeGreaterThanOrEqual(bottom);
        }
      }
    }
  });
});
