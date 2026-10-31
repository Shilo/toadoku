import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { exactCover, independentlyValidSolution } from './oracle-exact-cover.ts';
import { countSolutions } from '../../src/lib/sudoku/index.ts';
import { decodeManifest, decodeShard, verifyRecordIdentity } from '../../src/lib/catalog/decode.ts';
import { verifyAttestedRecord } from '../../src/lib/catalog/attestation.ts';
import { CATALOG_TRUST } from '../../src/lib/catalog/trust.v1.ts';
import { POOLS } from '../../src/lib/catalog/types.ts';
import type { AttestedRecord } from '../../src/lib/catalog/types.ts';
const sha = (input: string | Uint8Array) => createHash('sha256').update(input).digest('hex');
const serialize = (value: unknown) => Buffer.from(JSON.stringify(value) + '\n');
const sourceFiles = ['easy.txt', 'medium.txt', 'hard.txt'] as const;
const membershipContext = ['toadodu:membership:v1:duplicate-odd', '1', '1', 'd8c8ebaee0c08c412cfba96af1923dfa61c83317'];
const hashedLeaf = (prefix: number, value: unknown) => sha(Buffer.concat([Buffer.from([prefix]), Buffer.from(JSON.stringify(value))]));
function referenceTree(input: string[], prefix: number): string[][] {
  const tree = [input.slice()];
  while (tree.at(-1)!.length !== 1) {
    const row = tree.at(-1)!, parents: string[] = [];
    for (let left = 0; left < row.length; left += 2) parents.push(sha(Buffer.from(prefix.toString(16).padStart(2, '0') + row[left] + (row[left + 1] ?? row[left]), 'hex')));
    tree.push(parents);
  }
  return tree;
}
function referenceSiblings(tree: string[][], position: number): string[] {
  const proof: string[] = [];
  for (let depth = 0; depth < tree.length - 1; depth++) {
    const mate = position % 2 ? position - 1 : position + 1;
    proof.push(tree[depth][mate] ?? tree[depth][position]); position = Math.trunc(position / 2);
  }
  return proof;
}
/** Independent implementation of the documented D4+first-occurrence-label specification. */
export function referenceCanonical(givens: string): string {
  const maps = [(r: number, c: number) => [r, c], (r: number, c: number) => [8 - c, r],
    (r: number, c: number) => [8 - r, 8 - c], (r: number, c: number) => [c, 8 - r],
    (r: number, c: number) => [r, 8 - c], (r: number, c: number) => [c, r],
    (r: number, c: number) => [8 - r, c], (r: number, c: number) => [8 - c, 8 - r]];
  let minimum = '9'.repeat(81);
  for (const map of maps) {
    const replacements = new Uint8Array(10); let next = 1, candidate = '';
    for (let index = 0; index < 81; index++) {
      const [r, c] = map(Math.floor(index / 9), index % 9), digit = Number(givens[r * 9 + c]);
      if (digit && !replacements[digit]) replacements[digit] = next++;
      candidate += String(replacements[digit]);
    }
    if (candidate < minimum) minimum = candidate;
  }
  return minimum;
}
/** Parses fixed-width original bytes; does not call the importer's parser. */
export function independentSourceRows(bytes: Uint8Array, file: string) {
  if (bytes.length % 100 !== 0) throw new Error('source byte records');
  const rows = new Map<string, { givens: string; rating: number; line: number }>();
  for (let start = 0; start < bytes.length; start += 100) {
    if (bytes[start + 12] !== 32 || bytes[start + 94] !== 32 || bytes[start + 99] !== 10) throw new Error(`source separators ${file}:${start}`);
    const id = Buffer.from(bytes.subarray(start, start + 12)).toString('ascii');
    const givens = Buffer.from(bytes.subarray(start + 13, start + 94)).toString('ascii');
    const decimal = Buffer.from(bytes.subarray(start + 95, start + 99)).toString('ascii');
    if (!/^[0-9a-f]{12}$/.test(id) || !/^[0-9]{81}$/.test(givens) || !/^( [1-4]|[1-4][0-9])\.[0-9]$/.test(decimal)) throw new Error(`source shape ${file}:${start}`);
    if (createHash('sha1').update(givens).digest('hex').substring(0, 12) !== id) throw new Error('source SHA1');
    const rating = Number(decimal.substring(0, 2)) * 10 + Number(decimal[3]);
    if (rows.has(id)) throw new Error('source ID collision');
    rows.set(id, { givens, rating, line: start / 100 + 1 });
  }
  return rows;
}
export async function verifyCatalog(output = 'public/catalog/v1', compareOutput?: string) {
  const started = performance.now(), memoryBefore = process.memoryUsage();
  const lockBytes = await readFile('data/catalog/source-lock.json'), lock = JSON.parse(lockBytes.toString('utf8'));
  const source = new Map<string, ReturnType<typeof independentSourceRows>>();
  for (const file of sourceFiles) {
    const bytes = await readFile(`prototypes/gameplay-validation/raw/${file}`);
    const expected = lock.files[file];
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (bytes.length !== expected.bytes || blob !== expected.blob || sha(bytes) !== expected.sha256) throw new Error(`source hash ${file}`);
    source.set(file, independentSourceRows(bytes, file));
  }
  const manifestBytes = await readFile(`${output}/manifest.json`);
  if (manifestBytes.length > 128 * 1024) throw new Error('manifest budget');
  const manifest = decodeManifest(JSON.parse(manifestBytes.toString('utf8')));
  const provenanceBytes = await readFile(`${output}/PROVENANCE.json`), provenance = JSON.parse(provenanceBytes.toString('utf8'));
  if (sha(manifestBytes) !== provenance.output.manifestSha256 || manifest.sourceRevision !== lock.revision || provenance.source.revision !== lock.revision) throw new Error('manifest provenance');
  for (const file of sourceFiles) if (manifest.sourceHashes[file] !== lock.files[file].sha256) throw new Error('manifest source hash');
  for (const [file, hash] of Object.entries(provenance.algorithms.toolsHashes)) if (sha(await readFile(new URL(file, import.meta.url))) !== hash) throw new Error(`changed certification tool ${file}`);
  for (const [file, hash] of Object.entries(provenance.algorithms.runtimeHashes)) if (sha(await readFile(new URL(`../../src/lib/catalog/${file}`, import.meta.url))) !== hash) throw new Error(`changed runtime membership ${file}`);
  const solverHash = sha(Buffer.concat(await Promise.all(['solver.ts', 'rules.ts', 'topology.ts', 'types.ts'].map(f => readFile(new URL(`../../src/lib/sudoku/${f}`, import.meta.url))))));
  if (solverHash !== provenance.algorithms.solverHash) throw new Error('changed production oracle');
  if (sha(lockBytes) !== provenance.algorithms.sourceLockSha256 || sha(serialize(provenance.selection)) !== provenance.algorithms.selectionSha256) throw new Error('changed certification inputs');
  const ids = new Set<string>(), groups = new Set<string>(), solutions = new Set<string>();
  const counts: Record<string, number> = {}, ratings: Record<number, number> = {};
  const files: Record<string, string> = { 'manifest.json': sha(manifestBytes), 'PROVENANCE.json': sha(provenanceBytes) };
  const shards = POOLS.flatMap(pool => [...manifest.pools[pool].shards]);
  const topTree = referenceTree(shards.map(s => hashedLeaf(2, [...membershipContext, s.pool, s.start, s.count, s.recordRoot])), 3);
  const trusted = CATALOG_TRUST[['1', '1', manifest.sourceRevision].join(':')];
  if (!trusted || trusted.root !== topTree.at(-1)![0] || trusted.shards !== shards.length || trusted.root !== provenance.output.membershipRoot) throw new Error('compiled membership root');
  let total = 0, maxShardBytes = 0, maxGzipBytes = 0;
  for (const [pool, data] of Object.entries(manifest.pools)) {
    for (const descriptor of data.shards) {
      const bytes = await readFile(`${output}/${descriptor.path}`);
      if (bytes.length !== descriptor.bytes || bytes.length > 96 * 1024 || sha(bytes) !== descriptor.sha256) throw new Error(`shard hash ${descriptor.path}`);
      const gzip = gzipSync(bytes, { level: 9 }).length;
      if (gzip > 32 * 1024) throw new Error('gzip budget');
      maxShardBytes = Math.max(maxShardBytes, bytes.length); maxGzipBytes = Math.max(maxGzipBytes, gzip);
      files[descriptor.path] = sha(bytes);
      const records = decodeShard(JSON.parse(bytes.toString('utf8')), descriptor);
      const recordTree = referenceTree(records.map((record, i) => hashedLeaf(0, [...membershipContext, pool, descriptor.start + i, record.id, record.groupId, record.sourceId, record.givens, record.solution, record.ratingTenths, sourceFiles.indexOf(record.sourceFile)])), 1);
      if (recordTree.at(-1)![0] !== descriptor.recordRoot) throw new Error('independent record root');
      const shardIndex = shards.findIndex(s => s.pool === pool && s.start === descriptor.start);
      for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
        const record = records[recordIndex];
        const original = source.get(record.sourceFile)?.get(record.sourceId);
        if (!original || original.givens !== record.givens || original.rating !== record.ratingTenths) throw new Error(`source association ${record.id}`);
        const expectedId = sha('toadodu:classic9:givens:v1\n' + record.givens);
        const expectedGroup = sha('toadodu:classic9:d4-label:v1\n' + referenceCanonical(record.givens));
        if (record.id !== expectedId || record.groupId !== expectedGroup || !await verifyRecordIdentity(record)) throw new Error(`identity ${record.id}`);
        if (ids.has(record.id) || groups.has(record.groupId)) throw new Error('emitted duplicate');
        ids.add(record.id); groups.add(record.groupId); solutions.add(record.solution);
        const a = countSolutions(Array.from(record.givens, Number), { nodeBudget: 10_000_000 }), b = exactCover(record.givens, { nodeBudget: 10_000_000 });
        if (a.kind !== 'complete' || a.count !== 1 || a.solution?.join('') !== record.solution || b.kind !== 'complete' || b.count !== 1 || b.solution !== record.solution || !independentlyValidSolution(record.givens, record.solution)) throw new Error(`emitted oracle disagreement ${record.id}`);
        const attested: AttestedRecord = { ...record, catalogVersion: '1', certificationVersion: '1', sourceRevision: manifest.sourceRevision, pool: descriptor.pool,
          attestation: { version: 1, shardStart: descriptor.start, recordCount: descriptor.count, recordIndex, recordSiblings: referenceSiblings(recordTree, recordIndex), shardIndex, shardCount: shards.length, shardSiblings: referenceSiblings(topTree, shardIndex) } };
        if (!await verifyAttestedRecord(attested)) throw new Error(`runtime offline membership ${record.id}`);
        ratings[record.ratingTenths] = (ratings[record.ratingTenths] ?? 0) + 1; counts[pool] = (counts[pool] ?? 0) + 1; total++;
      }
    }
    if (counts[pool] !== data.count) throw new Error('emitted pool count');
    console.log(`verified emitted ${pool}: ${counts[pool]}`);
  }
  const license = await readFile(`${output}/LICENSE.txt`);
  if (sha(license) !== lock.license.sha256) throw new Error('license altered');
  files['LICENSE.txt'] = sha(license);
  if (total !== 100000 || JSON.stringify(ratings) !== JSON.stringify(provenance.output.histogram) || solutions.size !== provenance.output.distinctSolutionGrids) throw new Error('summary mismatch');
  if (compareOutput) for (const [file, hash] of Object.entries(files)) if (sha(await readFile(`${compareOutput}/${file}`)) !== hash) throw new Error(`non-reproducible ${file}`);
  const certificate = { schemaVersion: 1, catalogVersion: '1', certificationVersion: '1', status: 'all-emitted-records-dual-oracle-source-join-verified', sourceRevision: lock.revision,
    sourceLockSha256: sha(lockBytes), selectionSha256: sha(serialize(provenance.selection)), algorithms: provenance.algorithms,
    count: total, pools: counts, ratingHistogram: ratings, distinctSolutionGrids: solutions.size, duplicateScope: provenance.selection.equivalence, membershipRoot: trusted.root, offlineMembershipProofsVerified: total,
    manifestSha256: sha(manifestBytes), provenanceSha256: sha(provenanceBytes), manifestBytes: manifestBytes.length, maxShardBytes, maxGzipBytes,
    contentInventorySha256: sha(serialize(files)), failures: 0, commands: ['node tools/catalog/source.ts', 'node tools/catalog/import.ts', 'node tools/catalog/verify.ts'], deterministicRebuildCompared: Boolean(compareOutput) };
  await writeFile('data/catalog/certificate.v1.json', serialize(certificate));
  await mkdir('prototypes/gameplay-validation', { recursive: true });
  await writeFile('prototypes/gameplay-validation/verify-report.json', serialize({ ...certificate, elapsedMs: performance.now() - started, memoryBefore, memoryAfter: process.memoryUsage(), files }));
  console.log(JSON.stringify({ count: total, counts, manifestSha256: certificate.manifestSha256, maxShardBytes, maxGzipBytes, elapsedMs: performance.now() - started }));
  return certificate;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await verifyCatalog(process.argv[2], process.argv[3]);
