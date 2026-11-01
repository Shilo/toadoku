/** Validate the actual MIME families needed by the emitted browser dependency graph. */
export function assertHostedMime(path, header) {
  const type = (header ?? '').split(';', 1)[0].trim().toLowerCase();
  const extension = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  const accepted = {
    js: ['text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'],
    css: ['text/css'], html: ['text/html'], png: ['image/png'], svg: ['image/svg+xml'], webp: ['image/webp'],
    txt: ['text/plain'], ttf: ['font/ttf', 'application/x-font-ttf', 'application/font-sfnt', 'application/octet-stream'],
    woff: ['font/woff', 'application/font-woff', 'application/x-font-woff', 'application/octet-stream'],
    woff2: ['font/woff2', 'application/font-woff2', 'application/octet-stream'],
  };
  const valid = extension === 'json' || extension === 'webmanifest'
    ? /^application\/(?:[a-z0-9!#$&^_.+-]+\+)?json$/.test(type)
    : accepted[extension]?.includes(type);
  if (!valid) throw new Error(`Hosted resource has unsupported Content-Type: ${path}`);
}
