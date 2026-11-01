import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const [base, root = 'dist', evidence = 'prototypes/pwa-validation/hosting.json'] = process.argv.slice(2);
if (!base || !base.startsWith('https://')) throw new Error('Provide authorized HTTPS deployment base');
const release = JSON.parse(await readFile(join(root, 'release.json'), 'utf8'));
const current = [...release.files, ...await Promise.all(['worker.js', 'release.json'].map(async path => { const body = await readFile(join(root, path)); return { path, bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') }; }))];
let retention; try { retention = JSON.parse(await readFile(join(root, 'retention.json'), 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const previousScripts = (retention?.files ?? []).filter(file => file.path.endsWith('.js') && !release.files.some(current => current.path === file.path)).sort((a,b) => a.lastCurrent - b.lastCurrent);
const samples = [...new Map([...previousScripts.slice(0,2), ...previousScripts.slice(-2)].map(file => [file.path, file])).values()];
current.push(...samples);
let last;
for (let attempt = 0; attempt < 6; attempt++) {
  try {
    const responses = [];
    for (const file of current) {
      const response = await fetch(new URL(file.path, base), { redirect: 'error', headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20_000) });
      const body = Buffer.from(await response.arrayBuffer());
      if (!response.ok || body.length !== file.bytes || createHash('sha256').update(body).digest('hex') !== file.sha256) throw new Error(`Hosting bytes not current: ${file.path}`);
      responses.push({ path: file.path, bytes: body.length, headers: Object.fromEntries(['cache-control', 'etag', 'age', 'content-type', 'content-encoding'].map(key => [key, response.headers.get(key)])) });
    }
    await mkdir(evidence.substring(0, evidence.lastIndexOf('/')) || '.', { recursive: true });
    await writeFile(evidence, JSON.stringify({ at: new Date().toISOString(), base, buildId: release.buildId, retainedScripts: previousScripts.length, sampledRetainedScripts: samples.map(file => file.path), responses }, null, 2));
    console.log(`Verified hosted release ${release.buildId}`); process.exit(0);
  } catch (error) { last = error; if (attempt < 5) await new Promise(resolve => setTimeout(resolve, 10_000)); }
}
throw last;
