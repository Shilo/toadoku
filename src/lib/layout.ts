export interface Rect { x: number; y: number; width: number; height: number }
export interface CellGeometry {
  id: number; row: number; column: number; group: number; rect: Rect; anchor: Rect;
}
export interface Layout {
  width: number; height: number; landscape: boolean; allocation: Rect; board: Rect; dock: Rect;
  cells: CellGeometry[]; keySize: number; dockSingleRow: boolean; menuPanel: Rect; menuReserve: number; menuActionHeight: number;
  menuTitle: Rect; menuArt: Rect; titleFontSize: number;
}
import { presentation as pond } from './theme/presentation';
export const SMALL = pond.spacing.small;
export const LARGE = pond.spacing.large;
export const rectStyle = (r: Rect) => `left:${r.x}px;top:${r.y}px;width:${r.width}px;height:${r.height}px`;

/** Coordinates exclude one scene inset and the separately measured system safe areas. */
export function createLayout(width: number, height: number, shape: 'fill' | 'square' = 'fill'): Layout {
  const landscape = width > height;
  const keySize = Math.min(80, (Math.min(width, height) - 4 * SMALL) / 5);
  const rowHeight = 56;
  const rowDiameter = (Math.min(width, height - rowHeight - LARGE) - 2 * LARGE - 6 * SMALL) / 9;
  // The longest localized save badge needs 48px of inner width at 11px type.
  const dockSingleRow = !landscape && width >= 10 * 56 + 9 * SMALL && rowDiameter >= 32;
  const dockDepth = dockSingleRow ? rowHeight : 2 * keySize + SMALL;
  const allocation: Rect = { x: 0, y: 0, width: landscape ? width - dockDepth - LARGE : width, height: landscape ? height : height - dockDepth - LARGE };
  const dock: Rect = landscape
    ? { x: allocation.width + LARGE, y: 0, width: dockDepth, height }
    : { x: 0, y: allocation.height + LARGE, width, height: dockDepth };
  const side = Math.min(allocation.width, allocation.height);
  const board: Rect = shape === 'square'
    ? { x: landscape ? allocation.width - side : (allocation.width - side) / 2,
      y: landscape ? (allocation.height - side) / 2 : allocation.height - side, width: side, height: side }
    : { ...allocation };
  const groupWidth = (board.width - 2 * LARGE) / 3;
  const groupHeight = (board.height - 2 * LARGE) / 3;
  const cw = (groupWidth - 2 * SMALL) / 3;
  const ch = (groupHeight - 2 * SMALL) / 3;
  const diameter = Math.min(cw, ch);
  const cells = Array.from({ length: 81 }, (_, id): CellGeometry => {
    const row = Math.floor(id / 9), column = id % 9;
    const gr = Math.floor(row / 3), gc = Math.floor(column / 3);
    const rect = { x: board.x + gc * (groupWidth + LARGE) + (column % 3) * (cw + SMALL), y: board.y + gr * (groupHeight + LARGE) + (row % 3) * (ch + SMALL), width: cw, height: ch };
    const anchor = { x: rect.x + (cw - diameter) * (1 - (column % 3) / 2), y: rect.y + (ch - diameter) * (1 - (row % 3) / 2), width: diameter, height: diameter };
    return { id, row, column, group: gr * 3 + gc, rect, anchor };
  });
  // Largest localized panel: heading line/padding, three action rows, three gaps.
  // Copy is tested to fit one heading line in all supported locales.
  const menuActionHeight = Math.min(64, keySize);
  const menuReserve = 3 * menuActionHeight + pond.typography.controlMax * pond.typography.uiLineHeight + 5 * SMALL;
  const menuPanel = { x: 0, y: height - menuReserve, width: Math.min(width - keySize - SMALL, landscape ? width * .55 : width), height: menuReserve };
  const titleFontSize = Math.min(pond.typography.titleMax, Math.max(pond.typography.titleMin, (Math.min(width, height) + 2 * LARGE) * .22));
  const titleWidth = Math.min(width, titleFontSize * 3.6);
  const titleHeight = titleFontSize * pond.typography.titleLineHeight;
  const identityHeight = Math.max(0, height - menuReserve);
  const artWidth = landscape ? width * .25 : Math.min(width * .68, 270);
  const artHeight = landscape ? height * .45 : Math.min(identityHeight * .46, 240);
  const titleX = landscape ? (width - titleWidth - artWidth) / 4 : (width - titleWidth) / 2;
  const titleY = landscape ? LARGE : (identityHeight - titleHeight - artHeight - LARGE) / 2;
  const menuTitle = { x: titleX, y: titleY, width: titleWidth, height: titleHeight };
  const menuArt = { x: landscape ? width - titleX - artWidth : (width - artWidth) / 2, y: landscape ? 0 : titleY + titleHeight + LARGE, width: artWidth, height: artHeight };
  return { width, height, landscape, allocation, board, dock, cells, keySize, dockSingleRow, menuPanel, menuReserve, menuActionHeight, menuTitle, menuArt, titleFontSize };
}
