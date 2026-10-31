import { readFileSync, writeFileSync } from 'node:fs';
import { findDeduction } from '../../src/lib/hints/detect.ts';
import { validateWitness } from '../../src/lib/hints/witness.ts';
import { exactCover } from '../../tools/catalog/oracle-exact-cover.ts';
const manifest = JSON.parse(readFileSync('public/catalog/v1/manifest.json', 'utf8'));
let inspected = 0;
for (const descriptor of manifest.pools['hard-high'].shards) {
  const shard = JSON.parse(readFileSync(`public/catalog/v1/${descriptor.path}`, 'utf8'));
  for (const record of shard.records) {
    inspected++;
    const values = [...record[3]].map(Number), steps = [];
    let deduction = findDeduction(values, 0);
    while (deduction?.placements.length) {
      if (!validateWitness(values, deduction)) throw new Error('Invalid single witness');
      const before = exactCover(values.join(''));
      if (before.kind !== 'complete' || before.count !== 1) throw new Error('Invalid original state');
      for (const { cell, digit } of deduction.placements) {
        if (record[3][cell] !== '0' || record[4][cell] !== String(digit)) throw new Error('Placement disagrees with original definition');
        values[cell] = digit;
      }
      steps.push(deduction);
      deduction = findDeduction(values, 0);
    }
    if (deduction || !values.includes(0)) continue;
    writeFileSync('tests/fixtures/techniques/fallback.v1.json', JSON.stringify({
      schemaVersion: 1, source: 'Sudoku Exchange puzzle bank; public-domain data dedication retained in public/catalog/v1/LICENSE.txt',
      sourceRevision: manifest.sourceRevision, id: record[0], sourceId: record[2], givens: record[3], values: values.join(''), steps, solution: record[4], ratingTenths: record[5], sourceFile: ['easy.txt', 'medium.txt', 'hard.txt'][record[6]],
    }, null, 2) + '\n');
    process.stdout.write(`Fallback fixture found after ${inspected} records: ${record[0]}\n`);
    process.exit(0);
  }
}
throw new Error('No unsupported logical fallback found');
