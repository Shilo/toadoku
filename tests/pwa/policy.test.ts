import { describe, expect, it } from 'vitest';
import { automaticCheckAllowed, orphanShellCaches, ownedShellCache } from '../../src/lib/pwa/policy';
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
    for (const patch of [{ hidden: true }, { online: false }, { failures: 3 }, { nextCheck: 60_001 }, { lastAttempt: 50_001 }]) expect(automaticCheckAllowed({ ...allowed, ...patch })).toBe(false);
    expect(automaticCheckAllowed({ ...allowed, failures: 2, nextCheck: 60_000, lastAttempt: 50_000 })).toBe(true);
  });
});
