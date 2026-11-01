import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { definition as pond } from '../src/lib/theme/pond';
import { definition as cauldron } from '../src/lib/theme/cauldron';
import { wordmark as pondWordmark } from '../src/lib/theme/wordmarks/pond';
import { wordmark as cauldronWordmark } from '../src/lib/theme/wordmarks/cauldron';

it('pins the verified language subsets and unchanged solving glyph derivative', () => {
  for (const [file, hash] of Object.entries({
    'Nunito-UI.woff2': '37e9b35cbe78473ad152c4b2ab6be67195bc18c4a44029c87c0bca1145a8ee4d',
    'Bitter-UI.woff2': '316e25731901e02e1485c0e77ba7ddd517942687566437ecd5c61a7fea03d766',
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

it('gives each theme one optional UI font, independent of its baked branding and shared solving face', () => {
  expect(pond.font).toMatchObject({ family: 'ToadokuPondUI', weight: '400 700' });
  expect(cauldron.font).toMatchObject({ family: 'ToadokuCauldronUI', weight: '400 700' });
  for (const definition of [pond, cauldron]) {
    expect(definition).not.toHaveProperty('titleFont');
    expect(definition.light.typography).not.toHaveProperty('title');
    expect(definition.light.typography).not.toHaveProperty('ui');
  }
  expect(pond.wordmark.path).not.toBe(cauldron.wordmark.path);
});
