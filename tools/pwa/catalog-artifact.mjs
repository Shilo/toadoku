import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
/** Reuse the unchanged finite-corpus certificate only for its exact bound inputs and published bytes. */
export async function validateCatalog(root, reader = readFile) {
  const certificate = JSON.parse(await reader('data/catalog/certificate.v1.json'));
  if (certificate.status !== 'all-emitted-records-dual-oracle-source-join-verified' || certificate.count !== 100000 || certificate.failures !== 0) throw new Error('Catalog certification unavailable');
  const algorithms = certificate.algorithms;
  for (const [file, expected] of Object.entries(algorithms.toolsHashes)) if (sha(await reader(join('tools/catalog', file))) !== expected) throw new Error(`Changed certified tool: ${file}`);
  for (const [file, expected] of Object.entries(algorithms.runtimeHashes)) if (sha(await reader(join('src/lib/catalog', file))) !== expected) throw new Error(`Changed certified runtime: ${file}`);
  const solver = Buffer.concat(await Promise.all(['solver.ts', 'rules.ts', 'topology.ts', 'types.ts'].map(file => reader(join('src/lib/sudoku', file)))));
  if (sha(solver) !== algorithms.solverHash) throw new Error('Changed certified solver input');
  const lockBytes = await reader('data/catalog/source-lock.json'), lock = JSON.parse(lockBytes);
  if (sha(lockBytes) !== certificate.sourceLockSha256 || sha(await reader('data/catalog/selection.v1.json')) !== certificate.selectionSha256) throw new Error('Changed catalog certification inputs');
  const directory = join(root, 'catalog/v1');
  const manifestBytes = await reader(join(directory, 'manifest.json')), provenanceBytes = await reader(join(directory, 'PROVENANCE.json'));
  if (manifestBytes.length !== certificate.manifestBytes || sha(manifestBytes) !== certificate.manifestSha256 || sha(provenanceBytes) !== certificate.provenanceSha256) throw new Error('Published catalog metadata differs from certificate');
  const manifest = JSON.parse(manifestBytes), files = { 'manifest.json': sha(manifestBytes), 'PROVENANCE.json': sha(provenanceBytes) };
  let count = 0, bytes = 0, shards = 0;
  for (const [pool, data] of Object.entries(manifest.pools)) {
    let poolCount = 0;
    for (const descriptor of data.shards) {
      if (!/^[\w-]+\.json$/.test(descriptor.path) || Object.hasOwn(files, descriptor.path)) throw new Error('Invalid published catalog path');
      const body = await reader(join(directory, descriptor.path));
      if (body.length !== descriptor.bytes || body.length > 96 * 1024 || sha(body) !== descriptor.sha256) throw new Error(`Published catalog shard differs: ${descriptor.path}`);
      files[descriptor.path] = sha(body); poolCount += descriptor.count; bytes += body.length; shards++;
    }
    if (poolCount !== data.count || poolCount !== certificate.pools[pool]) throw new Error('Published catalog count mismatch');
    count += poolCount;
  }
  const license = await reader(join(directory, 'LICENSE.txt'));
  if (sha(license) !== lock.license.sha256) throw new Error('Published catalog license differs');
  files['LICENSE.txt'] = sha(license);
  const actual = await readdir(directory);
  if (actual.length !== Object.keys(files).length || actual.some(path => !Object.hasOwn(files, path)) || count !== 100000 || shards !== 488 || sha(JSON.stringify(files) + '\n') !== certificate.contentInventorySha256) throw new Error('Published catalog inventory differs from certified output');
  return { puzzles: count, shards, shardBytes: bytes, manifestSha256: sha(manifestBytes), certificationReused: true };
}
