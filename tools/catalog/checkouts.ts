import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { copyFile, mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from './identity.ts';
export function withinWorkspace(parent: string, candidate: string): boolean {
  const root = resolve(parent), target = resolve(candidate);
  return target.startsWith(root + sep);
}
function command(executable: string, args: string[], cwd: string): string {
  return execFileSync(executable, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, env: { ...process.env, TEMP: join(cwd, 'prototypes/gameplay-validation/tmp'), TMP: join(cwd, 'prototypes/gameplay-validation/tmp') } });
}
async function serveBytes(root: string, expected: Record<string, string>) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const relative = pathname.startsWith('/toadoku/') ? pathname.slice('/toadoku/'.length) : pathname.slice(1);
    const path = resolve(root, relative);
    if (!withinWorkspace(root, path)) { response.writeHead(403).end(); return; }
    void readFile(path).then(bytes => { response.writeHead(200, { 'Content-Length': bytes.length }); response.end(bytes); }, () => response.writeHead(404).end());
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('HTTP bind');
  try {
    for (const base of ['', '/toadoku']) for (const [file, hash] of Object.entries(expected)) {
      const response = await fetch(`http://127.0.0.1:${address.port}${base}/catalog/v1/${file}`);
      if (!response.ok || sha256(new Uint8Array(await response.arrayBuffer())) !== hash) throw new Error(`served byte mismatch ${base}/${file}`);
    }
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
}
export async function verifyCleanCheckouts() {
  const root = resolve('.'), head = command('git', ['rev-parse', 'HEAD'], root).trim();
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const evidence = resolve('prototypes/gameplay-validation/checkouts', `${head.slice(0, 12)}-${stamp}`);
  if (!withinWorkspace(resolve('prototypes/gameplay-validation'), evidence)) throw new Error('checkout path boundary');
  await mkdir(evidence, { recursive: true });
  const npmCli = process.env.npm_execpath ?? resolve(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js');
  await access(npmCli);
  const sourceLock = JSON.parse(await readFile('data/catalog/source-lock.json', 'utf8'));
  const manifest = JSON.parse(await readFile('public/catalog/v1/manifest.json', 'utf8'));
  const expected: Record<string, string> = {};
  for (const file of ['manifest.json', 'PROVENANCE.json', 'LICENSE.txt', ...Object.values(manifest.pools).flatMap((p: unknown) => (p as { shards: { path: string }[] }).shards.map(s => s.path))]) expected[file] = sha256(await readFile(`public/catalog/v1/${file}`));
  const trust = await readFile('src/lib/catalog/trust.v1.ts');
  const results: unknown[] = [];
  for (const autocrlf of ['true', 'false']) {
    const checkout = join(evidence, `autocrlf-${autocrlf}`);
    if (!withinWorkspace(resolve('prototypes/gameplay-validation/checkouts'), checkout)) throw new Error('fresh clone boundary');
    command('git', ['clone', '--local', '--no-hardlinks', '--no-checkout', root.replaceAll('\\', '/'), checkout.replaceAll('\\', '/')], root);
    if (command('git', ['rev-parse', 'HEAD'], checkout).trim() !== head) throw new Error('checkout HEAD mismatch');
    command('git', ['read-tree', 'HEAD'], checkout);
    const attr = command('git', ['-c', `core.autocrlf=${autocrlf}`, 'check-attr', '--cached', '--all', '--', 'public/catalog/v1/manifest.json', 'public/catalog/v1/LICENSE.txt', 'src/lib/catalog/trust.v1.ts', 'tools/catalog/import.ts'], checkout);
    if (!attr.includes('public/catalog/v1/manifest.json: text: unset') || !attr.includes('public/catalog/v1/LICENSE.txt: text: unset') || !attr.includes('src/lib/catalog/trust.v1.ts: eol: lf') || !attr.includes('tools/catalog/import.ts: eol: lf')) throw new Error('committed byte attributes missing');
    const checkoutLog = command('git', ['-c', `core.autocrlf=${autocrlf}`, 'checkout', '--force', head], checkout);
    if (command('git', ['-c', `core.autocrlf=${autocrlf}`, 'status', '--porcelain'], checkout).trim()) throw new Error('fresh checkout not clean');
    const tmp = join(checkout, 'prototypes/gameplay-validation/tmp'); await mkdir(tmp, { recursive: true });
    const installLog = command(process.execPath, [npmCli, 'ci'], checkout);
    const raw = join(checkout, 'prototypes/gameplay-validation/raw'); await mkdir(raw, { recursive: true });
    for (const file of [...Object.keys(sourceLock.files), 'LICENSE.txt', 'README.md']) {
      const bytes = await readFile(`prototypes/gameplay-validation/raw/${file}`);
      const hash = file === 'LICENSE.txt' ? sourceLock.license.sha256 : file === 'README.md' ? sourceLock.readmeSha256 : sourceLock.files[file].sha256;
      if (sha256(bytes) !== hash) throw new Error(`raw capture mismatch ${file}`);
      await copyFile(`prototypes/gameplay-validation/raw/${file}`, join(raw, file));
    }
    const importLog = command(process.execPath, ['tools/catalog/import.ts'], checkout);
    for (const [file, hash] of Object.entries(expected)) if (sha256(await readFile(join(checkout, 'public/catalog/v1', file))) !== hash) throw new Error(`checkout import mismatch ${autocrlf}/${file}`);
    if (!trust.equals(await readFile(join(checkout, 'src/lib/catalog/trust.v1.ts')))) throw new Error('compiled trust root checkout mismatch');
    const buildLog = command(process.execPath, [npmCli, 'run', 'build'], checkout);
    await serveBytes(join(checkout, 'dist'), expected);
    const status = command('git', ['-c', `core.autocrlf=${autocrlf}`, 'status', '--short'], checkout);
    // The importer temporarily sets the tracked final certificate to pending; compare data bytes above.
    const unexpected = status.split(/\r?\n/).filter(line => line && !line.endsWith('data/catalog/certificate.v1.json'));
    if (unexpected.length) throw new Error(`checkout rebuild changed tracked files: ${unexpected.join(', ')}`);
    results.push({ autocrlf, head, attributes: attr, servedFiles: Object.keys(expected).length, rootAndSubpathHashes: 'all match', status });
    await writeFile(join(evidence, `autocrlf-${autocrlf}.log`), [checkoutLog, installLog, importLog, buildLog, attr, status].join('\n'));
    console.log(`clean checkout autocrlf=${autocrlf}: ${Object.keys(expected).length} files rebuilt and served at root/subpath`);
  }
  const summary = { head, sourceInputs: 'same exact pinned capture, verified against source-lock', results };
  await writeFile(join(evidence, 'summary.json'), JSON.stringify(summary) + '\n');
  await writeFile('prototypes/gameplay-validation/checkout-summary.json', JSON.stringify(summary) + '\n');
  return summary;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await verifyCleanCheckouts();
