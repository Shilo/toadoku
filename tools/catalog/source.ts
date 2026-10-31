import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { sha256 } from './identity.ts';
import { ratingPool } from '../../src/lib/catalog/types.ts';
import type { PoolId, SourceFile } from '../../src/lib/catalog/types.ts';
export const REVISION = 'd8c8ebaee0c08c412cfba96af1923dfa61c83317';
export const FILES: readonly SourceFile[] = ['easy.txt', 'medium.txt', 'hard.txt'];
export const SOURCE_META = {
  'easy.txt': { bytes: 10000000, blob: '7f7795485929d2a14b48d92e400471ca0d69a5fb' },
  'medium.txt': { bytes: 35264300, blob: '09d12cd530454a30ebc04127e0061ddc3847524f' },
  'hard.txt': { bytes: 32159200, blob: 'fa8ee5ead4ab7be4e8c1b9af91d859384d5d4cfb' }
} as const;
export const RAW = fileURLToPath(new URL('../../prototypes/gameplay-validation/raw/', import.meta.url));
export interface SourceRow { sourceId: string; givens: string; ratingTenths: number; sourceFile: SourceFile; line: number; pool: PoolId }
export function parseSource(bytes: Uint8Array, sourceFile: SourceFile): SourceRow[] {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  if (!text.endsWith('\n') || text.includes('\r')) throw new Error(`${sourceFile}: noncanonical source lines`);
  return text.slice(0, -1).split('\n').map((line, index) => {
    // Upstream is fixed-width, with an optional leading space in nn.n rating.
    const match = /^([0-9a-f]{12}) ([0-9]{81}) ( ?[0-9]{1,2}\.[0-9])$/.exec(line);
    if (!match || line.length !== 99) throw new Error(`${sourceFile}:${index + 1}: malformed source`);
    const [whole, fraction] = match[3].trim().split('.');
    const ratingTenths = Number(whole) * 10 + Number(fraction);
    const pool = ratingPool(ratingTenths);
    if (!pool || !match[2].includes('0')) throw new Error(`${sourceFile}:${index + 1}: unsupported rating/full grid`);
    const expectedShortId = createHash('sha1').update(match[2]).digest('hex').slice(0, 12);
    if (match[1] !== expectedShortId) throw new Error(`${sourceFile}:${index + 1}: upstream ID mismatch`);
    return { sourceId: match[1], givens: match[2], ratingTenths, sourceFile, line: index + 1, pool };
  });
}
export async function captureSources() {
  await mkdir(RAW, { recursive: true });
  const hashes: Record<string, string> = {};
  for (const file of [...FILES, 'LICENSE.txt', 'README.md']) {
    const path = `${RAW}/${file}`;
    let bytes: Buffer;
    try { bytes = await readFile(path); } catch {
      const response = await fetch(`https://raw.githubusercontent.com/grantm/sudoku-exchange-puzzle-bank/${REVISION}/${file}`);
      if (!response.ok) throw new Error(`Source HTTP ${response.status}: ${file}`);
      bytes = Buffer.from(await response.arrayBuffer()); await writeFile(path, bytes);
    }
    if (file in SOURCE_META) {
      const expected = SOURCE_META[file as SourceFile];
      const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
      if (expected.bytes !== bytes.length || expected.blob !== blob) throw new Error(`Pinned Git blob mismatch ${file}`);
    }
    hashes[file] = sha256(bytes);
  }
  await mkdir('data/catalog', { recursive: true });
  const lock = { schemaVersion: 1, source: 'Sudoku Exchange puzzle bank', repository: 'https://github.com/grantm/sudoku-exchange-puzzle-bank', revision: REVISION,
    files: Object.fromEntries(FILES.map(f => [f, { ...SOURCE_META[f], sha256: hashes[f] }])),
    license: { path: 'LICENSE.txt', sha256: hashes['LICENSE.txt'], rights: 'Public domain dedication (Unlicense)' },
    readmeSha256: hashes['README.md'], ratingSystem: 'Sukaku Explainer', generator: 'QQWing', generatorVersion: 'not provided upstream', graderVersion: 'not provided upstream' };
  await writeFile('data/catalog/source-lock.json', JSON.stringify(lock) + '\n');
  return lock;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`))) {
  const lock = await captureSources();
  const rows = (await Promise.all(FILES.map(async f => parseSource(await readFile(`${RAW}/${f}`), f)))).flat();
  const ratings: Record<number, number> = {}, pools: Record<string, number> = {};
  for (const r of rows) { ratings[r.ratingTenths] = (ratings[r.ratingTenths] ?? 0) + 1; pools[r.pool] = (pools[r.pool] ?? 0) + 1; }
  console.log(JSON.stringify({ revision: lock.revision, parsed: rows.length, ratings, pools }));
}
