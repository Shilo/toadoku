import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { permutation } from '../../src/lib/catalog/select.ts';

const manifestBytes = await readFile('public/catalog/v1/manifest.json');
const manifest = JSON.parse(manifestBytes.toString('utf8'));
const seeds = [1,7,12345,4294967295,305419896], records = [];
// One serial measurement job. Read/compress one bounded shard at a time.
for (const perPool of [1,3,10,25,50]) {
  const samples = [];
  for (const seed of seeds) {
    let logicalBytes = 0, localGzipBytes = 0, shards = 0;
    for (const pool of Object.values(manifest.pools)) {
      const paths = new Set(Array.from(permutation(pool.count,seed).slice(0,perPool), ordinal =>
        pool.shards.find(shard => ordinal >= shard.start && ordinal < shard.start + shard.count).path));
      for (const path of paths) {
        const bytes = await readFile('public/catalog/v1/' + path);
        logicalBytes += bytes.length; localGzipBytes += gzipSync(bytes).length; shards++;
      }
    }
    samples.push({ seed, shards, logicalBytes, localGzipBytes });
  }
  records.push({ perPool, samples });
}
const report = {
  manifestSha256: createHash('sha256').update(manifestBytes).digest('hex'),
  manifestBytes: manifestBytes.length, node: process.version,
  conditions: 'Initial cursor 0, no active exclusions, one seed applied to all pools. Encoded file estimates only; not host wire, disk or heap measurements.',
  records,
};
const path = resolve('prototypes/pwa-validation/reserve-costs.json');
await mkdir(dirname(path),{recursive:true}); await writeFile(path,JSON.stringify(report,null,2));
console.log(JSON.stringify({path,records}));

