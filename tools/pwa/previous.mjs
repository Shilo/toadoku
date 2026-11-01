import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { initialReleaseProof } from './bootstrap.mjs';
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
const proof = await initialReleaseProof({
  assertion: process.env.TOADOKU_INITIAL_RELEASE, repository, base: process.env.TOADOKU_PAGES_BASE,
  sha: process.env.GITHUB_SHA, event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF,
  runId: Number(process.env.GITHUB_RUN_ID), attempt: Number(process.env.GITHUB_RUN_ATTEMPT),
  source: process.env.TOADOKU_INITIAL_RELEASE ? await readFile('.github/workflows/pages.yml') : new Uint8Array(), read: api,
});
const { data: { workflow_runs: runs } } = await api('actions/workflows/pages.yml/runs?branch=main&status=completed&per_page=100');
if (!Array.isArray(runs)) throw new Error('Invalid workflow history');
let found;
for (const run of runs) {
  if (run.head_branch !== 'main' || !/^\.github\/workflows\/pages\.yml(?:@[^?\s]+)?$/.test(run.path)) throw new Error('Unexpected publication workflow identity');
  const { data: { artifacts, total_count: artifactCount }, hasNext: moreArtifacts } = await api(`actions/runs/${run.id}/artifacts?per_page=100`);
  if (!Array.isArray(artifacts) || moreArtifacts || artifactCount !== artifacts.length) throw new Error('Incomplete publication artifact inventory');
  const archive = artifacts.find(artifact => artifact.name === 'toadoku-retained-assets');
  if (archive && !archive.expired) { found = archive; break; }
  // An expired archive is harmless only after every superseded asset's 30-day window.
  if (Date.now() - Date.parse(run.updated_at) > 30 * 86400_000) break;
  const { data: { jobs, total_count: jobCount }, hasNext: moreJobs } = await api(`actions/runs/${run.id}/jobs?filter=all&per_page=100`);
  if (!Array.isArray(jobs) || moreJobs || jobCount !== jobs.length) throw new Error('Incomplete publication job inventory');
  if (jobs.some(job => job.steps?.some(step => step.name === 'Stage retained asset archive' && step.conclusion === 'success'))) throw new Error('A recent uploaded archive is missing; publication refused');
}
if (!found && runs.length === 100 && runs.every(run => Date.now() - Date.parse(run.updated_at) <= 30 * 86400_000)) throw new Error('Publication history exceeds bounded scan; restore retained archive explicitly');
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
