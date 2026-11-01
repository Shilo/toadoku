import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, stripVTControlCharacters } from 'node:util';
import { adjudicate, fingerprint, inventoryFromPlan, reviewName, reviewText, sourceHash } from './mutation-review.mjs';

export const CONFIG_SOURCES = ['tests/adversarial/stryker.config.mjs', 'tests/adversarial/vitest.mutation.config.ts', 'package.json', 'package-lock.json'];
export const PACKAGES = ['@stryker-mutator/core', '@stryker-mutator/instrumenter', '@stryker-mutator/vitest-runner', 'vitest', 'typescript'];
const PATH_LEAVES = [['tempDirName'], ['incrementalFile'], ['eventReporter', 'baseDir'], ['jsonReporter', 'fileName'], ['htmlReporter', 'fileName']];
const requireThat = (condition, reason) => { if (!condition) throw Error(reason); };
const normalized = path => path.replaceAll('\\', '/');
const sameSet = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === new Set(left).size && left.length === right.length && left.every(value => right.includes(value));
function sourcePath(path) {
  return typeof path === 'string' && path.startsWith('src/lib/') && !/[!{}*?\[\]():\\]/.test(path) && path.split('/').every(part => part && part !== '.' && part !== '..');
}
function artifactPath(path) {
  requireThat(typeof path === 'string' && path.startsWith('prototypes/gameplay-validation/') && !path.includes('\\') && path.split('/').every(part => part && part !== '.' && part !== '..'), 'Noncanonical artifact path');
  return path;
}
function writeArtifact(path, value) {
  artifactPath(path); mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
}

/** Pinned Stryker debug output is JSON, possibly surrounded by terminal colors. Never evaluate it. */
export function loadedConfig(log) {
  requireThat(typeof log === 'string', 'Missing run log');
  const text = stripVTControlCharacters(log), marker = 'DEBUG ConfigReader Loaded config: ';
  const start = text.indexOf(marker);
  requireThat(start >= 0 && text.indexOf(marker, start + marker.length) < 0, 'Missing or ambiguous loaded config');
  const begin = start + marker.length;
  requireThat(text[begin] === '{', 'Loaded config is not a JSON object');
  let quoted = false, escaped = false, depth = 0;
  for (let index = begin; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(text.slice(begin, index + 1));
  }
  throw Error('Truncated loaded config');
}

/** Only output-path leaves and a stronger forced rerun may differ from the reviewed policy. */
export function normalizedConfig(config, files) {
  requireThat(sameSet(config?.mutate, files) && files.every(sourcePath), 'Run scope is not the exact full-file ownership list');
  requireThat(typeof config.force === 'boolean', 'Missing forced-rerun setting');
  const result = structuredClone(config);
  result.mutate = ['<owned-full-files>']; result.force = false;
  for (const path of PATH_LEAVES) {
    let parent = result;
    for (const key of path.slice(0, -1)) { requireThat(parent && typeof parent === 'object', 'Missing path option'); parent = parent[key]; }
    artifactPath(parent?.[path.at(-1)]); parent[path.at(-1)] = '<artifact-path>';
  }
  return result;
}

/** Select explicit authoritative file owners, never silently take the last cached report. */
export function combineJobs({ jobs, expectedFiles, currentSources, currentTests, currentConfigs, currentPackages, node, policy }) {
  requireThat(policy?.version === 1 && isDeepStrictEqual(policy.packages, currentPackages) && policy.node === node && isDeepStrictEqual(policy.configs, currentConfigs), 'Stale package, runtime or configuration policy');
  requireThat(Array.isArray(jobs) && jobs.length && sameSet(expectedFiles, [...new Set(expectedFiles)]) && expectedFiles.every(sourcePath), 'Invalid expected source inventory');
  const files = {}, inventories = {}, provenance = [], owners = new Set(), names = new Set();
  for (const job of jobs) {
    requireThat(typeof job.name === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(job.name) && !names.has(job.name), 'Duplicate or invalid job name'); names.add(job.name);
    requireThat(Array.isArray(job.files) && job.files.length && sameSet(job.files, [...new Set(job.files)]) && job.files.every(file => sourcePath(file) && expectedFiles.includes(file)), 'Invalid job source scope');
    const config = loadedConfig(job.log);
    requireThat(isDeepStrictEqual(config, job.report?.config), 'Raw report and loaded configuration disagree');
    requireThat(isDeepStrictEqual(normalizedConfig(config, job.files), policy.config), 'Run policy differs from reviewed full configuration');
    requireThat(job.report.framework?.name === 'StrykerJS' && job.report.framework.version === policy.packages['@stryker-mutator/core'] && job.report.framework.dependencies?.typescript === policy.packages.typescript, 'Mutation framework version differs');
    const capture = job.inventory;
    requireThat(capture?.version === 1 && sameSet(capture.files, job.files) && isDeepStrictEqual(capture.packages, policy.packages) && capture.node === node && isDeepStrictEqual(capture.configs, currentConfigs), 'Missing or stale job-start inventory');
    requireThat(sameSet(Object.keys(capture.sources ?? {}), job.files), 'Job-start source scope differs');
    const currentTestHashes = Object.fromEntries(Object.entries(currentTests).map(([path, source]) => [path, sourceHash(source)]));
    requireThat(isDeepStrictEqual(capture.tests, currentTestHashes), 'Current test inventory differs from job-start capture');
    const reportedSources = Object.fromEntries(Object.entries(job.report.files ?? {}).map(([file, data]) => [normalized(file), data.source]));
    const planned = inventoryFromPlan(job.plan, reportedSources);
    requireThat(job.report.testFiles && Object.keys(job.report.testFiles).length > 0, 'Missing reported test source provenance');
    const testIds = new Set();
    for (const [test, data] of Object.entries(job.report.testFiles)) {
      requireThat(typeof data.source === 'string' && typeof currentTests[test] === 'string' && sourceHash(data.source) === sourceHash(currentTests[test]) && capture.tests?.[test] === sourceHash(data.source), `Stale reported test source: ${test}`);
      requireThat(Array.isArray(data.tests), 'Malformed reported test inventory');
      for (const item of data.tests) {
        requireThat(typeof item.id === 'string' && !testIds.has(item.id), 'Missing or duplicate global test id'); testIds.add(item.id);
      }
    }
    for (const file of job.files) {
      requireThat(!owners.has(file), `Duplicate authoritative source owner: ${file}`); owners.add(file);
      const data = job.report.files[file], current = currentSources[file];
      requireThat(typeof data?.source === 'string' && typeof current === 'string' && sourceHash(data.source) === sourceHash(current) && capture.sources?.[file] === sourceHash(current), `Stale or missing source: ${file}`);
      requireThat(planned[file]?.fingerprints?.length && Array.isArray(data.mutants) && data.mutants.length, `Missing complete plan source: ${file}`);
      for (const mutant of data.mutants) for (const field of ['coveredBy', 'killedBy']) if (mutant[field] !== undefined) {
        requireThat(Array.isArray(mutant[field]) && mutant[field].every(id => typeof id === 'string' && testIds.has(id)), 'Unresolved reported test reference');
      }
      files[file] = data; inventories[file] = planned[file];
    }
    provenance.push({ name: job.name, files: job.files, forced: config.force, hashes: job.hashes,
      cachedSourcesNotSelected: Object.keys(job.report.files).filter(file => !job.files.includes(file)) });
  }
  requireThat(sameSet([...owners], expectedFiles), 'Authoritative jobs do not cover the complete critical source scope');
  return { report: { files }, inventories, provenance };
}

/** Every timeout needs a reviewed causal termination/resource proof, independent of raw scoring. */
export function auditTimeouts(report, audits) {
  requireThat(Array.isArray(audits), 'Missing mandatory timeout audits');
  const pending = new Map(), seen = new Set();
  for (const [file, data] of Object.entries(report.files)) for (const mutant of data.mutants) if (mutant.status === 'Timeout') pending.set(fingerprint(file, data.source, mutant), { file, mutant });
  for (const audit of audits) {
    const key = JSON.stringify([audit.file, audit.sourceSha256, audit.mutatorName, audit.location?.start?.line, audit.location?.start?.column,
      audit.location?.end?.line, audit.location?.end?.column, audit.original, audit.replacement]);
    requireThat(pending.has(key) && !seen.has(key), 'Stale, unmatched or duplicate timeout audit'); seen.add(key);
    requireThat(audit.observedStatus === 'Timeout' && audit.reviewStatus === 'approved' && ['nontermination', 'resource-bound'].includes(audit.decision)
      && reviewName(audit.author) && [audit.proof, audit.projectContract, audit.testPremise, audit.progressInvariant].every(reviewText)
      && Array.isArray(audit.challengers) && audit.challengers.length > 0 && audit.challengers.every(person => person && reviewName(person.name) && person.name !== audit.author && reviewText(person.agreement))
      && new Set(audit.challengers.map(person => person.name)).size === audit.challengers.length, 'Incomplete independent timeout proof');
  }
  requireThat(seen.size === pending.size, 'Unreviewed raw timeout');
  return { reviewed: seen.size, rawTimeouts: pending.size };
}

export function adjudicateJobs({ combined, expectedFiles, currentSources, reviews, replayEvidence = {}, timeoutAudits }) {
  const result = adjudicate({ reports: [combined.report], currentSources, expectedFiles, reviews, replayEvidence, inventories: combined.inventories });
  let timeoutAudit, auditFailure;
  try { timeoutAudit = auditTimeouts(combined.report, timeoutAudits); }
  catch (error) { auditFailure = error.message; }
  const accepted = result.accepted && !auditFailure;
  return { ...result, accepted, finalAcceptance: accepted, fingerprintAccountingAccepted: result.accepted,
    projected: { ...result.projected, score: accepted ? 100 : null },
    failures: [...result.failures, ...(auditFailure ? [auditFailure] : [])], timeoutAudit };
}

function versions() { return Object.fromEntries(PACKAGES.map(name => [name, JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8')).version])); }
function configHashes() { return Object.fromEntries(CONFIG_SOURCES.map(path => [path, sourceHash(readFileSync(path))])); }
function tests() { return Object.fromEntries([...globSync('tests/**/*.test.ts')].map(normalized).sort().map(path => [path, readFileSync(path, 'utf8')])); }
export async function captureInventory(files, output) {
  const { default: config } = await import('./stryker.config.mjs');
  const expected = [...globSync(config.mutate)].map(normalized);
  requireThat(files.length && sameSet(files, [...new Set(files)]) && files.every(file => expected.includes(file) && sourcePath(file)), 'Capture requires exact critical source paths');
  const result = { version: 1, capturedAt: new Date().toISOString(), node: process.version, files,
    sources: Object.fromEntries(files.map(path => [path, sourceHash(readFileSync(path))])),
    tests: Object.fromEntries(Object.entries(tests()).map(([path, source]) => [path, sourceHash(source)])), configs: configHashes(), packages: versions() };
  writeArtifact(output, result);
  return { captured: output, sources: files.length, tests: Object.keys(result.tests).length };
}

async function review(reviewPath, jobsPath, timeoutPath) {
  const { default: config } = await import('./stryker.config.mjs');
  const expectedFiles = [...globSync(config.mutate)].map(normalized).sort();
  const document = JSON.parse(readFileSync(jobsPath, 'utf8'));
  requireThat(document.version === 1 && Array.isArray(document.jobs), 'Invalid jobs manifest');
  const jobs = document.jobs.map(entry => {
    const texts = Object.fromEntries(['report', 'plan', 'log', 'inventory'].map(key => [key, readFileSync(artifactPath(entry[key]), 'utf8')]));
    return { name: entry.name, files: entry.files, report: JSON.parse(texts.report), plan: JSON.parse(texts.plan), log: texts.log,
      inventory: JSON.parse(texts.inventory), hashes: Object.fromEntries(Object.entries(texts).map(([key, value]) => [key, sourceHash(value)])) };
  });
  const combined = combineJobs({ jobs, expectedFiles, currentSources: Object.fromEntries(expectedFiles.map(file => [file, readFileSync(file, 'utf8')])),
    currentTests: tests(), currentConfigs: configHashes(), currentPackages: versions(), node: process.version,
    policy: JSON.parse(readFileSync('tests/adversarial/mutation-policy.v1.json', 'utf8')) });
  const reviews = JSON.parse(readFileSync(reviewPath, 'utf8')).reviews;
  const replayEvidence = Object.fromEntries(reviews.filter(item => item.evidence).map(item => {
    const value = readFileSync(artifactPath(item.evidence), 'utf8'); return [item.evidence, { sha256: sourceHash(value), data: JSON.parse(value) }];
  }));
  const timeout = JSON.parse(readFileSync(timeoutPath, 'utf8'));
  requireThat(timeout.version === 1, 'Invalid timeout audit document');
  const result = adjudicateJobs({ combined, currentSources: Object.fromEntries(expectedFiles.map(file => [file, readFileSync(file, 'utf8')])),
    expectedFiles, reviews, replayEvidence, timeoutAudits: timeout.audits });
  return { ...result, jobs: combined.provenance,
    manifestSha256: sourceHash(readFileSync(jobsPath)), reviewSha256: sourceHash(readFileSync(reviewPath)), timeoutAuditSha256: sourceHash(readFileSync(timeoutPath)) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);
  let result;
  try {
    if (command === 'capture') result = await captureInventory(args.slice(1), args[0]);
    else {
      requireThat(command === 'review' && args.length === 3, 'Usage: mutation-jobs.mjs capture output.json file... | review reviews.json jobs.json timeout-audits.json');
      result = await review(...args);
    }
  } catch (error) { result = { accepted: false, finalAcceptance: false, failures: [error.message] }; }
  if (command === 'review') writeArtifact('prototypes/gameplay-validation/mutation/final-adjudication.json', result);
  console.log(JSON.stringify(result));
  if (result.accepted === false) process.exitCode = 1;
}
