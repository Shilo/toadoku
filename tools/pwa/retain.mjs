import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const [root = 'dist', previous = '', retained = 'prototypes/pwa-validation/retained-assets', hostedBase = ''] = process.argv.slice(2);
const now = Date.now(), age = 30 * 86400_000, cap = 256 * 1024 * 1024;
const release = JSON.parse(await readFile(join(root, 'release.json'), 'utf8'));
const entries = new Map();
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const safePath = path => typeof path === 'string' && /^assets\/[\w.-]+\.(?:js|css|ttf|woff2?|png|svg|webp)$/.test(path);
if (previous) {
  let old;
  try { old = JSON.parse(await readFile(join(previous, 'retention.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (old) {
    if (old.protocol !== 1 || !Array.isArray(old.files)) throw new Error('Invalid retained artifact');
    for (const file of old.files) {
      if (!safePath(file.path) || !Number.isFinite(file.lastCurrent) || file.lastCurrent > now || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0) throw new Error('Invalid retained file identity');
      entries.set(file.path, { ...file, source: join(previous, file.path) });
    }
  }
}
async function bounded(url, maximum) {
  const response = await fetch(url, { redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(30_000) });
  if (response.status === 404) return;
  if (!response.ok || !response.body) throw new Error(`Hosted retention response failed: HTTP ${response.status}`);
  const reader = response.body.getReader(), parts = []; let bytes = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; bytes += part.value.length; if (bytes > maximum) { await reader.cancel(); throw new Error('Hosted retention byte budget exceeded'); } parts.push(Buffer.from(part.value)); } } finally { reader.releaseLock(); }
  return Buffer.concat(parts);
}
// An old release can remain current for months. Start its retention clock when superseded, not when built.
if (hostedBase) {
  const base = new URL(hostedBase);
  if (base.protocol !== 'https:' && base.hostname !== '127.0.0.1') throw new Error('Unsafe hosting base');
  const body = await bounded(new URL('release.json', base), 128 * 1024);
  if (!body) {
    const history = JSON.parse(await readFile(join(previous, 'history.json'), 'utf8'));
    if (history.bootstrap !== true) throw new Error(`Hosted release metadata unavailable; publication refused. First-publication setup: docs/pwa-system.md. ${history.reason ?? 'One-time never-published confirmation and complete skipped-deployment proof required'}`);
    const identity = history.identity;
    if (!identity || !/^[\w.-]+\/[\w.-]+$/.test(identity.repository ?? '') || identity.site !== base.href || !/^[a-f0-9]{40}$/.test(identity.sha ?? '') || !Number.isSafeInteger(identity.runId) || identity.runId < 1 || !Number.isSafeInteger(identity.attempt) || identity.attempt < 1 || identity.attempt > 100 || history.assertion !== `${identity.repository}|${identity.site}|${identity.sha}`) throw new Error('Invalid or mismatched first-publication proof identity; see docs/pwa-system.md');
    for (const [key, value] of [['GITHUB_REPOSITORY', identity.repository], ['GITHUB_SHA', identity.sha], ['GITHUB_RUN_ID', String(identity.runId)], ['GITHUB_RUN_ATTEMPT', String(identity.attempt)]]) if (process.env[key] !== undefined && process.env[key] !== value) throw new Error('First-publication proof does not match this workflow; see docs/pwa-system.md');
    try {
      if (await bounded(new URL('index.html', base), 128 * 1024) !== undefined) throw new Error('Existing index response');
    } catch (cause) { throw new Error('Target is not proven empty; migrate its assets explicitly before publication (docs/pwa-system.md)', { cause }); }
  } else {
    const current = JSON.parse(body.toString('utf8'));
    if (current.protocol !== 1 || !/^[a-f0-9]{64}$/.test(current.buildId) || !Array.isArray(current.files) || current.files.length > 256) throw new Error('Invalid currently hosted release');
    let fetched = 0;
    for (const file of current.files.filter(file => file.path?.startsWith('assets/'))) {
      if (!safePath(file.path) || !/^[a-f0-9]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.bytes) || file.bytes < 0 || file.bytes > 4 * 1024 * 1024) throw new Error('Invalid hosted current asset');
      const old = entries.get(file.path);
      if (old && now - old.lastCurrent <= age && (old.sha256 !== file.sha256 || old.bytes !== file.bytes)) throw new Error('Immutable supported asset URL changed bytes; publication refused');
      if (old?.sha256 === file.sha256 && old.bytes === file.bytes) entries.set(file.path, { ...old, lastCurrent: now });
      else {
        fetched += file.bytes; if (fetched > 8 * 1024 * 1024) throw new Error('Current hosted asset recovery exceeds 8 MiB');
        const bytes = await bounded(new URL(file.path, base), 4 * 1024 * 1024);
        if (!bytes || bytes.length !== file.bytes || hash(bytes) !== file.sha256) throw new Error('Current hosted asset bytes unavailable');
        entries.set(file.path, { path: file.path, bytes: file.bytes, sha256: file.sha256, lastCurrent: now, body: bytes });
      }
    }
  }
}
for (const [path, file] of entries) if (now - file.lastCurrent > age) entries.delete(path);
for (const file of release.files.filter(file => file.path.startsWith('assets/'))) {
  const old = entries.get(file.path);
  if (old && (old.sha256 !== file.sha256 || old.bytes !== file.bytes)) throw new Error('Immutable supported asset URL changed bytes; publication refused');
  entries.set(file.path, { path: file.path, bytes: file.bytes, sha256: file.sha256, lastCurrent: now, source: join(root, file.path) });
}
const files = [...entries.values()].sort((a, b) => a.path.localeCompare(b.path));
const bytes = files.reduce((sum, file) => sum + file.bytes, 0);
if (!Number.isSafeInteger(bytes) || bytes > cap) throw new Error('Retained in-support assets exceed 256 MiB; publication refused');
await mkdir(retained, { recursive: true }); await mkdir(join(retained, 'assets'), { recursive: true });
for (const file of files) {
  const body = file.body ?? await readFile(file.source);
  if (body.length !== file.bytes || hash(body) !== file.sha256) throw new Error(`Corrupt retained asset: ${file.path}`);
  await writeFile(join(retained, file.path), body);
  if (file.source !== join(root, file.path)) await writeFile(join(root, file.path), body);
}
const metadata = JSON.stringify({ protocol: 1, days: 30, capBytes: cap, files: files.map(({ source, body, ...file }) => file) });
await writeFile(join(retained, 'retention.json'), metadata); await writeFile(join(root, 'retention.json'), metadata);
console.log(JSON.stringify({ retainedFiles: files.length, retainedBytes: bytes, days: 30, capBytes: cap }));
