import { describe, expect, it } from 'vitest';
import { createLayout } from '../src/lib/layout';
import { boardWater, evaluate, protectedFaceRadius, type Contour, type Point, type WaterGeometry } from '../src/lib/scene/geometry';
import { cauldronBubbles, cauldronLiquid, cauldronLiquidProfile, cauldronVessel, cauldronMenu, cauldronMenuSites, simmerProfile } from '../src/lib/scene/cauldron';
import { presentation } from '../src/lib/theme/presentation';

const sizes = [[304, 552], [344, 784], [784, 344], [688, 688], [864, 870], [1264, 704], [1400, 1400]];
const points = (contour: Contour) => contour.curves.flatMap(curve => Array.from({ length: 20 }, (_, i) => evaluate(curve, i / 20)));
function winding(outline: Point[], p: Point) {
  let result = 0;
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (p.x - a.x) * (b.y - a.y);
    if (a.y <= p.y && b.y > p.y && cross > 0) result++;
    if (a.y > p.y && b.y <= p.y && cross < 0) result--;
  }
  return result;
}
const owner = (shapes: { color: number; outline: Point[] }[], p: Point) => [0, 1, 2].filter(color => shapes.filter(shape => shape.color === color).reduce((n, shape) => n + winding(shape.outline, p), 0) !== 0);

describe('responsive flowing and simmering liquid', () => {
  it('keeps useful local junction curvature in square and near-square allocations', () => {
    for (const [width, height] of sizes) for (const shape of ['fill', 'square'] as const) {
      const layout = createLayout(width, height, shape), before = structuredClone(layout), diameter = layout.cells[0].anchor.width;
      for (const time of [0, 3, 6, 9]) {
        for (const water of [boardWater(layout, time), cauldronLiquid(layout, 'game', time) as WaterGeometry]) {
          expect(water.junctionRadii).toHaveLength(4);
          expect(Math.min(...water.junctionRadii), `${width}x${height} ${shape}`).toBeGreaterThan(diameter * .12);
          expect(water.layers).toHaveLength(3);
          expect(water.layers.map(layer => layer.color)).toEqual([0, 1, 2]);
          expect(water.layers.map(layer => layer.d).join('')).not.toMatch(/NaN|Infinity/);
        }
      }
      expect(layout).toEqual(before);
    }
  });
  it('gives Cauldron distinct live rounded contours rather than a frozen Pond partition', () => {
    for (const [width, height] of sizes) {
      const layout = createLayout(width, height);
      const zero = cauldronLiquid(layout, 'game', 0).layers;
      expect(zero).not.toEqual(boardWater(layout, 0).layers);
      expect(cauldronLiquid(layout, 'game', 3).layers).not.toEqual(zero);
      expect(cauldronLiquid(layout, 'game', cauldronLiquidProfile.period).layers).toEqual(zero);
      expect(cauldronLiquid(layout, 'menu', 3).layers).not.toEqual(cauldronLiquid(layout, 'menu', 0).layers);
      expect(cauldronLiquid(layout, 'game', 0).layers).toEqual(zero);
    }
  });
  it('preserves every full swept face in its logical group during simmer extrema', () => {
    for (const [width, height] of sizes) for (const shape of ['fill', 'square'] as const) {
      const layout = createLayout(width, height, shape);
      for (const time of [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5]) {
        const liquid = cauldronLiquid(layout, 'game', time) as WaterGeometry;
        const shapes = liquid.contours.map(contour => ({ color: contour.color, outline: points(contour) }));
        for (const cell of layout.cells) {
          const a = cell.anchor, radius = protectedFaceRadius(a.width);
          const expected = (Math.floor(cell.row / 3) + Math.floor(cell.column / 3)) % 3;
          for (let n = 0; n < 16; n++) {
            const angle = n * Math.PI / 8;
            expect(owner(shapes, { x: a.x + a.width / 2 + radius * Math.cos(angle), y: a.y + a.height / 2 + radius * Math.sin(angle) }),
              `${width}x${height} ${shape} t${time} cell${cell.id}`).toEqual([expected]);
          }
        }
      }
    }
  }, 30000);
  it('fits exactly one liquid color at unrelated probes through rounded junctions', () => {
    for (const [width, height] of [[688, 688], [1264, 704]]) {
      const layout = createLayout(width, height);
      for (const time of [0, 3, 6, 9]) {
        const liquid = cauldronLiquid(layout, 'game', time) as WaterGeometry;
        const shapes = liquid.contours.map(contour => ({ color: contour.color, outline: points(contour) }));
        for (let y = layout.board.y + 1.371; y < layout.board.y + layout.board.height; y += 15.3) for (let x = layout.board.x + .783; x < layout.board.x + layout.board.width; x += 13.7) expect(owner(shapes, { x, y })).toHaveLength(1);
      }
    }
  });
});

describe('sparse opaque simmer bubbles', () => {
  it('keeps each complete independent bubble sweep clear of all faces and within its own fill', () => {
    for (const [width, height] of sizes) for (const shape of ['fill', 'square'] as const) {
      const layout = createLayout(width, height, shape);
      for (let frame = 0; frame < 28; frame++) {
        const time = frame / 2, bubbles = cauldronBubbles(layout, 'game', time);
        expect(bubbles.length).toBeLessThanOrEqual(simmerProfile.maximum);
        expect(bubbles.length).toBeGreaterThan(0);
        const liquid = cauldronLiquid(layout, 'game', time) as WaterGeometry;
        const shapes = liquid.contours.map(contour => ({ color: contour.color, outline: points(contour) }));
        for (const bubble of bubbles) {
          expect(bubble.radius).toBeGreaterThanOrEqual(simmerProfile.minimumRadius);
          expect(bubble.radius).toBeLessThanOrEqual(simmerProfile.maximumRadius);
          expect(bubble.innerRadius).toBeGreaterThanOrEqual(0);
          expect(bubble.innerRadius).toBeLessThanOrEqual(bubble.radius);
          for (const { anchor: a } of layout.cells) expect(Math.hypot(bubble.x - a.x - a.width / 2, bubble.y - a.y - a.height / 2) - bubble.radius).toBeGreaterThan(protectedFaceRadius(a.width));
          const expected = (Math.floor(bubble.group / 3) + bubble.group % 3) % 3;
          for (let n = 0; n < 12; n++) {
            const angle = n * Math.PI / 6;
            expect(owner(shapes, { x: bubble.x + bubble.radius * Math.cos(angle), y: bubble.y + bubble.radius * Math.sin(angle) })).toEqual([expected]);
          }
        }
      }
    }
  }, 30000);
  it('uses the same active time for repeatable static reduced poses and actual visible events', () => {
    const layout = createLayout(344, 784);
    const zero = cauldronBubbles(layout, 'game', 0);
    expect(cauldronBubbles(layout, 'game', 0)).toEqual(zero);
    expect(cauldronBubbles(layout, 'game', 3)).not.toEqual(zero);
    for (const screen of ['game', 'menu'] as const) {
      for (const time of [0, 1, 3, 5, 9]) {
        const bubbles = cauldronBubbles(layout, screen, time);
        expect(bubbles.length).toBeLessThanOrEqual(4);
        for (const bubble of bubbles) expect(bubble.color).toBeGreaterThanOrEqual(0);
      }
    }
    // The established swept bound still covers every visual layer without changing targets.
    const d = 28;
    expect(protectedFaceRadius(d)).toBeCloseTo(presentation.geometry.leafControlRadius * d + 1.43);
  });
});


describe('immersive menu and manufactured pot', () => {
  it('keeps pale pool hulls outside the title and all three liquid fills visibly substantial', () => {
    for (const [width, height] of sizes) {
      const layout = createLayout(width, height), t = layout.menuTitle, travel = presentation.motion.identityTravel;
      const title = { x: t.x - travel, y: t.y - travel, right: t.x + t.width + travel, bottom: t.y + t.height + travel };
      for (const time of [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5]) {
        const menu = cauldronMenu(layout, time);
        for (const contour of menu.contours.filter(c => c.color === 2)) for (const curve of contour.curves) {
          expect(Math.max(...curve.map(p => p.x)) < title.x || Math.min(...curve.map(p => p.x)) > title.right
            || Math.max(...curve.map(p => p.y)) < title.y || Math.min(...curve.map(p => p.y)) > title.bottom,
            `${width}x${height} pale-title hull`).toBe(true);
        }
        const painted = menu.contours.map(contour => ({ color: contour.color, outline: points(contour) }));
        const ground = points({ color: 0, curves: cauldronVessel(layout, 'menu').contours.wet });
        const counts = [0, 0, 0];
        for (let row = 0; row < 40; row++) for (let column = 0; column < 40; column++) {
          const p = { x: (column + .5) * width / 40, y: (row + .5) * height / 40 };
          if (winding(ground, p) || [layout.menuTitle, layout.menuArt].some(r => p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height)) continue;
          let color = 0;
          for (const contour of painted) if (winding(contour.outline, p)) color = contour.color;
          counts[color]++;
        }
        const visible = counts.reduce((sum, count) => sum + count, 0);
        for (const count of counts) expect(count / visible, `${width}x${height} phase${time} visible areas ${counts}`).toBeGreaterThan(.035);
        expect(menu.layers.map(layer => layer.d).join('')).not.toMatch(/NaN|Infinity/);
      }
    }
  });
  it('certifies nine whole menu bubble sweeps clear of title, art and vessel at all required sizes', () => {
    for (const [width, height] of [[304, 552], [344, 784], [784, 344], [1264, 704]]) {
      const layout = createLayout(width, height), sites = cauldronMenuSites(layout), ground = cauldronVessel(layout, 'menu');
      const wetLimit = Math.min(...ground.boundaries.wet.flat().map(p => p.y));
      expect(sites, `${width}x${height} safe sites`).toHaveLength(9);
      expect(cauldronMenuSites(layout)).toEqual(sites);
      expect(Math.max(...sites.map(s => s.y)) - Math.min(...sites.map(s => s.y))).toBeGreaterThan(sites[0].maximumRadius * 3);
      for (const [index, site] of sites.entries()) {
        for (const other of sites.slice(index + 1)) expect(Math.hypot(site.x - other.x, site.y - other.y)).toBeGreaterThanOrEqual(site.maximumRadius * 3);
        const radius = site.maximumRadius + site.drift;
        expect(site.y + radius).toBeLessThan(wetLimit);
        expect(site.x - radius).toBeGreaterThan(0); expect(site.x + radius).toBeLessThan(width);
        for (const identity of [layout.menuTitle, layout.menuArt]) {
          const travel = presentation.motion.identityTravel;
          const x = Math.max(identity.x - travel, Math.min(site.x, identity.x + identity.width + travel));
          const y = Math.max(identity.y - travel, Math.min(site.y, identity.y + identity.height + travel));
          expect(Math.hypot(site.x - x, site.y - y)).toBeGreaterThan(radius);
        }
      }
      for (let frame = 0; frame < 28; frame++) expect(cauldronBubbles(layout, 'menu', frame / 2).length).toBeGreaterThan(0);
    }
  });
  it('reuses immutable layout-only site certificates without retaining replaced layouts', () => {
    const layout = createLayout(344, 784), before = structuredClone(layout);
    const sites = cauldronMenuSites(layout);
    for (const time of [0, 1, 3, 6]) cauldronBubbles(layout, 'menu', time);
    expect(cauldronMenuSites(layout)).toBe(sites);
    expect(Object.isFrozen(sites)).toBe(true);
    expect(sites.every(Object.isFrozen)).toBe(true);
    expect(() => Object.assign(sites[0], { x: -100 })).toThrow(TypeError);
    const resized = createLayout(864, 870);
    expect(cauldronMenuSites(resized)).not.toBe(sites);
    expect(layout).toEqual(before);
  });
});
