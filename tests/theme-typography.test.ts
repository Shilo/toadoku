import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { definition as pond } from '../src/lib/theme/pond';
import { definition as cauldron } from '../src/lib/theme/cauldron';
import { wordmark as pondWordmark } from '../src/lib/theme/wordmarks/pond';
import { wordmark as cauldronWordmark } from '../src/lib/theme/wordmarks/cauldron';

it('pins the verified language subsets and unchanged solving glyph derivative', () => {
  for (const [file, hash] of Object.entries({
    'Baloo2-UI.woff2': '7dd1e14afb82d04391029fe14c89610a104c4a6d7d60cf044f066a5b8cefc606',
    'Fraunces-UI.woff2': 'ea65187915d697aec1579b38c6117e750833c9ba24e6c7c1e2eb39cf3dbe477f',
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
