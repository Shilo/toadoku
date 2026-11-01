import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
const execute = promisify(execFile);
const hash = (body: Uint8Array) => createHash('sha256').update(body).digest('hex');
async function fixture() {
  const folder = await mkdtemp(join(resolve('prototypes/pwa-validation'), 'retention-model-'));
  const root = join(folder, 'dist'), previous = join(folder, 'previous'), retained = join(folder, 'retained');
  await mkdir(join(root, 'assets'), { recursive: true }); await mkdir(join(previous, 'assets'), { recursive: true });
  const body = Buffer.from('current application');
  await writeFile(join(root, 'assets/current.js'), body);
  await writeFile(join(root, 'release.json'), JSON.stringify({ protocol: 1, buildId: 'b'.repeat(64), files: [{ path: 'assets/current.js', bytes: body.length, sha256: hash(body) }] }));
  await writeFile(join(previous, 'history.json'), JSON.stringify({ bootstrap: false }));
  return { root, previous, retained };
}
it('retains a release that was current for sixty days and expires actually superseded files', async () => {
  const f = await fixture(), old = Buffer.from('still-current old application'), obsolete = Buffer.from('retired long ago');
  const stale = Date.now() - 60 * 86400_000;
  const file = { path: 'assets/old.js', bytes: old.length, sha256: hash(old), lastCurrent: stale };
  await writeFile(join(f.previous, 'assets/old.js'), old); await writeFile(join(f.previous, 'assets/obsolete.js'), obsolete);
  await writeFile(join(f.previous, 'retention.json'), JSON.stringify({ protocol: 1, files: [file, { path: 'assets/obsolete.js', bytes: obsolete.length, sha256: hash(obsolete), lastCurrent: stale }] }));
  const server = createServer((request, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ protocol: 1, buildId: 'a'.repeat(64), files: [file] })); });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture address');
  try {
    await execute(process.execPath, ['tools/pwa/retain.mjs', f.root, f.previous, f.retained, `http://127.0.0.1:${address.port}/toadoku/`]);
    const result = JSON.parse(await readFile(join(f.root, 'retention.json'), 'utf8'));
    expect(result.files.map((item: { path: string }) => item.path).sort()).toEqual(['assets/current.js', 'assets/old.js']);
    expect(result.files.find((item: { path: string }) => item.path === file.path).lastCurrent).toBeGreaterThan(stale);
    expect(await readFile(join(f.root, file.path), 'utf8')).toBe(old.toString());
  } finally { await new Promise<void>(done => server.close(() => done())); }
});
it('fails publication instead of deleting an in-support predecessor at the byte cap', async () => {
  const f = await fixture();
  await writeFile(join(f.previous, 'retention.json'), JSON.stringify({ protocol: 1, files: [{ path: 'assets/large.js', bytes: 256 * 1024 * 1024, sha256: 'a'.repeat(64), lastCurrent: Date.now() }] }));
  await expect(execute(process.execPath, ['tools/pwa/retain.mjs', f.root, f.previous, f.retained])).rejects.toThrow();
});
it('rejects corrupt predecessor bytes even when the metadata claims them', async () => {
  const f = await fixture(); await writeFile(join(f.previous, 'assets/old.js'), 'wrong');
  await writeFile(join(f.previous, 'retention.json'), JSON.stringify({ protocol: 1, files: [{ path: 'assets/old.js', bytes: 5, sha256: 'a'.repeat(64), lastCurrent: Date.now() }] }));
  await expect(execute(process.execPath, ['tools/pwa/retain.mjs', f.root, f.previous, f.retained])).rejects.toThrow();
});
it('does not interpret missing existing host metadata as a safe empty deployment', async () => {
  const f = await fixture(), server = createServer((request, response) => { response.writeHead(404); response.end(); });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('fixture address');
  try { await expect(execute(process.execPath, ['tools/pwa/retain.mjs', f.root, f.previous, f.retained, `http://127.0.0.1:${address.port}/`])).rejects.toThrow(); }
  finally { await new Promise<void>(done => server.close(() => done())); }
});
