import { describe, expect, it } from 'vitest';
import { assertImmutableCompatibility, compactAbsent, connectPage, decodeInventory, emptyShellState, immutableShellPath, LEASE_AGE, reconstructedShellState,
  markDeleting, pinSnapshot, releasePage, renewObserved, seedLegacy, SHELL_FILE_LIMIT, SHELL_LIMIT, validateShellState } from '../../src/lib/pwa/worker-compat';
import type { ShellInventory, ShellState } from '../../src/lib/pwa/worker-compat';

const prefix = 'toadoku:pwa:1:%2Ftoadoku%2F:';
const id = (letter: string) => letter.repeat(64);
const name = (letter: string) => prefix + id(letter);
const integrity = (hex: string) => 'sha256-' + Buffer.from(hex, 'hex').toString('base64');
const file = (path: string, letter = 'a', bytes = 10) => ({ path, bytes, sha256: id(letter), integrity: integrity(id(letter)) });
const inventory = (letter = 'a'): ShellInventory => ({ protocol: 1, buildId: id(letter), files: [file('index.html'), file('assets/hint-hash.js')] });
function state(): ShellState {
  const value = emptyShellState();
  for (const letter of ['a', 'b', 'c']) value.snapshots[name(letter)] = { buildId: id(letter), inventoryHash: id(letter), state: 'ready' };
  return value;
}

describe('authenticated bounded shell inventory', () => {
  it('accepts the real public/hash-asset path classes without broadening catalog caching', () => {
    expect(decodeInventory(inventory(), id('a'))).toEqual(inventory());
    expect(immutableShellPath('assets/hint-hash.js')).toBe(true);
    for (const path of ['index.html', 'pwa/icon-192.png', 'licenses/Outfit-OFL.txt', 'catalog/v1/LICENSE.txt']) expect(immutableShellPath(path)).toBe(false);
    for (const path of ['../other/index.html', '/assets/a.js', 'assets/../../other.js', 'https://other.test/a.js', 'catalog/v1/manifest.json', 'assets/a.js?x=1', 'assets/sub/a.js']) {
      expect(() => decodeInventory({ ...inventory(), files: [file('index.html'), file(path)] }, id('a'))).toThrow();
    }
  });
  it('rejects mismatched identities, malformed hashes, duplicate paths and missing HTML', () => {
    for (const value of [null, { ...inventory(), protocol: 2 }, { ...inventory(), buildId: id('b') }, { ...inventory(), files: [] },
      { ...inventory(), files: [file('index.html'), file('index.html')] }, { ...inventory(), files: [file('assets/a.js')] },
      { ...inventory(), files: [file('index.html'), { ...file('assets/a.js'), sha256: id('b') }] },
      { ...inventory(), files: [file('index.html'), { ...file('assets/a.js'), integrity: 'sha256-bad' }] },
      { ...inventory(), files: [file('index.html'), file('release.json')] },
    ]) expect(() => decodeInventory(value, id('a'))).toThrow();
  });
  it('enforces per-file, full-closure and entry-count bounds', () => {
    for (const bytes of [-1, NaN, 1.5, SHELL_FILE_LIMIT + 1]) expect(() => decodeInventory({ ...inventory(), files: [file('index.html', 'a', bytes)] }, id('a'))).toThrow();
    expect(() => decodeInventory({ ...inventory(), files: [file('index.html', 'a', SHELL_FILE_LIMIT), file('assets/a.js', 'a', SHELL_FILE_LIMIT), file('assets/b.js', 'a', 1)] }, id('a'))).toThrow();
    expect(() => decodeInventory({ ...inventory(), files: [file('index.html'), ...Array.from({ length: 256 }, (_, index) => file(`assets/${index}.js`))] }, id('a'))).toThrow();
    expect(SHELL_LIMIT).toBe(2 * SHELL_FILE_LIMIT);
  });
  it('allows mutable release changes but refuses same immutable URL with different bytes', () => {
    const a = inventory(), b = inventory('b');
    b.files[0] = file('index.html', 'b');
    expect(() => assertImmutableCompatibility([a, b])).not.toThrow();
    b.files[1] = file('assets/hint-hash.js', 'b');
    expect(() => assertImmutableCompatibility([a, b])).toThrow(/Immutable/);
  });
});

describe('persistent client pins and cache deletion gate', () => {
  it('reconstructs only the compiled own proof while preserving captured old cache dependencies without invented page identities', () => {
    const own = { buildId: id('c'), inventoryHash: id('c'), state: 'ready' as const };
    const recovered = reconstructedShellState([name('a'), name('b'), name('c')], name('c'), own, 100);
    expect(recovered.snapshots).toEqual({ [name('c')]: own }); expect(recovered.leases).toEqual({}); expect(recovered.seeded).toBe(true);
    expect(recovered.overflow).toEqual({ [name('a')]: 100, [name('b')]: 100, [name('c')]: 100 });
    expect(markDeleting(recovered, [name('a'), name('b')], new Set())).toEqual([]);
    seedLegacy(recovered, ['unknown-old'], [name('a'), name('b'), name('c')], name('c'), 101);
    expect(recovered.leases['unknown-old']).toBeUndefined();
    expect(connectPage(recovered, 'unknown-old', id('a'), 'old-doc', 102)).toBe(false);
    expect(recovered.leases['unknown-old'].primary).toBeUndefined();
    const future = name('d'); recovered.snapshots[future] = { buildId: id('d'), inventoryHash: id('d'), state: 'ready' };
    expect(markDeleting(recovered, [future], new Set())).toEqual([future]);
  });
  it('does not fabricate a verified own snapshot when reconstruction has no complete own closure', () => {
    const recovered = reconstructedShellState([name('a')], name('a'), undefined, 100);
    expect(recovered.snapshots).toEqual({}); expect(pinSnapshot(recovered, 'page', name('a'), 101)).toBe(false);
    expect(recovered.overflow[name('a')]).toBe(100);
    expect(() => reconstructedShellState(Array.from({ length: 65 }, () => name('a')), name('a'), undefined, 100)).toThrow();
  });
  it('keeps observed old/frozen clients protected after reconstruction without guessing their mutable build', () => {
    const recovered = reconstructedShellState([name('a'), name('b')], name('b'), { buildId: id('b'), inventoryHash: id('b'), state: 'ready' }, 1, ['old-live']);
    expect(recovered.leases['old-live']).toEqual({ caches: [name('a'), name('b')], observed: 1 });
    renewObserved(recovered, new Set(['old-live']), LEASE_AGE + 2);
    expect(recovered.overflow).toEqual({});
    expect(markDeleting(recovered, [name('a')], new Set())).toEqual([]);
    expect(recovered.leases['old-live'].primary).toBeUndefined(); expect(recovered.leases['old-live'].buildId).toBeUndefined();
  });
  it('seeds a legacy cohort once and never expands it with B/C staged caches', () => {
    const value = state();
    seedLegacy(value, ['old'], [name('a')], name('a'), 1);
    seedLegacy(value, ['old', 'new'], [name('a'), name('b'), name('c')], name('b'), 2);
    expect(value.leases.old).toEqual({ caches: [name('a')], primary: name('a'), observed: 1 });
    expect(value.leases.new).toBeUndefined();
  });
  it('reserves the initial legacy snapshots even when every legacy document is in BFCache', () => {
    const value = state();
    seedLegacy(value, [], [name('a')], name('a'), 1);
    expect(markDeleting(value, [name('a')], new Set())).toEqual([]);
    renewObserved(value, new Set(), LEASE_AGE + 2);
    expect(markDeleting(value, [name('a')], new Set())).toEqual([name('a')]);
    expect(value.leases['legacy:migration']).toBeUndefined();
  });
  it('keeps A for its old document while B controls it and C installs', () => {
    const value = state();
    seedLegacy(value, ['old'], [name('a')], name('a'), 1);
    expect(connectPage(value, 'new', id('b'), 'doc-b', 2)).toBe(true);
    expect(markDeleting(value, [name('a'), name('b'), name('c')], new Set([name('b'), name('c')]))).toEqual([]);
    expect(value.leases.old.primary).toBe(name('a'));
  });
  it('serializes either race ordering: pin before GC protects, GC before pin refuses', () => {
    const firstPin = state();
    expect(pinSnapshot(firstPin, 'page', name('a'), 1)).toBe(true);
    expect(markDeleting(firstPin, [name('a')], new Set())).toEqual([]);
    const firstGc = state();
    expect(markDeleting(firstGc, [name('a')], new Set())).toEqual([name('a')]);
    expect(pinSnapshot(firstGc, 'page', name('a'), 1)).toBe(false);
    expect(connectPage(firstGc, 'page', id('a'), 'late-doc', 2)).toBe(false);
    expect(firstGc.leases.page.caches).toEqual([]);
    expect(firstGc.snapshots[name('a')].state).toBe('deleting');
  });
  it('treats navigation pins as durable ownership before a page announces its document token', () => {
    const value = state();
    expect(pinSnapshot(value, 'page', name('a'), 1)).toBe(true);
    expect(value.leases.page.primary).toBe(name('a'));
    expect(connectPage(value, 'page', id('a'), 'doc-new', 2)).toBe(true);
    releasePage(value, 'page', id('a'), 'doc-old', false);
    expect(value.leases.page.documentId).toBe('doc-new');
    releasePage(value, 'page', id('a'), 'doc-new', true);
    expect(value.leases.page).toBeDefined();
    releasePage(value, 'page', id('b'), 'doc-new', false);
    expect(value.leases.page).toBeDefined();
    releasePage(value, 'page', id('a'), 'doc-new', false);
    expect(value.leases.page).toBeUndefined();
  });
  it('never maps an unknown network build to arbitrary current mutable resources', () => {
    const value = state();
    seedLegacy(value, ['page'], [name('a')], name('a'), 1);
    expect(connectPage(value, 'page', id('d'), 'network-doc', 2)).toBe(false);
    expect(value.leases.page.primary).toBeUndefined();
    expect(value.leases.page.caches).toEqual([name('a')]);
    expect(markDeleting(value, [name('a')], new Set())).toEqual([]);
  });
  it('renews live frozen clients before expiry and retains absent/BFCache leases for thirty days', () => {
    const value = state();
    connectPage(value, 'frozen', id('a'), 'doc-a', 1);
    connectPage(value, 'bfcache', id('b'), 'doc-b', 1);
    renewObserved(value, new Set(['frozen']), LEASE_AGE + 1);
    expect(value.leases.bfcache).toBeDefined();
    renewObserved(value, new Set(['frozen']), LEASE_AGE + 2);
    expect(value.leases.bfcache).toBeUndefined();
    expect(value.leases.frozen.observed).toBe(LEASE_AGE + 2);
    expect(markDeleting(value, [name('a'), name('b')], new Set())).toEqual([name('b')]);
    renewObserved(value, new Set(), 0);
    expect(value.leases.frozen).toBeDefined();
  });
  it('bounds metadata and refuses adjacent-app state instead of deleting it', () => {
    expect(validateShellState(state(), prefix)).toEqual(state());
    const foreign = state();
    foreign.snapshots['toadoku:pwa:1:%2Fneighbor%2F:' + id('a')] = { buildId: id('a'), state: 'ready' };
    expect(() => validateShellState(foreign, prefix)).toThrow();
    const many = state();
    for (let index = 0; index < 257; index++) many.leases[String(index)] = { caches: [], observed: 1 };
    expect(() => validateShellState(many, prefix)).toThrow();
    const malformed = state(); malformed.leases.page = { caches: [name('a'), name('a')], observed: 1 };
    expect(() => validateShellState(malformed, prefix)).toThrow();
  });
  it('compacts missing known pages by build without dropping legacy or recently created mappings', () => {
    const value = state();
    connectPage(value, 'closed-a', id('a'), 'doc-a', 1);
    connectPage(value, 'closed-a2', id('a'), 'doc-a2', 2);
    connectPage(value, 'live-b', id('b'), 'doc-b', 1);
    connectPage(value, 'new-c', id('c'), 'doc-c', 60_000);
    value.leases.legacy = { caches: [name('a')], primary: name('a'), observed: 1 };
    renewObserved(value, new Set(['live-b']), 60_002);
    compactAbsent(value, new Set(['live-b']), 60_002);
    expect(value.leases['closed-a']).toBeUndefined();
    expect(value.leases['closed-a2']).toBeUndefined();
    expect(value.overflow).toEqual({ [name('a')]: 2 });
    expect(value.leases['live-b']).toBeDefined(); expect(value.leases['new-c']).toBeDefined(); expect(value.leases.legacy).toBeDefined();
    expect(markDeleting(value, [name('a')], new Set())).toEqual([]);
  });
  it('also compacts closed navigation/module-worker pins without confusing them with unknown legacy clients', () => {
    const value = state();
    pinSnapshot(value, 'module-worker', name('a'), 1);
    value.leases.legacy = { caches: [name('b')], primary: name('b'), observed: 1 };
    compactAbsent(value, new Set(), 60_001);
    expect(value.leases['module-worker']).toBeUndefined(); expect(value.overflow[name('a')]).toBe(1);
    expect(value.leases.legacy).toBeDefined();
  });
  it('protects a verified navigation at the client cap without claiming precise offline readiness', () => {
    const value = state();
    for (let index = 0; index < 256; index++) value.leases[`legacy-${index}`] = { caches: [name('a')], primary: name('a'), observed: 1 };
    expect(pinSnapshot(value, 'new-page', name('b'), 2)).toBe(false);
    expect(value.overflow[name('b')]).toBe(2);
    expect(connectPage(value, 'new-page', id('b'), 'new-doc', 3)).toBe(false);
    expect(value.leases['new-page']).toBeUndefined();
    expect(value.overflow[name('b')]).toBe(3);
    expect(markDeleting(value, [name('a'), name('b')], new Set())).toEqual([]);
    expect(validateShellState(value, prefix)).toBe(value);
  });
  it('ages overflow builds independently so repeated new opens cannot retain every predecessor forever', () => {
    const value = state(); value.overflow = { [name('a')]: 1, [name('b')]: LEASE_AGE };
    renewObserved(value, new Set(), LEASE_AGE + 2);
    expect(value.overflow[name('a')]).toBeUndefined(); expect(value.overflow[name('b')]).toBe(LEASE_AGE);
    expect(markDeleting(value, [name('a'), name('b')], new Set())).toEqual([name('a')]);
  });
});
