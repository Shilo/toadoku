import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { fingerprint, originalAt, sourceHash } from './mutation-review.mjs';

// The historical filename retains 328, but selection always uses the reviewed exact fingerprint.
const [argument, ...extra] = process.argv.slice(2);
const reportPath = argument ?? 'prototypes/gameplay-validation/mutation/rules-v2-initial.json';
if (extra.length || !reportPath.startsWith('prototypes/gameplay-validation/') || reportPath.includes('\\') || reportPath.split('/').some(part => !part || part === '.' || part === '..')) throw Error('Expected one canonical ignored raw report path');
const raw = readFileSync(reportPath, 'utf8'), report = JSON.parse(raw);
const file = 'src/lib/sudoku/topology.ts';
const reviews = JSON.parse(readFileSync('tests/adversarial/mutation-equivalents.v1.json', 'utf8')).reviews
  .filter(review => review.file === file && review.decision === 'invalid-unloadable' && review.reviewStatus === 'approved');
if (reviews.length !== 1) throw Error('Expected exactly one approved topology replay fingerprint');
const review = reviews[0];
const data = report.files[file];
const key = JSON.stringify([file, review.sourceSha256, review.mutatorName, review.location.start.line, review.location.start.column,
  review.location.end.line, review.location.end.column, review.original, review.replacement]);
if (!data || data.source !== readFileSync(file, 'utf8') || sourceHash(data.source) !== review.sourceSha256) throw Error('Static replay source no longer matches');
const matches = data.mutants.filter(item => fingerprint(file, data.source, item) === key);
if (matches.length !== 1 || !['RuntimeError', 'CompileError'].includes(matches[0].status)) throw Error('Static replay fingerprint no longer matches one raw error');
const mutant = matches[0], original = originalAt(data.source, mutant.location);
const lines = data.source.match(/[^\n]*\n|[^\n]+$/g);
const start = lines.slice(0, mutant.location.start.line - 1).reduce((n, text) => n + text.length, 0) + mutant.location.start.column - 1;
const changed = data.source.slice(0, start) + mutant.replacement + data.source.slice(start + original.length);
const paths = {
  baseline: 'prototypes/gameplay-validation/topology-baseline.mjs',
  mutant: 'prototypes/gameplay-validation/topology-mutant328.mjs',
};
mkdirSync(resolve('prototypes/gameplay-validation/mutation'), { recursive: true });
writeFileSync(paths.baseline, stripTypeScriptTypes(data.source));
writeFileSync(paths.mutant, stripTypeScriptTypes(changed));
const execute = path => {
  const result = spawnSync(process.execPath, [resolve(path)], { windowsHide: true, timeout: 10000, encoding: 'utf8' });
  return { status: result.status, signal: result.signal, error: result.error?.message, stdout: result.stdout, stderr: result.stderr };
};
const baseline = execute(paths.baseline), mutated = execute(paths.mutant);
const evidence = { node: process.version, platform: process.platform, file, sourceSha256: sourceHash(data.source),
  rawReport: reportPath, rawReportSha256: sourceHash(raw),
  id: mutant.id, mutatorName: mutant.mutatorName, location: mutant.location, original, replacement: mutant.replacement,
  transform: 'Native Node stripTypeScriptTypes only, identical baseline and mutant transformation.', baseline, mutated,
  invalidUnexecutable: baseline.status === 0 && mutated.status === 1 && mutated.stderr.includes('TypeError') && mutated.stderr.includes('flatMap'),
  claimedKilled: false };
writeFileSync('prototypes/gameplay-validation/mutation/topology328-native-replay.runtime.json', JSON.stringify(evidence, null, 2) + '\n');
const canonical = { node: evidence.node, file, sourceSha256: evidence.sourceSha256, mutatorName: mutant.mutatorName,
  location: review.location, original, replacement: mutant.replacement, baseline: { status: baseline.status },
  mutated: { status: mutated.status, errorName: 'TypeError', failingMember: 'flatMap' },
  invalidUnexecutable: evidence.invalidUnexecutable, claimedKilled: false };
writeFileSync('prototypes/gameplay-validation/mutation/topology328-native-replay.json', JSON.stringify(canonical, null, 2) + '\n');
console.log(JSON.stringify({ invalidUnexecutable: evidence.invalidUnexecutable, claimedKilled: false, baselineStatus: baseline.status, mutantStatus: mutated.status }));
if (!evidence.invalidUnexecutable) process.exitCode = 1;
