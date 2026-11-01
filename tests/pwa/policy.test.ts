import { describe, expect, it } from 'vitest';
import { automaticCheckAllowed, normalizePrecache, orphanShellCaches, restoredBackoff, ownedShellCache } from '../../src/lib/pwa/policy';
const prefix = 'toadoku:pwa:1:%2Ftoadoku%2F:';
const cache = (id: string) => prefix + id.repeat(64);
describe('PWA cache ownership and automatic bandwidth policy', () => {
  it('never treats adjacent projects, legacy formats or arbitrary suffixes as owned', () => {
    expect(ownedShellCache(cache('a'), prefix)).toBe(true);
    for (const name of ['workbox-precache', prefix, prefix + 'a'.repeat(32), cache('g'), cache('a') + ':extra', 'toadoku:pwa:1:%2Fother%2F:' + 'a'.repeat(64)]) expect(ownedShellCache(name, prefix)).toBe(false);
  });
  it('protects every active, waiting and installing snapshot while identifying abandoned own caches', () => {
    const a = cache('a'), b = cache('b'), c = cache('c'), orphan = cache('d');
    const unrelated = 'other-app:' + 'd'.repeat(64);
    expect(orphanShellCaches([a, b, c, orphan, unrelated], new Set([a, b, c]), prefix)).toEqual([orphan]);
    expect(orphanShellCaches([a, b], new Set([a, b]), prefix)).toEqual([]);
  });
  it('requires visible online execution, elapsed throttle and failure allowance independently', () => {
    const allowed = { failures: 0, nextCheck: 0, lastAttempt: 0, now: 60_000, hidden: false, online: true };
    expect(automaticCheckAllowed(allowed)).toBe(true);
    for (const patch of [{ hidden: true }, { online: false }, { nextCheck: 60_001 }, { lastAttempt: 1 }]) expect(automaticCheckAllowed({ ...allowed, ...patch })).toBe(false);
    expect(automaticCheckAllowed({ ...allowed, failures: 3, nextCheck: 60_000, lastAttempt: 0 })).toBe(true);
  });
});

describe('actual plugin additional-entry integrity normalization', () => {
  const integrity = 'sha256-' + 'A'.repeat(43) + '=';
  it('preserves integrity when the plugin appends the same public manifest without it', () => {
    const trusted = { url: 'manifest.webmanifest', revision: 'same', integrity };
    expect(normalizePrecache([trusted, { url: trusted.url, revision: 'same' }])).toEqual([trusted]);
    expect(normalizePrecache([{ url: trusted.url, revision: 'same' }, trusted])).toEqual([trusted]);
    expect(normalizePrecache([{ ...trusted, url: './manifest.webmanifest' }, trusted])).toEqual([trusted]);
  });
  it('refuses ambiguous revisions, mismatched integrity, missing hashes and escaped scope paths', () => {
    const entry = { url: 'index.html', revision: 'a', integrity };
    for (const bad of [
      [entry, { ...entry, revision: 'b' }], [entry, { ...entry, integrity: 'sha256-' + 'B'.repeat(43) + '=' }],
      [{ url: 'missing.js', revision: null }], [{ ...entry, integrity: 'md5-old' }],
      [{ ...entry, url: '../other/app.js' }], [{ ...entry, url: '/other/app.js' }], [{ ...entry, url: 'https://other.test/app.js' }],
    ]) expect(() => normalizePrecache(bad)).toThrow();
    expect(normalizePrecache([{ ...entry, revision: null }])).toEqual([{ ...entry, revision: null }]);
  });
});

it('bounds persisted failure cooldowns and tolerates backward wall-clock changes', () => {
  const now = 100_000;
  expect(restoredBackoff({ failures: 3, nextCheck: now + 86_400_000 }, now)).toEqual({ failures: 3, nextCheck: now + 86_400_000 });
  for (const saved of [null, {}, { failures: 4, nextCheck: now }, { failures: 1, nextCheck: -1 }, { failures: 1, nextCheck: now + 86_400_001 }, { failures: 1, nextCheck: Infinity }]) expect(restoredBackoff(saved, now)).toBeUndefined();
  expect(automaticCheckAllowed({ failures: 3, nextCheck: now, lastAttempt: now + 1000, now, hidden: false, online: true })).toBe(true);
});
