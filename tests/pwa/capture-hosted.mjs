// Capture actual published bytes for an honest legacy-to-new-worker upgrade test.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
const [source = 'https://shilo.github.io/toadoku/', output = 'prototypes/pwa-validation/legacy-46'] = process.argv.slice(2);
const base = new URL(source), root = resolve(output);
async function download(path) {
  const response = await fetch(new URL(path, base), { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${path}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 4 * 1024 * 1024) throw Error('Legacy response budget');
  await mkdir(dirname(resolve(root, path)), { recursive: true }); await writeFile(resolve(root, path), bytes);
  return bytes;
}
const metadata = await download('release.json'), release = JSON.parse(metadata);
if (release.version !== '0.0.46' || release.protocol !== 1 || release.files.length > 256 || release.bytes > 8 * 1024 * 1024) throw Error('Expected published legacy version 0.0.46');
for (const file of release.files) {
  if (!/^[\w./-]+$/.test(file.path) || file.path.includes('..')) throw Error('Unsafe capture path');
  const bytes = await download(file.path);
  if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) throw Error(`Hosted mismatch: ${file.path}`);
}
const worker = await download('worker.js');
await writeFile(resolve(root, 'capture.json'), JSON.stringify({ source: base.href, capturedAt: new Date().toISOString(), version: release.version, buildId: release.buildId, workerSha256: createHash('sha256').update(worker).digest('hex') }, null, 2));
console.log(JSON.stringify({ root, version: release.version, buildId: release.buildId, files: release.files.length }));
