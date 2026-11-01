import type { Layout, Rect } from '../layout';
import { presentation as pond } from '../theme/presentation';

export interface Point { x: number; y: number }
export type Curve = readonly [Point, Point, Point, Point];
export interface Contour { color: number; curves: Curve[] }
export interface WaterGeometry { layers: { color: number; d: string }[]; contours: Contour[]; junctionRadii: number[] }
const point = (x: number, y: number): Point => ({ x, y });
const mix = (a: Point, b: Point, t: number): Point => point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
const segment = (a: Point, b: Point): Curve => [a, mix(a, b, 1 / 3), mix(a, b, 2 / 3), b];
const backwards = (c: Curve): Curve => [c[3], c[2], c[1], c[0]];
const reverse = (curves: Curve[]): Curve[] => curves.slice().reverse().map(backwards);
const pair = (p: Point) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
const path = (curves: Curve[]) => `M${pair(curves[0][0])}${curves.map(c => `C${pair(c[1])} ${pair(c[2])} ${pair(c[3])}`).join('')}Z`;

export function evaluate(c: Curve, t: number): Point {
  const a = mix(c[0], c[1], t), b = mix(c[1], c[2], t), d = mix(c[2], c[3], t);
  return mix(mix(a, b, t), mix(b, d, t), t);
}

/** One canonical long-axis network, with every layout input coming from the
 * authoritative fixed cell/anchor allocation. Transposition changes no IDs. */
export function boardWater(layout: Layout, time = 0): WaterGeometry {
  const transpose = layout.board.width > layout.board.height;
  const map = (p: Point): Point => transpose ? point(p.y + layout.board.x, p.x + layout.board.y) : point(p.x + layout.board.x, p.y + layout.board.y);
  const unmap = (r: Rect): Rect => transpose
    ? { x: r.y - layout.board.y, y: r.x - layout.board.x, width: r.height, height: r.width }
    : { ...r, x: r.x - layout.board.x, y: r.y - layout.board.y };
  const w = transpose ? layout.board.height : layout.board.width;
  const h = transpose ? layout.board.width : layout.board.height;
  const cells = layout.cells.map(c => ({ ...c, row: transpose ? c.column : c.row, column: transpose ? c.row : c.column, rect: unmap(c.rect), anchor: unmap(c.anchor) }));
  const at = (row: number, column: number) => cells.find(c => c.row === row && c.column === column)!;
  const x = [0, ...[3, 6].map(c => (at(0, c - 1).rect.x + at(0, c - 1).rect.width + at(0, c).rect.x) / 2), w];
  const y = [0, ...[3, 6].map(r => (at(r - 1, 0).rect.y + at(r - 1, 0).rect.height + at(r, 0).rect.y) / 2), h];
  // The corridor excludes full nominal disks plus 3px, twice the moving visual
  // reserve. Cubic convex hulls stay in it for every real-valued phase.
  const bands = [0, ...[3, 6].map((r, i) => {
    const top = at(r - 1, 0).anchor, bottom = at(r, 0).anchor;
    return Math.max(.1, Math.min(y[i + 1] - top.y - top.height, bottom.y - y[i + 1]) - pond.geometry.waterClearance * 2);
  }), 0];
  const phase = time * 1000 / pond.motion.waterPeriod * Math.PI * 2;
  const nodes: { p: Point; tangent: Point; radius: number }[][] = y.map((yy, r) => x.map((xx, c) => {
    const interiorRow = r > 0 && r < 3;
    const drift = c * 1.3 + r * .9;
    const dy = interiorRow ? bands[r] * .55 * (.7 * Math.sin(drift) + .3 * Math.sin(phase + c * .9 + r)) : 0;
    const slope = interiorRow ? bands[r] * .55 / Math.max(1, w / 3) * (.91 * Math.cos(drift) + .27 * Math.cos(phase + c * .9 + r)) : 0;
    const length = Math.hypot(1, slope);
    return { p: point(xx, yy + dy), tangent: point(1 / length, slope / length), radius: interiorRow && c > 0 && c < 3 ? Math.min((x[c + 1] - x[c]) * .19, bands[r] * .6, (bands[r] - Math.abs(dy)) * .85) : 0 };
  }));
  const horizontal: Curve[][][] = y.map((_, r) => x.slice(0, 3).map((__, c) => {
    const a = nodes[r][c], b = nodes[r][c + 1];
    if (r === 0 || r === 3) return [segment(a.p, b.p)];
    const start = point(a.p.x + a.tangent.x * a.radius, a.p.y + a.tangent.y * a.radius);
    const end = point(b.p.x - b.tangent.x * b.radius, b.p.y - b.tangent.y * b.radius);
    const reach = (p: Point, t: Point) => Math.min((end.x - start.x) / 3 / Math.abs(t.x), Math.abs(t.y) < 1e-9 ? Infinity : (t.y > 0 ? y[r] + bands[r] - p.y : p.y - y[r] + bands[r]) / Math.abs(t.y));
    const before = reach(start, a.tangent), after = reach(end, point(-b.tangent.x, -b.tangent.y));
    return [segment(a.p, start), [start, point(start.x + a.tangent.x * before, start.y + a.tangent.y * before), point(end.x - b.tangent.x * after, end.y - b.tangent.y * after), end] as Curve, segment(end, b.p)];
  }));
  const vertical: Curve[][][] = y.slice(0, 3).map((_, r) => x.map((__, c) => {
    const a = nodes[r][c], b = nodes[r + 1][c];
    if (c === 0 || c === 3) return [segment(a.p, b.p)];
    const start = point(a.p.x, a.p.y + a.radius), end = point(b.p.x, b.p.y - b.radius);
    const bend = .95 * (.65 * Math.sin(r + c * 1.7) + .35 * Math.sin(phase + r * 1.8 + c));
    const middle = point(start.x + bend, (start.y + end.y) / 2), reach = (end.y - start.y) / 6;
    return [segment(a.p, start), [start, point(start.x, start.y + reach), point(middle.x, middle.y - reach), middle] as Curve, [middle, point(middle.x, middle.y + reach), point(end.x, end.y - reach), end] as Curve, segment(end, b.p)];
  }));
  const contours: Contour[] = [];
  const bleed = Math.max(layout.width, layout.height, pond.geometry.backgroundBleed);
  // Exterior extension segments leave all visible interior endpoints/handles
  // intact, unlike stretching their endpoints towards an offscreen corner.
  const outer = (p: Point): Point => point(p.x === 0 ? -bleed : p.x === w ? w + bleed : p.x, p.y === 0 ? -bleed : p.y === h ? h + bleed : p.y);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    const edges = [horizontal[r][c], vertical[r][c + 1], reverse(horizontal[r + 1][c]), reverse(vertical[r][c])];
    const curves: Curve[] = [];
    for (const [i, edge] of edges.entries()) {
      const chain = (i === 0 && r === 0 || i === 1 && c === 2 || i === 2 && r === 2 || i === 3 && c === 0) ? [segment(outer(edge[0][0]), outer(edge.at(-1)![3]))] : edge;
      if (curves.length) curves.push(segment(curves.at(-1)![3], chain[0][0]));
      curves.push(...chain);
    }
    curves.push(segment(curves.at(-1)![3], curves[0][0]));
    contours.push({ color: (r + c) % 3, curves: curves.map(c => c.map(map) as unknown as Curve) });
  }
  for (let r = 1; r < 3; r++) for (let c = 1; c < 3; c++) {
    const { p, tangent: t, radius } = nodes[r][c];
    const handle = radius * .5522847498;
    for (const direction of [-1, 1]) {
      const side = point(p.x + direction * t.x * radius, p.y + direction * t.y * radius);
      const vertical = point(p.x, p.y + direction * radius);
      const arc: Curve = [side, point(side.x - direction * t.x * handle, side.y - direction * t.y * handle), point(vertical.x, vertical.y - direction * handle), vertical];
      const pocket = [arc, segment(vertical, p), segment(p, side)].map(c => c.map(map) as unknown as Curve);
      // Reflection transposes both tiles and pockets, preserving their relative
      // winding. Each displaced corner is removed, never painted over.
      contours.push({ color: (r + c - 1) % 3, curves: pocket });
      contours.push({ color: (r + c + (direction === -1 ? -2 : 0)) % 3, curves: reverse(pocket) });
    }
  }
  return { contours, layers: [0, 1, 2].map(color => ({ color, d: contours.filter(c => c.color === color).map(c => path(c.curves)).join(' ') })), junctionRadii: nodes.flat().map(n => n.radius).filter(r => r > 0) };
}

/** Pale edge lobes bend around the fixed title's complete float envelope.
 * Every pre/band/post join has vertical tangent controls on both sides. The
 * band hull is outside the title x-range for every real-valued time. */
export function menuShallows(layout: Layout, time = 0): { contours: Contour[]; boundaries: Curve[][]; protectedTitle: Rect } {
  const { width: w, height: h, menuTitle: title } = layout;
  const travel = pond.motion.identityTravel, clearance = travel + pond.spacing.small;
  const protectedTitle = { x: title.x - travel, y: title.y - travel, width: title.width + travel * 2, height: title.height + travel * 2 };
  const top = title.y - clearance, bottom = title.y + title.height + clearance;
  const left = Math.min(title.x - clearance, w * .18), right = Math.max(title.x + title.width + clearance, w * .76);
  const startY = Math.min(0, top - pond.spacing.large), bleed = Math.max(w, h);
  const bow = w * .03;
  const wave = Math.sin(time * 1000 / pond.motion.waterPeriod * Math.PI * 2);
  const postY = Math.max(bottom + h * .16, h * .4), exitY = Math.max(postY + h * .12, h * .58);
  // Match physical handles only at the same join. A short pre-title segment
  // must not flatten every later turn, especially in desktop landscape.
  const beforeHandle = Math.min((top - startY) * .35, (bottom - top) / 3, h * .035);
  const afterHandle = Math.min((bottom - top) * .3, (postY - bottom) * .35);
  const postHandle = Math.min((postY - bottom) * .35, (exitY - postY) * .35);
  const egress = pond.geometry.backgroundBleed;
  const boundaries = [-1, 1].map(side => {
    const edge = side === -1 ? left : right;
    const originalStart = side === -1 ? w * .21 : w * .85;
    const availableTop = top - startY;
    const startX = Math.max(edge - availableTop * .5, Math.min(originalStart, edge + availableTop * .5));
    const bowed = edge + side * bow;
    const broad = side === -1 ? w * (.12 + wave * .015) : w * (.7 + wave * .02);
    const start = point(startX, startY), before = point(edge, top), after = point(bowed, bottom), post = point(broad, postY), end = point(side === -1 ? -egress : w + egress, exitY);
    const exitHandle = Math.min(Math.abs(end.x - post.x) * .45, (exitY - postY) * .5);
    return [
      segment(point(startX, -bleed), start),
      [start, point(startX, startY + (top - startY) * .4), point(edge, top - beforeHandle), before] as Curve,
      [before, point(edge, top + beforeHandle), point(bowed, bottom - afterHandle), after] as Curve,
      [after, point(bowed, bottom + afterHandle), point(broad, postY - postHandle), post] as Curve,
      [post, point(broad, postY + postHandle), point(end.x - side * exitHandle, exitY), end] as Curve,
      segment(end, point(side === -1 ? -bleed : w + bleed, exitY)),
    ];
  });
  const contours = boundaries.map((b, i): Contour => {
    const end = b.at(-1)![3], start = b[0][0], edge = point(i === 0 ? -bleed : w + bleed, -bleed);
    return { color: 2, curves: [...b, segment(end, edge), segment(edge, start)] };
  });
  return { contours, boundaries, protectedTitle };
}

export function menuWater(layout: Layout, time = 0): { color: number; d: string }[] {
  const { width: w, height: h } = layout;
  const bleed = Math.max(w, h), wave = Math.sin(time * 1000 / pond.motion.waterPeriod * Math.PI * 2);
  const p = (x: number, y: number) => `${x * w} ${y * h}`;
  const middleTop = w * .36 - bleed * w * (.03 + wave * .018) / (h * .2);
  return [
    { color: 1, d: `M${-bleed} ${-bleed}H${middleTop}L${p(.36, 0)}C${p(.39 + wave * .018, .2)} ${p(.08, .26)} ${p(.17, .41)}S${p(.87, .51)} ${p(1, .79)}L${w + bleed} ${h * .79 + bleed * h * .28 / (w * .13)}L${w + bleed} ${h + bleed}H${-bleed}Z` },
    { color: 2, d: menuShallows(layout, time).contours.map(c => path(c.curves)).join(' ') },
  ];
}

export interface ShoreGeometry {
  wet: string; dry: string; transpose: boolean; leafLimit: number; dryLimit: number;
  boundaries: { wet: Curve[]; dry: Curve[] };
  contours: { wet: Curve[]; dry: Curve[] };
}
/** No shore animation: independent water and leaf extrema cannot shift land.
 * The entire cubic hull is between the last protected leaf and control edge. */
export function shore(layout: Layout, screen: 'menu' | 'game'): ShoreGeometry {
  const bleed = Math.max(layout.width, layout.height, pond.geometry.backgroundBleed);
  if (screen === 'menu' && layout.landscape) {
    const { width: w, height: h, menuPanel: panel, keySize } = layout;
    const titleBottom = layout.menuTitle.y + layout.menuTitle.height + pond.motion.identityTravel;
    const room = Math.max(0, panel.y - titleBottom);
    const bank = Math.min(pond.geometry.shorelineBank, room * .5);
    const dryTop = panel.y - Math.min(pond.spacing.small, room * .1);
    const crest = Math.min(12, room * .2);
    const curve = (wet: boolean): Curve[] => {
      const shift = wet ? bank : 0;
      const top = dryTop - shift, right = w - keySize - pond.spacing.small - shift;
      const start = point(-bleed, top), leftCove = point(panel.width, top), bottomCove = point(w * .78, h * .79 - shift), rightCove = point(right, -bleed);
      return [
        [start, point(w * .15, top - crest * 2 / 3), point(panel.width * .7, top - crest), leftCove],
        [leftCove, point(Math.min(panel.width + 48, right), top + 4), point(w * .69, h * .95 - shift), bottomCove],
        [bottomCove, point(Math.min(w * .88 - shift, right), h * .62), point(right - 8, h * .2), rightCove],
      ];
    };
    const boundaries = { wet: curve(true), dry: curve(false) };
    const close = (boundary: Curve[]) => {
      const start = boundary[0][0], end = boundary.at(-1)![3];
      return [...boundary, segment(end, point(w + bleed, -bleed)), segment(point(w + bleed, -bleed), point(w + bleed, h + bleed)), segment(point(w + bleed, h + bleed), point(-bleed, h + bleed)), segment(point(-bleed, h + bleed), start)];
    };
    const contours = { wet: close(boundaries.wet), dry: close(boundaries.dry) };
    return { wet: path(contours.wet), dry: path(contours.dry), transpose: false, leafLimit: 0, dryLimit: panel.y, boundaries, contours };
  }
  const transpose = screen === 'game' && layout.landscape;
  const w = transpose ? layout.height : layout.width, h = transpose ? layout.width : layout.height;
  const edge = screen === 'menu' ? layout.menuPanel.y : transpose ? layout.dock.x : layout.dock.y;
  const leafLimit = screen === 'menu' ? Math.max(0, edge - pond.geometry.menuShoreAmplitude - pond.geometry.shorelineBank - pond.spacing.small) : Math.max(...layout.cells.map(({ anchor: a }) => (transpose ? a.x + a.width : a.y + a.height) + pond.geometry.waterClearance));
  // Controls begin at edge, so all dry hull controls are <= edge. The bank's
  // innermost control stays >= leafLimit, regardless of water/leaf phases.
  const room = Math.max(0, edge - leafLimit);
  const margin = Math.min(pond.spacing.small, room * .1);
  const bank = Math.min(pond.geometry.shorelineBank, room * .4);
  const amplitude = Math.min(screen === 'menu' ? pond.geometry.menuShoreAmplitude : pond.geometry.gameShoreAmplitude, Math.max(0, room - bank - margin) * .65);
  const dryTop = edge - margin, wetTop = dryTop - bank;
  const boundary = (top: number, a: number): Curve[] => {
    const first = point(-bleed, top), start = point(-16, top), middle = point(w * .44, top - a * .8), end = point(w + 16, top - a * .3);
    return [segment(first, start), [start, point(w * .14, top - a * .2), point(w * .27, top - a), middle], [middle, point(w * .61, top - a * .6), point(w * .8, top), end], segment(end, point(w + bleed, top - a * .3))];
  };
  const boundaries = { wet: boundary(wetTop, amplitude), dry: boundary(dryTop, amplitude * .6) };
  const close = (b: Curve[]): Curve[] => [...b, segment(b.at(-1)![3], point(w + bleed, h + bleed)), segment(point(w + bleed, h + bleed), point(-bleed, h + bleed)), segment(point(-bleed, h + bleed), b[0][0])];
  const contours = { wet: close(boundaries.wet), dry: close(boundaries.dry) };
  return { wet: path(contours.wet), dry: path(contours.dry), transpose, leafLimit, dryLimit: edge, boundaries, contours };
}
