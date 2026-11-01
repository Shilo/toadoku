import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { definition as pond } from '../src/lib/theme/pond';
import { definition as cauldron } from '../src/lib/theme/cauldron';
import { wordmark as pondWordmark } from '../src/lib/theme/wordmarks/pond';
import { wordmark as cauldronWordmark } from '../src/lib/theme/wordmarks/cauldron';
import { themeStyle } from '../src/lib/theme/tokens';

it('pins the verified language subsets and unchanged solving glyph derivative', () => {
  for (const [file, hash] of Object.entries({
    'Almendra-UI-Regular.woff2': 'aba7222a1f2a33dfea57e6cbcbbfd6f419d12e9e9928b230cc21d6df74c393c1',
    'Almendra-UI-Bold.woff2': '44b897ad02022672bb9f378c8f433808d6a9d43b588c6395d2de591ee203d3f3',
    'GermaniaOne-UI.woff2': 'f5330179ba66616e96494fe6b52336e8abc9dc8cffebf43c4f7ca330afc9e8dc',
    'Outfit-Solving.woff2': '94521752365c23a599f084d01f8e21fa9f8ac0b120607f55f3cd9cf60e00d564',
  })) {
    const bytes = readFileSync(`src/assets/fonts/${file}`);
    expect(bytes.subarray(0, 4).toString()).toBe('wOF2');
    expect(bytes.readUInt32BE(8)).toBe(bytes.length);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(hash);
  }
});

it('keeps baked wordmarks inside their natural em frames without font downloads', () => {
  for (const wordmark of [pondWordmark, cauldronWordmark]) {
    const [x, y, width, height] = wordmark.viewBox.split(' ').map(Number);
    expect([x, y, width, height].every(Number.isFinite)).toBe(true);
    expect(width).toBeCloseTo(wordmark.width, 1); expect(height).toBe(wordmark.unitsPerEm);
    expect(wordmark.path).toMatch(/^M/); expect(wordmark.path).not.toMatch(/<|>|script|url\(/i);
    const [left, top, right, bottom] = wordmark.bounds;
    expect(left).toBeGreaterThanOrEqual(x); expect(right).toBeLessThanOrEqual(x + width);
    expect(top).toBeGreaterThanOrEqual(y); expect(bottom).toBeLessThanOrEqual(y + height);
  }
});

it('gives each theme one optional UI and numeral family with honest native faces', () => {
  expect(pond.font).toMatchObject({ family: 'ToadokuPondUI', faces: [{ weight: '400' }, { weight: '700' }] });
  expect(cauldron.font).toMatchObject({ family: 'ToadokuCauldronUI', faces: [{ weight: '400' }] });
  for (const definition of [pond, cauldron]) {
    expect(definition).not.toHaveProperty('titleFont');
    expect(definition.light.typography).not.toHaveProperty('title');
    expect(definition.light.typography).not.toHaveProperty('ui');
  }
  expect(pond.wordmark.path).not.toBe(cauldron.wordmark.path);
  expect(themeStyle(pond.light)).toContain('--digit-baseline-shift:0em');
  expect(themeStyle(pond.light, '"ToadokuPondUI", system-ui', true)).toContain('--digit-baseline-shift:0.09em');
  expect(themeStyle(cauldron.light, '"ToadokuCauldronUI", system-ui', true)).toContain('--digit-baseline-shift:0.04em');
});
