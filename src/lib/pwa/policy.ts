/** Cache ownership is app + deployment scope + exact Workbox release revision. */
export function ownedShellCache(name: string, prefix: string): boolean {
  return name.startsWith(prefix) && /^[a-f0-9]{64}$/.test(name.slice(prefix.length));
}
export function orphanShellCaches(names: readonly string[], protectedNames: ReadonlySet<string>, prefix: string): string[] {
  return names.filter(name => ownedShellCache(name, prefix) && !protectedNames.has(name));
}
export function automaticCheckAllowed(input: { failures: number; nextCheck: number; lastAttempt: number; now: number; hidden: boolean; online: boolean }): boolean {
  return !input.hidden && input.online && input.failures < 3 && input.now >= input.nextCheck && input.now - input.lastAttempt >= 10_000;
}
