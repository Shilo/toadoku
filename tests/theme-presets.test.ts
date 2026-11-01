import { describe, expect, it } from 'vitest';
import { definition as pondDefinition } from '../src/lib/theme/pond';
import { definition as cauldronDefinition } from '../src/lib/theme/cauldron';
import { themeStyle, type ThemeTokens } from '../src/lib/theme/tokens';
import { presentation } from '../src/lib/theme/presentation';

const presets = [
  ['pond/light', pondDefinition.light], ['pond/dark', pondDefinition.dark],
  ['cauldron/light', cauldronDefinition.light], ['cauldron/dark', cauldronDefinition.dark],
] as const;
function luminance(hex: string) {
  const rgb = hex.slice(1).match(/../g)!.map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + .05) / (dark + .05);
}
function declarations(theme: ThemeTokens) {
  return themeStyle(theme).split(';').map(item => item.split(/:(.*)/s).slice(0, 2));
}

describe.each(presets)('%s semantic preset', (_, theme) => {
  it('supplies every token with identical names and unambiguous finite values', () => {
    const pairs = declarations(theme), css = Object.fromEntries(pairs);
    expect(Object.keys(css)).toHaveLength(pairs.length);
    expect(Object.keys(css)).toEqual(Object.keys(Object.fromEntries(declarations(pondDefinition.light))));
    for (const [name, value] of pairs) {
      expect(name).toMatch(/^--[a-z-]+$/);
      expect(value).toBeTruthy(); expect(value).not.toMatch(/undefined|NaN|Infinity/);
    }
    for (const group of ['spacing', 'geometry', 'motion'] as const) expect(theme[group]).toEqual(presentation[group]);
    for (const [role, value] of Object.entries(presentation.surface)) expect(theme.surface[role as keyof typeof presentation.surface]).toBe(value);
    for (const [role, value] of Object.entries(presentation.typography)) expect(theme.typography[role as keyof typeof presentation.typography]).toBe(value);
    expect(theme.typography.titleWeight).toBe(400);
    expect(css['--weight-title']).toBe('400');
    expect(theme.surface.dialogRadius).toBeGreaterThan(0);
    expect(theme.surface.buttonRadius).toBeGreaterThan(0);
  });
  it('gives active text at least 4.5:1 across authored control and board states', () => {
    const c = theme.control, l = theme.leaf;
    const pairs = [
      [c.ink, c.face], [c.ink, c.lip], [c.ink, c.hoverFace], [c.ink, c.pressedFace], [c.selectedInk, c.selectedFace],
      [theme.dialog.ink, theme.dialog.surface],
      ...[l.face, l.selectedFace].flatMap(face => [l.ink, l.entryInk, l.noteInk, l.conflictInk].map(ink => [ink, face])),
    ];
    for (const [ink, face] of pairs) expect(contrast(ink, face), `${ink} on ${face}`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(c.focus, c.face)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme.surface.focusEdge, l.face)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme.surface.focusEdge, l.selectedFace)).toBeGreaterThanOrEqual(3);
    expect(contrast(theme.typography.titleInk, theme.water.deep)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(theme.typography.titleInk, theme.water.middle)).toBeGreaterThanOrEqual(3);
  });
});

it('keeps Cauldron group fills distinct at 3:1 for all pairs without adding liquid colors', () => {
  const { deep, middle, shallow } = cauldronDefinition.light.water;
  expect(new Set([deep, middle, shallow]).size).toBe(3);
  for (const [a, b] of [[deep, middle], [middle, shallow], [deep, shallow]]) expect(contrast(a, b)).toBeGreaterThanOrEqual(3);
});
it('switches appearances without changing theme identity, scene colors, cells or geometry', () => {
  for (const { light, dark } of [pondDefinition, cauldronDefinition]) {
    expect(light.id).toBe(dark.id);
    for (const group of ['water', 'ground', 'leaf', 'geometry', 'motion', 'spacing', 'typography'] as const) expect(light[group]).toEqual(dark[group]);
  }
  expect(pondDefinition.cellPath).toBeUndefined(); expect(pondDefinition.vessel).toBeUndefined();
  expect(cauldronDefinition.cellPath).toBeTypeOf('function'); expect(cauldronDefinition.vessel).toBeTypeOf('function');
});
