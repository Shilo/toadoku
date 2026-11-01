import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { themeCopy } from '../src/lib/theme/copy';

it('keeps complete localized metadata and valid UTF-8 source', () => {
  const source = readFileSync(new URL('../src/lib/theme/copy.ts', import.meta.url));
  expect(() => new TextDecoder('utf-8', { fatal: true }).decode(source)).not.toThrow();
  for (const copy of Object.values(themeCopy)) {
    expect(Object.keys(copy)).toEqual(Object.keys(themeCopy.en));
    expect(Object.values(copy).every(value => value.length > 0 && !value.includes('\ufffd'))).toBe(true);
  }
  expect(themeCopy.de.unknown).toBe('Nicht verf\u00fcgbare Auswahl');
  expect(themeCopy.es.unknown).toBe('Opci\u00f3n no disponible');
});
