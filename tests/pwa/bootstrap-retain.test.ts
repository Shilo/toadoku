import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
const execute = promisify(execFile);
async function retainFixture(indexStatus: number, bootstrap: boolean, identityPatch: Record<string, unknown> = {}, environmentPatch: Record<string, string> = {}, proofPatch: Record<string, unknown> = {}) {
  await mkdir('prototypes/pwa-validation', { recursive: true });
  const folder = await mkdtemp(resolve('prototypes/pwa-validation/bootstrap-host-'));
  const dist = join(folder, 'dist'), previous = join(folder, 'previous');
  await mkdir(dist); await mkdir(previous);
  await writeFile(join(dist, 'release.json'), JSON.stringify({ protocol: 1, buildId: 'a'.repeat(64), files: [] }));
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url ?? '');
    response.writeHead(request.url === '/game/index.html' ? indexStatus : 404);
    response.end(indexStatus === 200 ? 'Existing legacy game' : '');
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('fixture address');
  const base = `http://127.0.0.1:${address.port}/game/`;
  const identity = { repository: 'Owner/Game', site: base, sha: 'a'.repeat(40), runId: 100, attempt: 1, ...identityPatch };
  await writeFile(join(previous, 'history.json'), JSON.stringify({ bootstrap, reason: 'fixture scoped proof', identity, assertion: `${identity.repository}|${identity.site}|${identity.sha}`, ...proofPatch }));
  try {
    const result = await execute(process.execPath, ['tools/pwa/retain.mjs', dist, previous, join(folder, 'retained'), base], { env: { ...process.env, GITHUB_REPOSITORY: 'Owner/Game', GITHUB_SHA: 'a'.repeat(40), GITHUB_RUN_ID: '100', GITHUB_RUN_ATTEMPT: '1', ...environmentPatch } }).then(() => ({ passed: true, error: '' }), error => ({ passed: false, error: String(error.stderr) }));
    return { ...result, requests, folder, dist };
  } finally { await new Promise<void>(done => server.close(() => done())); }
}
it('refuses legacy index200 despite a first-release proof and metadata404', async () => {
  const f = await retainFixture(200, true); expect(f.passed).toBe(false); expect(f.error).toContain('migrate its assets');
  expect(f.requests).toEqual(['/game/release.json', '/game/index.html']);
});
it('allows a proven initial empty target only when both metadata and index are404', async () => {
  const f = await retainFixture(404, true); expect(f.passed).toBe(true);
  expect(f.requests).toEqual(['/game/release.json', '/game/index.html']);
  expect(JSON.parse(await readFile(join(f.dist, 'retention.json'), 'utf8')).files).toEqual([]);
});
it('without an automatic history proof refuses metadata404 with recovery guidance and makes no extra probe', async () => {
  const f = await retainFixture(404, false); expect(f.passed).toBe(false);
  expect(f.error).toContain('docs/pwa-system.md'); expect(f.error).toContain('fixture scoped proof');
  expect(f.requests).toEqual(['/game/release.json']);
});

it.each([{ site: 'https://wrong.example/' }, { sha: 'bad' }, { repository: 'not-a-repository' }, { runId: 0 }, { attempt: 0 }])('refuses a malformed or wrong-target proof before probing index %#', async identity => {
  const f = await retainFixture(404, true, identity); expect(f.passed).toBe(false);
  expect(f.error).toContain('proof identity'); expect(f.requests).toEqual(['/game/release.json']);
});
it('refuses a proof from a different supplied current workflow identity', async () => {
  const f = await retainFixture(404, true, {}, { GITHUB_RUN_ID: '101' });
  expect(f.passed).toBe(false); expect(f.error).toContain('does not match this workflow');
});
it('keeps the automatic history proof bound to its exact internal identity', async () => {
  const f = await retainFixture(404, true, {}, {}, { assertion: 'Owner/Game|https://other.example/|'.concat('a'.repeat(40)) });
  expect(f.passed).toBe(false); expect(f.error).toContain('proof identity');
  expect(f.requests).toEqual(['/game/release.json']);
});
it.each([302, 500])('refuses unknown index status %s with migration guidance', async status => {
  const f = await retainFixture(status, true); expect(f.passed).toBe(false); expect(f.error).toContain('migrate its assets');
});
