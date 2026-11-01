import { expect, it } from 'vitest';
import { assertHostedMime } from '../../tools/pwa/host-mime.mjs';
it('accepts known actual browser resource MIME families and charset parameters', () => {
  for (const [path, mime] of [
    ['worker.js','text/javascript; charset=utf-8'], ['assets/code.js','application/javascript'], ['index.html','text/html'],
    ['assets/style.css','text/css'], ['release.json','application/json'], ['manifest.webmanifest','application/manifest+json'],
    ['assets/Outfit.ttf','font/ttf'], ['assets/Outfit.ttf','application/octet-stream'], ['assets/font.woff2','font/woff2'],
    ['pwa/icon.png','image/png'], ['pwa/icon.svg','image/svg+xml'], ['assets/image.webp','image/webp'], ['licenses/notice.txt','text/plain'],
  ]) expect(() => assertHostedMime(path, mime)).not.toThrow();
});
it('rejects correct bytes with a non-executable MIME, missing metadata types and unknown required extensions', () => {
  for (const [path, mime] of [['worker.js','text/html'], ['assets/style.css','text/plain'], ['release.json','text/html'], ['manifest.webmanifest','text/cache-manifest'], ['assets/file.bin','application/octet-stream'], ['index.html','application/json'], ['pwa/icon.png','image/jpeg'], ['release.json','']]) expect(() => assertHostedMime(path, mime)).toThrow();
  expect(() => assertHostedMime('worker.js', null)).toThrow();
});
