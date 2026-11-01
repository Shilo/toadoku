import type { Layout } from '../layout';
import { presentation } from '../theme/presentation';
import type { Curve, Point, ShoreGeometry } from './geometry';

const point = (x: number, y: number): Point => ({ x, y });
const segment = (a: Point, b: Point): Curve => [a, point((a.x * 2 + b.x) / 3, (a.y * 2 + b.y) / 3), point((a.x + b.x * 2) / 3, (a.y + b.y * 2) / 3), b];
const pair = (p: Point) => `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
const path = (curves: Curve[]) => `M${pair(curves[0][0])}${curves.map(c => `C${pair(c[1])} ${pair(c[2])} ${pair(c[3])}`).join('')}Z`;

/** Manufactured vessel lip, clipped to the existing decorative reservation.
 * Cubic hulls protect every cell and identity rectangle without moving layout. */
export function cauldronVessel(layout: Layout, screen: 'menu' | 'game'): ShoreGeometry {
  const bleed = presentation.geometry.backgroundBleed;
  const identityBottom = Math.max(layout.menuTitle.y + layout.menuTitle.height,
    layout.menuArt.y + layout.menuArt.height) + presentation.motion.identityTravel;
  // A broad full-width rim is preferable whenever the fixed identity leaves
  // room above the complete menu reservation. Short landscapes need a cove.
  if (screen === 'menu' && layout.landscape && identityBottom + 4 >= layout.menuPanel.y) {
    const { width: w, height: h, menuPanel: panel, menuArt: art, menuTitle: title, keySize } = layout;
    const titleBottom = title.y + title.height + presentation.motion.identityTravel;
    const room = Math.max(0, panel.y - titleBottom);
    const margin = Math.min(4, room * .1), bank = Math.min(10, room * .25);
    const artLeft = art.x - presentation.motion.identityTravel - 4;
    const turnX = Math.max(panel.width, artLeft);
    const moreTop = h - keySize;
    const boundary = (wet: boolean): Curve[] => {
      const top = panel.y - margin - (wet ? bank : 0);
      const low = Math.min(moreTop - margin - (wet ? bank : 0), Math.max(top + 12, art.y + art.height + presentation.motion.identityTravel + 4));
      const span = Math.max(0, turnX - panel.width), reach = span / 3;
      const start = point(-bleed, top), crest = point(panel.width, top), turn = point(turnX, low), end = point(w + bleed, low);
      return [
        [start, point(0, top), point(panel.width * .5, top), crest],
        [crest, point(crest.x + reach, top), point(turn.x - reach, low), turn],
        [turn, point(turn.x + reach, low), point(w, low), end],
      ];
    };
    const boundaries = { wet: boundary(true), dry: boundary(false) };
    const close = (b: Curve[]): Curve[] => [...b, segment(b.at(-1)![3], point(w + bleed, h + bleed)), segment(point(w + bleed, h + bleed), point(-bleed, h + bleed)), segment(point(-bleed, h + bleed), b[0][0])];
    const contours = { wet: close(boundaries.wet), dry: close(boundaries.dry) };
    return { wet: path(contours.wet), dry: path(contours.dry), transpose: false, leafLimit: titleBottom, dryLimit: panel.y, boundaries, contours };
  }
  const transpose = screen === 'game' && layout.landscape;
  const w = transpose ? layout.height : layout.width, h = transpose ? layout.width : layout.height;
  const edge = screen === 'game' ? transpose ? layout.dock.x : layout.dock.y : layout.menuPanel.y;
  const leafLimit = screen === 'game'
    ? Math.max(...layout.cells.map(({ anchor: a }) => (transpose ? a.x + a.width : a.y + a.height) + presentation.geometry.waterClearance))
    : identityBottom;
  const room = Math.max(0, edge - leafLimit), margin = Math.min(4, room * .1), bank = Math.min(10, room * .35);
  const arc = Math.min(screen === 'menu' ? w * .05 : 18, Math.max(0, room - margin - bank) * .5);
  const boundary = (wet: boolean): Curve[] => {
    const top = edge - margin - (wet ? bank : 0), crest = top - arc;
    const start = point(-bleed, top), left = point(0, top), middle = point(w / 2, crest), right = point(w, top), end = point(w + bleed, top);
    return [segment(start, left), [left, point(w * .18, top), point(w * .24, crest), middle],
      [middle, point(w * .76, crest), point(w * .82, top), right], segment(right, end)];
  };
  const boundaries = { wet: boundary(true), dry: boundary(false) };
  const close = (b: Curve[]): Curve[] => [...b, segment(b.at(-1)![3], point(w + bleed, h + bleed)), segment(point(w + bleed, h + bleed), point(-bleed, h + bleed)), segment(point(-bleed, h + bleed), b[0][0])];
  const contours = { wet: close(boundaries.wet), dry: close(boundaries.dry) };
  return { wet: path(contours.wet), dry: path(contours.dry), transpose, leafLimit, dryLimit: edge, boundaries, contours };
}

export const vessel = cauldronVessel;
