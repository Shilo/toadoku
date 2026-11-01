/** Match the actual media type, never a substring hidden in a header parameter. */
export function acceptableShellMime(url: string, header: string): boolean {
  const path = new URL(url, 'https://offline.invalid/').pathname;
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const type = header.split(';', 1)[0].trim().toLowerCase();
  const accepted: Record<string, readonly string[]> = {
    js: ['text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'],
    css: ['text/css'], html: ['text/html'], png: ['image/png'], svg: ['image/svg+xml'], webp: ['image/webp'], txt: ['text/plain'],
    ttf: ['font/ttf', 'application/x-font-ttf', 'application/font-sfnt', 'application/octet-stream'],
    woff: ['font/woff', 'application/font-woff', 'application/x-font-woff', 'application/octet-stream'],
    woff2: ['font/woff2', 'application/font-woff2', 'application/octet-stream'],
  };
  return extension === 'json' || extension === 'webmanifest'
    ? /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json$/.test(type)
    : accepted[extension]?.includes(type) === true;
}

/** Cache ownership is app + deployment scope + exact Workbox release revision. */
export function ownedShellCache(name: string, prefix: string): boolean {
  return name.startsWith(prefix) && /^[a-f0-9]{64}$/.test(name.slice(prefix.length));
}
export function orphanShellCaches(names: readonly string[], protectedNames: ReadonlySet<string>, prefix: string): string[] {
  return names.filter(name => ownedShellCache(name, prefix) && !protectedNames.has(name));
}
export function automaticCheckAllowed(input: { failures: number; nextCheck: number; lastAttempt: number; now: number; hidden: boolean; online: boolean }): boolean {
  return !input.hidden && input.online && input.now >= input.nextCheck && input.now - (input.lastAttempt > input.now ? 0 : input.lastAttempt) >= 60_000;
}

export interface IntegrityEntry { url: string; revision?: string | null; integrity?: string }
/** Plugin-added public entries bypass Workbox's glob transforms. Merge only identical identities. */
export function normalizePrecache(entries: readonly IntegrityEntry[], scope = 'https://toadoku.invalid/'): IntegrityEntry[] {
  const unique = new Map<string, IntegrityEntry>();
  const base = new URL(scope);
  if (!base.pathname.endsWith('/')) throw new Error('Invalid precache scope');
  for (const entry of entries) {
    if (typeof entry.url !== 'string' || !entry.url || entry.url.includes('..') || entry.url.startsWith('/') || /[:?#]/.test(entry.url)) throw new Error('Invalid precache path');
    const url = new URL(entry.url, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Invalid precache scope');
    const canonical = url.href.slice(base.href.length);
    const previous = unique.get(canonical);
    if (previous && (previous.revision !== entry.revision || previous.integrity && entry.integrity && previous.integrity !== entry.integrity)) throw new Error('Conflicting precache identity');
    unique.set(canonical, { ...entry, url: canonical, integrity: entry.integrity || previous?.integrity });
  }
  for (const entry of unique.values()) if (!/^sha256-[A-Za-z0-9+/]{43}=$/.test(entry.integrity ?? '')) throw new Error('Missing or invalid precache integrity');
  return [...unique.values()];
}

export function restoredBackoff(value: unknown, now: number): { failures: number; nextCheck: number } | undefined {
  if (!value || typeof value !== 'object') return;
  const saved = value as { failures?: unknown; nextCheck?: unknown };
  if (typeof saved.failures !== 'number' || !Number.isInteger(saved.failures) || saved.failures < 0 || saved.failures > 3 ||
      typeof saved.nextCheck !== 'number' || !Number.isFinite(saved.nextCheck) || saved.nextCheck < 0 || saved.nextCheck > now + 86_400_000) return;
  return { failures: saved.failures, nextCheck: saved.nextCheck };
}
