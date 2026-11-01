import { describe, expect, it } from 'vitest';
import { pond, pondDark } from '../src/lib/theme/pond';
import { cauldron, cauldronDark } from '../src/lib/theme/cauldron';
import { medallionShape, squashRind } from '../src/lib/leaves/medallion';
import type { Cubic } from '../src/lib/leaves/shape';
import { themeStyle } from '../src/lib/theme/tokens';

const luminance = (hex: string) => hex.slice(1).match(/../g)!.map(v => parseInt(v, 16) / 255)
  .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
  .reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + .05) / (Math.min(luminance(a), luminance(b)) + .05);
const points = (curve: Cubic) => [curve.start, curve.a, curve.b, curve.end];

it('keeps three liquid fills while complementary decoration stays visible over each one', () => {
  for (const theme of [pond, pondDark, cauldron, cauldronDark]) {
    expect(Object.keys(theme.water)).toEqual(['deep', 'middle', 'shallow']);
    for (const liquid of Object.values(theme.water)) {
      expect(Math.max(contrast(theme.decoration.bubble, liquid), contrast(theme.decoration.bubbleEdge, liquid))).toBeGreaterThanOrEqual(3);
    }
    expect(themeStyle(theme)).toContain(`--bubble-color:${theme.decoration.bubble}`);
    expect(themeStyle(theme)).toContain(`--bubble-edge:${theme.decoration.bubbleEdge}`);
  }
  expect(pond.decoration).toEqual(pondDark.decoration);
  expect(cauldron.decoration).toEqual(cauldronDark.decoration);
});

it('gives the separate metal rim readable contrast without adding liquid colors', () => {
  for (const theme of [cauldron, cauldronDark]) {
    expect(contrast(theme.ground.rim, theme.ground.wet)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme.ground.rim, theme.ground.dry)).toBeGreaterThanOrEqual(3);
    expect(Object.values(theme.water)).toHaveLength(3);
    expect(themeStyle(theme)).toContain('--ground-rim:#899398');
  }
  expect(pondDark.ground).toEqual(pond.ground);
  expect(cauldronDark.ground).toEqual(cauldron.ground);
});

it('gives complete active control boundaries contrast in both dark palettes and Harvest light', () => {
  expect(pond.surface.controlEdgeWidth).toBe(0);
  for (const theme of [pondDark, cauldron, cauldronDark]) {
    const c = theme.control;
    expect(theme.surface.controlEdgeWidth).toBe(1.5);
    for (const face of [c.face, c.hoverFace, c.pressedFace, c.lip]) expect(contrast(c.edge, face), `${theme.id} ${c.edge} on ${face}`).toBeGreaterThanOrEqual(3);
    expect(contrast(c.selectedEdge, c.selectedFace)).toBeGreaterThanOrEqual(3);
    for (const role of ['control-edge', 'control-selected-edge', 'control-disabled-edge', 'control-edge-width', 'leaf-rind']) expect(themeStyle(theme)).toContain(`--${role}:`);
  }
});

describe('recognizable squash cuts', () => {
  it('has visible perimeter variation and proves every cubic stays beyond the opaque disk', () => {
    for (let id = 0; id < 81; id++) {
      const shape = medallionShape(id);
      const radii = shape.curves.map(c => Math.hypot(c.start.x - 50, c.start.y - 50));
      expect(Math.max(...radii) - Math.min(...radii)).toBeGreaterThan(4);
      for (const curve of shape.curves) {
        const midpoint = { x: (curve.start.x + curve.end.x) / 2 - 50, y: (curve.start.y + curve.end.y) / 2 - 50 };
        const radius = Math.hypot(midpoint.x, midpoint.y);
        // Convex-hull half-space excludes the complete center disk at all t.
        for (const p of points(curve)) expect(((p.x - 50) * midpoint.x + (p.y - 50) * midpoint.y) / radius).toBeGreaterThan(36.3);
      }
    }
  });
  it('keeps the entire rind crescent outside the readable disk and inside the existing envelope', () => {
    for (let id = 0; id < 81; id++) {
      const rind = squashRind(id);
      expect(rind).toEqual(squashRind(id));
      expect(rind.path).not.toMatch(/NaN|Infinity/);
      for (const curve of rind.curves) {
        const midpoint = { x: (curve.start.x + curve.end.x) / 2 - 50, y: (curve.start.y + curve.end.y) / 2 - 50 };
        const radius = Math.hypot(midpoint.x, midpoint.y);
        for (const p of points(curve)) {
          expect(((p.x - 50) * midpoint.x + (p.y - 50) * midpoint.y) / radius).toBeGreaterThan(36.3);
          expect(Math.hypot(p.x - 50, p.y - 50)).toBeLessThanOrEqual(44.87);
        }
      }
      expect(rind.curves.at(-1)!.end).toEqual(rind.curves[0].start);
    }
  });
});
