import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export const MAX_SHELL_BYTES = 8 * 1024 * 1024;
export const MAX_RESOURCE_BYTES = 4 * 1024 * 1024;
export const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
export const integrity = (bytes: Uint8Array) => `sha256-${createHash('sha256').update(bytes).digest('base64')}`;
export async function files(root: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(join(root, prefix), { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => entry.isDirectory() ? files(root, `${prefix}${entry.name}/`) : [`${prefix}${entry.name}`]));
  return nested.flat().sort();
}
export function shellFile(path: string): boolean {
  return path === 'index.html' || path === 'manifest.webmanifest' || /^assets\/[\w.-]+\.(js|css|ttf|woff2?|png|svg|webp)$/.test(path) || /^pwa\/[\w.-]+\.(png|svg|txt)$/.test(path) || /^licenses\/[\w.-]+\.(txt|json)$/.test(path) || /^catalog\/v1\/(LICENSE.txt|PROVENANCE.json)$/.test(path);
}
export function mime(path: string): string {
  return path.endsWith('.js') ? 'javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : path.endsWith('.json') || path.endsWith('.webmanifest') ? 'json' : path.endsWith('.png') ? 'image/png' : path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.ttf') ? 'font/' : path.endsWith('.txt') ? 'text/plain' : '';
}
/** Runs after emitted files exist and before the PWA plugin inventories them. */
export function pwaRelease(): Plugin {
  let output = 'dist', failed = false;
  let originalError: unknown;
  return {
    name: 'toadoku-release-inventory', apply: 'build',
    configResolved(config) { output = config.build.outDir; },
    async buildEnd(error) { if (error) { failed = true; originalError = error; await mkdir(output, { recursive: true }); await writeFile(join(output, '.pwa-failed'), 'Application build failed'); } },
    closeBundle: { order: 'pre', sequential: true, async handler(error) {
      if (error || failed) throw originalError ?? error ?? new Error('Refusing offline inventory after failed application build');
      await rm(join(output, '.pwa-failed'), { force: true });
      await mkdir(join(output, 'licenses'), { recursive: true });
      await copyFile('node_modules/workbox-core/LICENSE', join(output, 'licenses', 'Workbox-MIT.txt'));
      for (const file of ['Outfit-OFL.txt', 'Chewy-LICENSE.txt']) await copyFile(`src/assets/fonts/${file}`, join(output, 'licenses', file));
      const emitted = await files(output);
      if (emitted.some(path => /(?:\.map$|prototypes|__dev|fixtures|\.env)/.test(path))) throw new Error('Forbidden production artifact');
      const shell = emitted.filter(shellFile);
      if (!shell.includes('index.html') || !shell.some(path => path.includes('hint.worker')) || !shell.some(path => path.includes('backup.worker')) || !shell.some(path => path.includes('raw-recovery.worker'))) throw new Error('Incomplete offline worker closure');
      // Bind worker behavior as well as emitted bytes. The meta insertion is excluded to avoid a hash cycle.
      const identity = await Promise.all(shell.map(async path => [path, digest(await readFile(join(output, path)))]));
      const buildId = digest(JSON.stringify({ protocol: 1, files: identity, workerInputs: await Promise.all(['src/lib/pwa/worker.ts', 'src/lib/pwa/policy.ts', 'vite.config.ts', 'tools/pwa/build.ts', 'package-lock.json'].map(async path => [path, digest(await readFile(path))])), marker: process.env.TOADOKU_RELEASE_MARKER ?? '' }));
      const index = (await readFile(join(output, 'index.html'), 'utf8')).replace('</head>', `<meta name="toadoku-build" content="${buildId}" /></head>`);
      await writeFile(join(output, 'index.html'), index);
      const inventory = await Promise.all(shell.map(async path => { const bytes = await readFile(join(output, path)); if (bytes.length > MAX_RESOURCE_BYTES) throw new Error(`Oversized shell resource: ${path}`); return { path, bytes: bytes.length, sha256: digest(bytes), integrity: integrity(bytes), mime: mime(path) }; }));
      const bytes = inventory.reduce((sum, file) => sum + file.bytes, 0);
      if (bytes > MAX_SHELL_BYTES) throw new Error('Offline application shell exceeds 8 MiB');
      await writeFile(join(output, 'release.json'), JSON.stringify({ protocol: 1, buildId, bytes, files: inventory }));
    } },
  };
}
