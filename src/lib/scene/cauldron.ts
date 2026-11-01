import type { Layout } from '../layout';
import { presentation } from '../theme/presentation';
import { partitionWater, protectedFaceRadius, rimBand, type Curve, type Point, type ShoreGeometry, type LiquidProfile, type LiquidFrame, type SceneBubble } from './geometry';
import { seededUnit } from '../motion/float';

const point = (x: number, y: number): Point => ({ x, y });
const segment = (a: Point, b: Point): Curve => [a, point((a.x * 2 + b.x) / 3, (a.y * 2 + b.y) / 3), point((a.x + b.x * 2) / 3, (a.y + b.y * 2) / 3), b];
const pair = (p: Point) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
const path = (curves: Curve[]) => curves.length ? `M${pair(curves[0][0])}${curves.map(c => `C${pair(c[1])} ${pair(c[2])} ${pair(c[3])}`).join('')}Z` : '';

/** One manufactured pot arc, with no internal inflection or plateau.
 * Visible controls stay within the protected scene/control corridor. Straight
 * tangent continuations lie outside the face allocation, avoiding edge kinks. */
export function cauldronVessel(layout: Layout, screen: 'menu' | 'game'): ShoreGeometry {
  const bleed = presentation.geometry.backgroundBleed;
  const travel = presentation.motion.identityTravel;
  const titleBottom = layout.menuTitle.y + layout.menuTitle.height + travel;
  const identityBottom = Math.max(titleBottom, layout.menuArt.y + layout.menuArt.height + travel);
  const transpose = screen === 'game' && layout.landscape;
  const w = transpose ? layout.height : layout.width, h = transpose ? layout.width : layout.height;
  const edge = screen === 'game' ? transpose ? layout.dock.x : layout.dock.y : layout.menuPanel.y;
  // At short landscape heights, protecting the full menu reservation, title
  // and a single arc requires the unchanged provisional art to straddle the rim.
  // It remains above this SVG; bubbles still exclude its full floating bounds.
  const artStraddles = screen === 'menu' && layout.landscape && identityBottom + 4 >= edge;
  const leafLimit = screen === 'game'
    ? Math.max(...layout.cells.map(({ anchor: a }) => (transpose ? a.x + a.width / 2 : a.y + a.height / 2) + protectedFaceRadius(a.width) + .5))
    : artStraddles ? titleBottom : identityBottom;
  const room = Math.max(0, edge - leafLimit), margin = Math.min(4, room * .1), bank = Math.min(10, room * .35);
  const available = Math.max(0, room - margin - bank);
  const amplitude = Math.min(screen === 'menu' ? w * .09 : 24, available * .72);
  const boundary = (wet: boolean): Curve[] => {
    const maximum = edge - margin - (wet ? bank : 0);
    const center = maximum - amplitude / 3, endY = center - amplitude;
    // This is exactly y(t)=center-amplitude+4*amplitude*t*(1-t).
    // Its second derivative is constant, so neither half can become an S wave.
    const left = point(0, endY), right = point(w, endY), slope = 4 * amplitude / w;
    const arc: Curve = [left, point(w / 3, maximum), point(w * 2 / 3, maximum), right];
    const start = point(-bleed, endY - slope * bleed), end = point(w + bleed, endY - slope * bleed);
    return [segment(start, left), arc, segment(right, end)];
  };
  const boundaries = { wet: boundary(true), dry: boundary(false) };
  const close = (b: Curve[]): Curve[] => [...b, segment(b.at(-1)![3], point(w + bleed, h + bleed)), segment(point(w + bleed, h + bleed), point(-bleed, h + bleed)), segment(point(-bleed, h + bleed), b[0][0])];
  const contours = { wet: close(boundaries.wet), dry: close(boundaries.dry) };
  return { wet: path(contours.wet), dry: path(contours.dry), rim: path(rimBand(boundaries.wet, boundaries.dry, 2)), transpose, leafLimit, dryLimit: edge, boundaries, contours };
}

export const vessel = cauldronVessel;


/** Rounded, breathing simmer lobes author a different liquid from Pond's long S flow. */
export const cauldronLiquidProfile: LiquidProfile = {
  period: 12, drift: .42, bend: .88, junction: .95, lobes: true,
};
export const simmerProfile = { period: 14, duty: .32, maximum: 4, minimumRadius: 3, maximumRadius: 8, drift: 1.25 } as const;

/** A softly lobed circular pool; only the three authored liquid roles are painted. */
function pool(cx: number, cy: number, rx: number, ry: number, phase: number): Curve[] {
  const points = Array.from({ length: 16 }, (_, i) => {
    const angle = i * Math.PI / 8, pulse = 1 + .035 * Math.sin(angle * 3 + phase) + .018 * Math.sin(angle * 5 - phase * .7);
    return { x: cx + Math.cos(angle) * rx * pulse, y: cy + Math.sin(angle) * ry * pulse };
  });
  const curves = points.map((a, i): Curve => {
    const before = points[(i + 15) % 16], b = points[(i + 1) % 16], after = points[(i + 2) % 16];
    return [a, point(a.x + (b.x - before.x) / 6, a.y + (b.y - before.y) / 6),
      point(b.x - (after.x - a.x) / 6, b.y - (after.y - a.y) / 6), b];
  });
  return curves;
}

/** Broad middle stew reaches the top of the scene. Pale pool hulls stay outside
 * the full floating title rectangle, while its authored ink remains readable on middle. */
export function cauldronMenu(layout: Layout, time: number) {
  const { width: w, height: h, menuTitle: title } = layout;
  const phase = time / cauldronLiquidProfile.period * Math.PI * 2;
  const titleBottom = title.y + title.height + presentation.motion.identityTravel + 8;
  const remaining = Math.max(8, h - titleBottom);
  const rightSpace = Math.max(0, w - title.x - title.width - presentation.motion.identityTravel - 8);
  const rightRadius = Math.min(w * .32, rightSpace / 1.2);
  const pale = layout.landscape
    ? pool(w + rightRadius * .3, h * .20, rightRadius, h * .48, phase - .5)
    : pool(w * .96, titleBottom + remaining * .37, w * .33, remaining * .25, phase - 1.2);
  const contours: { color: number; curves: Curve[] }[] = [
    { color: 1, curves: pool(w * .27, h * .40, w * .58, h * .62, phase) },
    { color: 0, curves: layout.landscape
      ? pool(w * .53, h * .17, w * .15, h * .19, phase + 2)
      : pool(w * .17, h * .50, w * .21, h * .20, phase + 2) },
    { color: 2, curves: pale },
  ];
  // One loop per role avoids cusp-producing overlaps. Landscape's pale loop
  // stays beside the title because the pot hides the below-title corridor.
  return { contours, layers: contours.map(contour => ({ color: contour.color, d: path(contour.curves) })) };
}

export function cauldronLiquid(layout: Layout, screen: 'menu' | 'game', time: number): LiquidFrame {
  return screen === 'game' ? partitionWater(layout, time, cauldronLiquidProfile) : cauldronMenu(layout, time);
}

export interface BubbleSite { readonly id: number; readonly x: number; readonly y: number; readonly maximumRadius: number; readonly drift: number; readonly group: number }
const boardSiteCache = new WeakMap<Layout, readonly BubbleSite[]>();
const menuSiteCache = new WeakMap<Layout, readonly BubbleSite[]>();
const freezeSites = (sites: BubbleSite[]) => Object.freeze(sites.map(site => Object.freeze(site)));
function boardSites(layout: Layout): readonly BubbleSite[] {
  const cached = boardSiteCache.get(layout);
  if (cached) return cached;
  const sites = freezeSites(Array.from({ length: 9 }, (_, group) => {
    const row = Math.floor(group / 3) * 3, column = group % 3 * 3;
    const corner = seededUnit(group, 25) > .5 ? 1 : 0;
    const a = layout.cells[(row + corner) * 9 + column + corner].anchor;
    const b = layout.cells[(row + corner + 1) * 9 + column + corner + 1].anchor;
    const x = (a.x + a.width / 2 + b.x + b.width / 2) / 2;
    const y = (a.y + a.height / 2 + b.y + b.height / 2) / 2;
    const drift = Math.min(simmerProfile.drift, a.width * .025);
    const clearance = Math.min(...layout.cells.map(({ anchor }) => Math.hypot(x - anchor.x - anchor.width / 2, y - anchor.y - anchor.height / 2) - protectedFaceRadius(anchor.width)));
    const maximumRadius = Math.max(0, Math.min(simmerProfile.maximumRadius, a.width * .16, clearance - drift - 1));
    return { id: group, x, y, maximumRadius, drift, group };
  }));
  boardSiteCache.set(layout, sites);
  return sites;
}

/** Whole maximum sweeps, rather than current ring radii, avoid the identity and
 * remain above every wet-vessel control hull. No unsafe fallback site is inserted. */
export function cauldronMenuSites(layout: Layout): readonly BubbleSite[] {
  const cached = menuSiteCache.get(layout);
  if (cached) return cached;
  const maximumRadius = Math.min(12, Math.max(4, Math.min(layout.width, layout.height) * .025));
  const drift = 1, margin = maximumRadius + drift + 2;
  const travel = presentation.motion.identityTravel;
  const identity = [layout.menuTitle, layout.menuArt].map(r => ({
    x: r.x - travel, y: r.y - travel, width: r.width + travel * 2, height: r.height + travel * 2,
  }));
  const wetLimit = Math.min(...cauldronVessel(layout, 'menu').boundaries.wet.flat().map(p => p.y));
  const clear = (x: number, y: number) => identity.every(r => {
    const px = Math.max(r.x, Math.min(x, r.x + r.width)), py = Math.max(r.y, Math.min(y, r.y + r.height));
    return Math.hypot(x - px, y - py) > maximumRadius + drift + 1;
  });
  const candidates: { x: number; y: number; key: number }[] = [];
  const step = maximumRadius * 2.6 + 4, jitter = Math.min(6, maximumRadius * .45);
  const columns = Math.max(1, Math.floor((layout.width - margin * 2) / step) + 1);
  for (let row = 0; margin + row * step < wetLimit; row++) {
    for (let column = 0; column < columns; column++) {
      const key = row * columns + column;
      const x = margin + column * step + (seededUnit(key, 41) - .5) * jitter * 2;
      const y = margin + row * step + (seededUnit(key, 42) - .5) * jitter * 2;
      const radius = maximumRadius + drift;
      if (x - radius <= 1 || x + radius >= layout.width - 1 || y - radius <= 1
        || y + radius + 1 >= wetLimit || !clear(x, y)) continue;
      candidates.push({ x, y, key });
    }
  }
  // Rank static safe candidates, then keep generous separation. This scatters
  // the small active subset through available liquid instead of lining the top.
  candidates.sort((a, b) => seededUnit(a.key, 43) - seededUnit(b.key, 43));
  const result: BubbleSite[] = [];
  for (const candidate of candidates) {
    if (result.some(site => Math.hypot(site.x - candidate.x, site.y - candidate.y) < maximumRadius * 3)) continue;
    result.push({ id: result.length, x: candidate.x, y: candidate.y, maximumRadius, drift, group: 0 });
    if (result.length === 9) break;
  }
  const sites = freezeSites(result);
  menuSiteCache.set(layout, sites);
  return sites;
}

/** Sparse true-annulus events never enter a face, identity, logical boundary or vessel.
 * Radius remains readable; ring thickness smoothly grows from/to zero, without alpha tints. */
export function cauldronBubbles(layout: Layout, screen: 'menu' | 'game', time: number): SceneBubble[] {
  const sites = screen === 'game' ? boardSites(layout) : cauldronMenuSites(layout);
  const result: SceneBubble[] = [];
  for (const site of sites) {
    if (site.maximumRadius < simmerProfile.minimumRadius) continue;
    const cycle = ((time / simmerProfile.period + site.id / 9 + .07) % 1 + 1) % 1;
    if (cycle >= simmerProfile.duty) continue;
    const pulse = Math.sin(cycle / simmerProfile.duty * Math.PI);
    const radius = simmerProfile.minimumRadius + (site.maximumRadius - simmerProfile.minimumRadius) * pulse;
    const x = site.x + site.drift * .6 * Math.sin(time * .6 + site.id);
    const y = site.y + site.drift * .8 * Math.sin(time * .5 + site.id * 1.7);
    const ownColor = (Math.floor(site.group / 3) + site.group % 3) % 3;
    result.push({ id: site.id, x, y, radius, innerRadius: radius - 2.4 * pulse, color: ownColor === 0 ? 2 : 0, group: site.group });
    if (result.length === simmerProfile.maximum) break;
  }
  return result;
}
