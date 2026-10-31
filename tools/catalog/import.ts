import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { captureSources, FILES, parseSource, RAW, REVISION } from './source.ts';
import type { SourceRow } from './source.ts';
import { exactCover, independentlyValidSolution } from './oracle-exact-cover.ts';
import { canonicalGivens, groupId, puzzleId, sha256 } from './identity.ts';
import { countSolutions } from '../../src/lib/sudoku/index.ts';
import { levelsSync, recordLeafSync, shardLeafSync } from './merkle.ts';
import { POOLS } from '../../src/lib/catalog/types.ts';
import type { CatalogManifest, PoolId, RecordTuple, ShardDescriptor } from '../../src/lib/catalog/types.ts';
const bytes = (value: unknown) => Buffer.from(JSON.stringify(value) + '\n');
export async function importCatalog(output = 'public/catalog/v1') {
  const started = performance.now();
  const sourceLock = await captureSources();
  const rows = (await Promise.all(FILES.map(async f => parseSource(await readFile(`${RAW}/${f}`), f)))).flat();
  const byGivens = new Map<string, SourceRow>(), conflicts = new Set<string>();
  let exactDuplicates = 0;
  const sourceHistogram: Record<number, number> = {};
  for (const row of rows) {
    sourceHistogram[row.ratingTenths] = (sourceHistogram[row.ratingTenths] ?? 0) + 1;
    const existing = byGivens.get(row.givens);
    if (existing) {
      exactDuplicates++;
      if (existing.ratingTenths !== row.ratingTenths || existing.sourceId !== row.sourceId || existing.sourceFile !== row.sourceFile) conflicts.add(row.givens);
    } else byGivens.set(row.givens, row);
  }
  // Source short SHA1 is an upstream randomized ordering, independent of rating/cell traversal.
  const candidates = [...byGivens.values()].filter(r => !conflicts.has(r.givens)).sort((a, b) => a.sourceId.localeCompare(b.sourceId, 'en') || a.givens.localeCompare(b.givens, 'en'));
  const groups = new Set<string>();
  const pools = Object.fromEntries(POOLS.map(p => [p, [] as SourceRow[]])) as Record<PoolId, SourceRow[]>;
  let equivalentDuplicates = 0;
  for (let i = 0; i < candidates.length; i++) {
    const row = candidates[i], canonical = canonicalGivens(row.givens);
    if (groups.has(canonical)) { equivalentDuplicates++; continue; }
    groups.add(canonical); pools[row.pool].push(row);
    if (i % 100000 === 0) console.log(`dedup ${i}/${candidates.length}`);
  }
  const mediumLow = Math.floor(25000 * pools['medium-low'].length / (pools['medium-low'].length + pools['medium-high'].length));
  const hardLow = Math.floor(50000 * pools['hard-low'].length / (pools['hard-low'].length + pools['hard-high'].length));
  const quotas: Record<PoolId, number> = { easy: 25000, 'medium-low': mediumLow, 'medium-high': 25000 - mediumLow, 'hard-low': hardLow, 'hard-high': 50000 - hardLow };
  for (const p of POOLS) if (quotas[p] < 1000 || pools[p].length < quotas[p]) throw new Error(`Insufficient deduplicated supply ${p}`);
  console.log(JSON.stringify({ deduplicated: Object.fromEntries(POOLS.map(p => [p, pools[p].length])), quotas, exactDuplicates, equivalentDuplicates, conflicts: conflicts.size }));
  await mkdir(output, { recursive: true });
  const manifest: CatalogManifest = { schemaVersion: 1, catalogVersion: '1', certificationVersion: '1', selectionVersion: '1', sourceRevision: REVISION,
    sourceHashes: Object.fromEntries(FILES.map(f => [f, sourceLock.files[f].sha256])) as CatalogManifest['sourceHashes'],
    pools: Object.fromEntries(POOLS.map(p => [p, { count: quotas[p], shards: [] }])) as unknown as CatalogManifest['pools'] };
  const rejected: { sourceFile: string; line: number; reason: string }[] = [];
  const histogram: Record<number, number> = {}, clueHistogram: Record<number, number> = {};
  const solutions = new Set<string>();
  let maxShardBytes = 0, maxGzipBytes = 0, maxBrotliBytes = 0, totalBytes = 0, totalGzipBytes = 0;
  const toolsHashes = Object.fromEntries(await Promise.all(['import.ts', 'verify.ts', 'identity.ts', 'source.ts', 'oracle-exact-cover.ts', 'merkle.ts'].map(async f => [f, sha256(await readFile(new URL(f, import.meta.url)))])));
  const solverHash = sha256(Buffer.concat(await Promise.all(['solver.ts', 'rules.ts', 'topology.ts', 'types.ts'].map(f => readFile(new URL(`../../src/lib/sudoku/${f}`, import.meta.url))))));
  for (const pool of POOLS) {
    const accepted: RecordTuple[] = [];
    for (const row of pools[pool]) {
      if (accepted.length >= quotas[pool]) break;
      const a = countSolutions([...row.givens].map(Number), { nodeBudget: 10_000_000 });
      const b = exactCover(row.givens, { nodeBudget: 10_000_000 });
      if (a.kind !== 'complete' || a.count !== 1 || !a.solution || b.kind !== 'complete' || b.count !== 1 || !b.solution || a.solution.join('') !== b.solution || !independentlyValidSolution(row.givens, b.solution)) {
        rejected.push({ sourceFile: row.sourceFile, line: row.line, reason: JSON.stringify({ a, b }) }); continue;
      }
      accepted.push([puzzleId(row.givens), groupId(row.givens), row.sourceId, row.givens, b.solution, row.ratingTenths, FILES.indexOf(row.sourceFile)]);
      histogram[row.ratingTenths] = (histogram[row.ratingTenths] ?? 0) + 1;
      const clues = [...row.givens].filter(x => x !== '0').length; clueHistogram[clues] = (clueHistogram[clues] ?? 0) + 1;
      solutions.add(b.solution);
    }
    if (accepted.length !== quotas[pool]) throw new Error(`Certification supply exhausted ${pool}`);
    const shards = manifest.pools[pool].shards as ShardDescriptor[];
    for (let start = 0; start < accepted.length;) {
      let count = Math.min(256, accepted.length - start), serialized: Buffer, gzip: Buffer;
      do {
        serialized = bytes({ schemaVersion: 1, catalogVersion: '1', pool, start, records: accepted.slice(start, start + count) }); gzip = gzipSync(serialized, { level: 9 });
        if (serialized.length <= 96 * 1024 && gzip.length <= 32 * 1024) break;
        count -= 8;
      } while (count > 0);
      if (count <= 0) throw new Error('Cannot satisfy shard budget');
      const hash = sha256(serialized!), path = `${pool}-${start}-${hash.slice(0, 16)}.json`;
      await writeFile(`${output}/${path}`, serialized!);
      const recordRoot = levelsSync(accepted.slice(start, start + count).map((tuple, i) => recordLeafSync(tuple, pool, start + i)), 1).at(-1)![0];
      shards.push({ path, sha256: hash, bytes: serialized!.length, count, start, pool, recordRoot });
      maxShardBytes = Math.max(maxShardBytes, serialized!.length); maxGzipBytes = Math.max(maxGzipBytes, gzip!.length);
      maxBrotliBytes = Math.max(maxBrotliBytes, brotliCompressSync(serialized!).length);
      totalBytes += serialized!.length; totalGzipBytes += gzip!.length;
      start += count;
    }
    console.log(`certified ${pool}: ${accepted.length}, shards ${shards.length}`);
  }
  const manifestBytes = bytes(manifest);
  if (manifestBytes.length > 128 * 1024) throw new Error(`Manifest budget ${manifestBytes.length}`);
  await writeFile(`${output}/manifest.json`, manifestBytes);
  const shards = POOLS.flatMap(pool => [...manifest.pools[pool].shards]);
  const membershipRoot = levelsSync(shards.map(shardLeafSync), 3).at(-1)![0];
  const trustPath = 'src/lib/catalog/trust.v1.ts';
  const previousTrust = await readFile(trustPath, 'utf8');
  const registry = JSON.parse(previousTrust.slice(previousTrust.indexOf('=') + 1).trim().replace(/;$/, ''));
  const trustKey = ['1', '1', REVISION].join(':');
  if (registry[trustKey] && registry[trustKey].root !== membershipRoot) throw new Error('Changed frozen catalog membership; use a new catalog version');
  registry[trustKey] = { root: membershipRoot, shards: shards.length, catalogVersion: '1', certificationVersion: '1', sourceRevision: REVISION, pools: Object.fromEntries(POOLS.map(pool => [pool, manifest.pools[pool].count])) };
  await writeFile(trustPath, `/** Generated by the certified importer. Historical roots remain available for offline snapshots. */\nexport const CATALOG_TRUST: Readonly<Record<string, { readonly root: string; readonly shards: number; readonly catalogVersion: string; readonly certificationVersion: string; readonly sourceRevision: string; readonly pools: Readonly<Record<string, number>> }>> = ${JSON.stringify(registry)};\n`);
  const runtimeHashes = Object.fromEntries(await Promise.all(['attestation.ts', 'decode.ts', 'types.ts', 'trust.v1.ts'].map(async file => [file, sha256(await readFile(`src/lib/catalog/${file}`))])));
  await copyFile(`${RAW}/LICENSE.txt`, `${output}/LICENSE.txt`);
  const provenance = { schemaVersion: 1, source: sourceLock, selection: { version: '1', order: 'ascending upstream 12-hex SHA1; first deterministic D4/digit representative', quotas, equivalence: 'exact givens + digit relabeling and D4 only; not full Sudoku equivalence', sourceHistogram,
    deduplicatedPoolSupply: Object.fromEntries(POOLS.map(p => [p, pools[p].length])), exactDuplicates, conflictingExactGivens: conflicts.size, equivalentDuplicates },
    algorithms: { mrv: 'production cap2 bitmask MRV', exactCover: 'independent 729-assignment 324-constraint Algorithm X/DLX', toolVersions: '1', toolsHashes, runtimeHashes, solverHash, sourceLockSha256: sha256(bytes(sourceLock)), selectionSha256: '' },
    output: { count: 100000, histogram, clueHistogram, distinctSolutionGrids: solutions.size, membershipRoot, manifestSha256: sha256(manifestBytes), manifestBytes: manifestBytes.length, maxShardBytes, maxGzipBytes, maxBrotliBytes, totalBytes, totalGzipBytes, rejected: rejected.length },
    reproducibility: { encoding: 'UTF-8 without BOM; JSON.stringify insertion-order; trailing LF; no timestamps', sourceRatingLimits: 'Source generator/grader versions unspecified; ratings approximate technique policy, not universal human difficulty' } };
  provenance.algorithms.selectionSha256 = sha256(bytes(provenance.selection));
  await writeFile(`${output}/PROVENANCE.json`, bytes(provenance));
  if (output === 'public/catalog/v1') {
    await writeFile('data/catalog/selection.v1.json', bytes(provenance.selection));
    await writeFile('data/catalog/certificate.v1.json', bytes({ status: 'imported-pending-independent-emitted-recheck', ...provenance.algorithms, ...provenance.output }));
  }
  await mkdir('prototypes/gameplay-validation', { recursive: true });
  await writeFile('prototypes/gameplay-validation/import-report.json', bytes({ elapsedMs: performance.now() - started, rejected, ...provenance }));
  console.log(JSON.stringify({ elapsedMs: performance.now() - started, ...provenance.output }));
  return manifest;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await importCatalog(process.argv[2]);
