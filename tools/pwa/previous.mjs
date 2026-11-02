import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initialReleaseProof } from './bootstrap.mjs';
import { previousArchive } from './previous-history.mjs';
import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const repository = process.env.GITHUB_REPOSITORY, token = process.env.GH_TOKEN;
if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? '') || !token) throw new Error('GitHub repository and read token required');
const directory = 'prototypes/pwa-validation';
await mkdir(`${directory}/previous`, { recursive: true });
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
let requests = 0;
const reads = new Map();
function reserve() { if (++requests > 100) throw new Error('Publication read API budget exceeded; inspect history explicitly'); }
function api(path) {
  if (!reads.has(path)) reads.set(path, (async () => {
    reserve();
    const response = await fetch(`https://api.github.com/repos/${repository}/${path}`, { headers, redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (!response.ok) throw new Error(`Cannot establish retained publication history: HTTP ${response.status}`);
    const reader = response.body?.getReader(); if (!reader) throw new Error('Missing history response');
    const parts = []; let bytes = 0;
    try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > 4 * 1024 * 1024) { await reader.cancel(); throw new Error('History response exceeds byte budget'); } parts.push(Buffer.from(part.value)); } } finally { reader.releaseLock(); }
    return { data: JSON.parse(Buffer.concat(parts).toString('utf8')), hasNext: /rel="next"/.test(response.headers.get('link') ?? '') };
  })());
  return reads.get(path);
}
// A normal hosted release needs no first-publication history scan. Never send the GitHub token to the site.
const site = new URL(process.env.TOADOKU_PAGES_BASE);
if (site.protocol !== 'https:' || site.href !== process.env.TOADOKU_PAGES_BASE || site.username || site.password || site.search || site.hash || !site.pathname.endsWith('/')) throw new Error('Invalid configured Pages base');
const probe = await fetch(new URL('release.json', site), { redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30_000) });
await probe.body?.cancel();
if (![200, 404].includes(probe.status)) throw new Error(`Cannot establish hosted release presence: HTTP ${probe.status}`);
const proof = probe.status === 404 ? await initialReleaseProof({
  repository, base: site.href, sha: process.env.GITHUB_SHA,
  event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF,
  runId: Number(process.env.GITHUB_RUN_ID), attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
  source: await readFile('.github/workflows/pages.yml'), read: api,
}) : { bootstrap: false, reason: 'Hosted release exists; normal asset retention applies' };
const found = await previousArchive({ repository, runId: Number(process.env.GITHUB_RUN_ID), attempt: Number(process.env.GITHUB_RUN_ATTEMPT), read: api });
await writeFile(`${directory}/previous/history.json`, JSON.stringify({ ...proof, archiveId: found?.id }));
if (found) {
  if (found.size_in_bytes > 300 * 1024 * 1024) throw new Error('Retained archive exceeds download budget');
  reserve();
  const redirect = await fetch(`https://api.github.com/repos/${repository}/actions/artifacts/${found.id}/zip`, { headers, redirect: 'manual', signal: AbortSignal.timeout(30_000) });
  if (redirect.status !== 302 || !redirect.headers.get('location')?.startsWith('https://')) throw new Error('Invalid artifact download location');
  const response = await fetch(redirect.headers.get('location'), { redirect: 'error', signal: AbortSignal.timeout(120_000) });
  if (!response.ok || !response.body) throw new Error('Retained archive unavailable');
  let bytes = 0;
  const limit = new Transform({ transform(chunk, encoding, callback) { bytes += chunk.length; callback(bytes > 300 * 1024 * 1024 ? new Error('Archive byte budget exceeded') : null, chunk); } });
  await pipeline(Readable.fromWeb(response.body), limit, createWriteStream(`${directory}/previous.zip`));
  console.log(`Retaining publication archive ${found.id} from completed workflow, independent of later probe result`);
} else console.log(`No in-window archive; current hosted release must establish retained active assets. ${proof.reason}`);
