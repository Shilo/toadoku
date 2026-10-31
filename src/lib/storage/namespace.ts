/** Database names are stable across schemas/catalogs, but isolated by application base. */
export function databaseName(base: URL | string): string {
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || !url.pathname.endsWith('/')) {
    throw new TypeError('Expected an absolute HTTP application base URL ending in /');
  }
  return `toadodu:${encodeURIComponent(url.pathname)}`;
}
