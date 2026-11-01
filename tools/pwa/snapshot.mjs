import { mkdir, readFile, readdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const [root = 'dist', target = 'prototypes/pwa-validation/rollback'] = process.argv.slice(2);
const release = JSON.parse(await readFile(join(root, 'release.json'), 'utf8'));
const paths = new Set([...release.files.map(file => file.path), 'worker.js', 'release.json', ...(await readdir(join(root, 'catalog/v1'))).map(file => `catalog/v1/${file}`)]);
let bytes = 0;
for (const path of paths) {
  if (path.includes('..') || path.startsWith('/')) throw new Error('Invalid rollback path');
  const body = await readFile(join(root, path)); bytes += body.length;
  if (bytes > 42 * 1024 * 1024) throw new Error('Compact rollback exceeds 42 MiB');
  await mkdir(dirname(join(target, path)), { recursive: true }); await copyFile(join(root, path), join(target, path));
}
console.log(JSON.stringify({ buildId: release.buildId, snapshotBytes: bytes, files: paths.size }));
