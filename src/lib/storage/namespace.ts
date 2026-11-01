import { StorageFailure } from './transaction';

/** Database names are stable across schemas/catalogs, but isolated by application base. */
export function databaseName(base: URL | string): string {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || !url.pathname.endsWith('/')) {
    throw new TypeError('Expected an absolute HTTP application base URL ending in /');
  }
  return `toadodu:${encodeURIComponent(url.pathname)}`;
}

export function recoveryDatabaseName(name: string): string {
  const prefix = 'toadodu:';
  try {
    const path = decodeURIComponent(name.slice(prefix.length));
    if (!name.startsWith(prefix) || !path.startsWith('/') || !path.endsWith('/') || `${prefix}${encodeURIComponent(path)}` !== name) throw new Error();
    return name;
  } catch { throw new StorageFailure({ kind: 'corrupt', reason: 'raw-recovery-namespace' }); }
}
