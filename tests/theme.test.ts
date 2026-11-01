import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pond, themeStyle } from '../src/lib/theme/pond';

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels.reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

function contrast(a: string, b: string): number {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('Pond presentation contract', () => {
  it('keeps selected water and shore colors with a separate authored rim role', () => {
    expect(Object.values(pond.water)).toEqual(['#0D6267', '#329D9A', '#7ED1B8']);
    expect(pond.ground).toEqual({ wet: '#6D9F81', dry: '#B6BA86', rim: '#4D7E68' });
    expect(pond.spacing.large).toBe(pond.spacing.small * 2);
    expect(pond.spacing.small).toBe(4);
  });

  it('gives active text at least 4.5:1 on every authored text surface', () => {
    for (const [ink, face] of [
      [pond.control.ink, pond.control.face],
      [pond.leaf.ink, pond.leaf.face],
      [pond.leaf.ink, pond.leaf.selectedFace],
      [pond.dialog.ink, pond.dialog.surface],
      [pond.surface.artFallbackInk, pond.control.face],
    ]) expect(contrast(ink, face)).toBeGreaterThanOrEqual(4.5);
    // Disabled palette is intentionally muted and must only be used on inactive controls.
    expect(contrast(pond.control.disabledInk, pond.control.disabledFace)).toBeLessThan(4.5);
    expect(contrast(pond.surface.focusEdge, pond.leaf.face)).toBeGreaterThanOrEqual(3);
  });

  it('keeps combined float/lift/lip within the nominal leaf anchor at diameter 28', () => {
    const diameter = 28;
    const vertical = pond.geometry.leafControlRadius * diameter + pond.motion.leafTravel
      + Math.max(pond.surface.leafSelectedLift, pond.surface.leafLipDepth);
    expect(vertical).toBeLessThan(diameter / 2);
    expect(pond.geometry.opaqueRadius).toBeLessThan(pond.geometry.leafRadius - pond.geometry.cleftMaxDepth);
  });

  it('maps units and selected/focus/dialog roles without duplicates', () => {
    const declarations = themeStyle().split(';').map((declaration) => declaration.split(/:(.*)/s).slice(0, 2));
    const css = Object.fromEntries(declarations);
    expect(Object.keys(css)).toHaveLength(declarations.length);
    expect(css['--space-small']).toBe('4px');
    expect(css['--motion-leaf-travel']).toBe('0.48px');
    expect(css['--motion-water-period']).toBe('24000ms');
    expect(css['--transition-reduced-duration']).toBe('0ms');
    for (const role of ['--leaf-selected-lip', '--leaf-focus', '--focus-edge', '--control-focus', '--dialog-backdrop', '--dialog-surface']) {
      expect(css[role]).toBeTruthy();
    }
  });

  it('retains exact official font and license payloads', () => {
    const files: Record<string, string> = {
      'Creepster-Regular.ttf': '402aeb734586c74aecd3dbdc454589b1fb12e2e1c71f782fd019ae68066d9f44',
      'Creepster-OFL.txt': 'c09e3b81d9cfeec46bc29a3374000e8ad013d694bdf24a288088491dd4cd5c69',
      'Outfit.ttf': 'fc7287273e66929776e2ba54f144fe699080bec29f61bf649d70d871468aeade',
      'Outfit-OFL.txt': 'c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416',
      'Chewy-Regular.ttf': '7cf75ea288f82fd20badea8ab4da7a656a96a7277c170811e813b3d3d6294147',
      'Chewy-LICENSE.txt': 'cfc7749b96f63bd31c3c42b5c471bf756814053e847c10f3eb003417bc523d30',
    };
    for (const [file, hash] of Object.entries(files)) {
      const payload = readFileSync(new URL(`../src/assets/fonts/${file}`, import.meta.url));
      expect(createHash('sha256').update(payload).digest('hex')).toBe(hash);
    }
  });
});
