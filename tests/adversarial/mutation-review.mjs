import { createHash } from 'node:crypto';
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const sourceHash = source => createHash('sha256').update(source).digest('hex');
export const reviewText = value => typeof value === 'string' && value.trim().length > 0;
export const reviewName = value => reviewText(value) && value === value.trim();
const normalized = path => path.replaceAll('\\', '/');

export function originalAt(source, location) {
  const lines = source.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  const offset = point => {
    if (!Number.isSafeInteger(point?.line) || !Number.isSafeInteger(point.column) || point.line < 1 || point.column < 1 || point.line > lines.length) throw Error('Invalid mutant location');
    const line = lines[point.line - 1].replace(/\r?\n$/, '');
    if (point.column > line.length + 1) throw Error('Invalid mutant column');
    return lines.slice(0, point.line - 1).reduce((total, text) => total + text.length, 0) + point.column - 1;
  };
  const start = offset(location?.start), end = offset(location?.end);
  if (end <= start) throw Error('Empty or reversed mutant location');
  return source.slice(start, end);
}

export function fingerprint(file, source, mutant) {
  if (typeof mutant?.mutatorName !== 'string' || typeof mutant.replacement !== 'string') throw Error('Missing mutant operator or replacement');
  return JSON.stringify([normalized(file), sourceHash(source), mutant.mutatorName,
    mutant.location.start.line, mutant.location.start.column, mutant.location.end.line, mutant.location.end.column,
    originalAt(source, mutant.location), mutant.replacement]);
}

export function inventoryFromPlan(plan, sources, root = process.cwd()) {
  const inventory = {};
  // Stryker 10.1.1 events use zero-based coordinates; its report schema uses one-based coordinates.
  const schemaPosition = position => {
    const coordinate = value => {
      if (!Number.isSafeInteger(value) || value < 0 || !Number.isSafeInteger(value + 1)) throw Error('Invalid zero-based plan coordinate');
      return value + 1;
    };
    return { line: coordinate(position?.line), column: coordinate(position?.column) };
  };
  for (const entry of plan.mutantPlans) {
    const mutant = entry.mutant;
    const file = normalized(mutant.relativeFileName ?? relative(root, mutant.fileName));
    if (typeof sources[file] !== 'string') throw Error(`Plan source missing from report: ${file}`);
    const target = inventory[file] ??= { sourceSha256: sourceHash(sources[file]), fingerprints: [] };
    const location = { start: schemaPosition(mutant.location?.start), end: schemaPosition(mutant.location?.end) };
    target.fingerprints.push(fingerprint(file, sources[file], { ...mutant, location }));
  }
  return inventory;
}

/** Raw reports are never rewritten. Every exception requires a reviewed exact fingerprint. */
export function adjudicate({ reports, currentSources, expectedFiles, reviews, inventories, replayEvidence = {} }) {
  const failures = [], rawTotals = {}, decisions = [];
  const expected = new Set(expectedFiles.map(normalized));
  if (expected.size !== expectedFiles.length || expected.size === 0) failures.push('Expected scope is empty or duplicated');
  const proofs = new Map(), occurrences = new Map(), filesSeen = new Set(), mutantsSeen = new Set();
  for (const review of reviews) {
    const key = JSON.stringify([normalized(review.file), review.sourceSha256, review.mutatorName,
      review.location?.start?.line, review.location?.start?.column, review.location?.end?.line, review.location?.end?.column,
      review.original, review.replacement]);
    if (proofs.has(key)) failures.push(`Duplicate review fingerprint: ${review.file}`);
    proofs.set(key, review);
    if (!expected.has(normalized(review.file))) failures.push(`Review outside expected scope: ${review.file}`);
    if (!['equivalent', 'invalid-unloadable', 'unreachable'].includes(review.decision)) failures.push(`Unknown review decision: ${review.file}`);
    if (review.reviewStatus !== 'approved' || !/^[a-f0-9]{64}$/.test(review.sourceSha256 ?? '') || !reviewName(review.author) || !reviewText(review.projectContract) || !reviewText(review.proof) || !reviewText(review.contractProjection) ||
      !Array.isArray(review.challengers) || review.challengers.length < 1 || review.challengers.some(item => !item || !reviewName(item.name) || item.name === review.author || !reviewText(item.agreement)) ||
      new Set(review.challengers.map(item => item.name)).size !== review.challengers.length) failures.push(`Incomplete independent proof: ${review.file}`);
    if (review.decision === 'invalid-unloadable' && !review.evidence) failures.push(`Missing native import evidence: ${review.file}`);
    if (review.decision === 'invalid-unloadable') {
      const evidence = replayEvidence[review.evidence], facts = evidence?.data;
      if (!evidence || evidence.sha256 !== review.evidenceSha256 || !/^[a-f0-9]{64}$/.test(review.evidenceSha256 ?? '') ||
        facts?.sourceSha256 !== review.sourceSha256 || normalized(facts?.file ?? '') !== normalized(review.file) ||
        facts?.mutatorName !== review.mutatorName || JSON.stringify(facts?.location) !== JSON.stringify(review.location) ||
        facts?.original !== review.original || facts?.replacement !== review.replacement || facts?.node !== process.version ||
        facts?.baseline?.status !== 0 || facts?.mutated?.status !== 1 || facts?.invalidUnexecutable !== true || facts?.claimedKilled !== false) failures.push(`Invalid or stale native replay evidence: ${review.file}`);
    }
  }
  for (const report of reports) for (const [rawFile, data] of Object.entries(report.files)) {
    const file = normalized(rawFile);
    if (!expected.has(file)) failures.push(`Unexpected report source: ${file}`);
    if (filesSeen.has(file)) failures.push(`Source appears in multiple reports: ${file}`);
    filesSeen.add(file);
    if (typeof data.source !== 'string' || !Array.isArray(data.mutants)) throw Error(`Invalid report source: ${file}`);
    const current = currentSources[file];
    if (typeof current !== 'string' || sourceHash(data.source) !== sourceHash(current)) failures.push(`Stale or missing current source: ${file}`);
    const inventory = inventories?.[file];
    const expectedMutants = new Set(inventory?.fingerprints ?? []), observedMutants = new Set();
    if (!inventory || inventory.sourceSha256 !== sourceHash(data.source) || !expectedMutants.size || expectedMutants.size !== inventory.fingerprints.length || !data.mutants.length) failures.push(`Missing, empty or stale plan inventory: ${file}`);
    for (const mutant of data.mutants) {
      const key = fingerprint(file, data.source, mutant);
      observedMutants.add(key);
      if (!expectedMutants.has(key)) failures.push(`Raw mutant absent from independent plan: ${file}:${mutant.id}`);
      if (mutantsSeen.has(key)) failures.push(`Duplicate raw mutant fingerprint: ${file}:${mutant.id}`);
      mutantsSeen.add(key); rawTotals[mutant.status] = (rawTotals[mutant.status] ?? 0) + 1;
      const review = proofs.get(key);
      if (review) {
        occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
        if (review.observedStatus !== mutant.status) failures.push(`Reviewed status changed: ${file}:${mutant.id}`);
        if (review.decision === 'invalid-unloadable' && !['RuntimeError', 'CompileError'].includes(mutant.status)) failures.push(`Invalid-mutant classification lacks raw error: ${file}:${mutant.id}`);
        if (review.decision !== 'invalid-unloadable' && !['Survived', 'NoCoverage'].includes(mutant.status)) failures.push(`Equivalence review has unexpected status: ${file}:${mutant.id}`);
        decisions.push({ file, id: mutant.id, status: mutant.status, decision: review.decision, fingerprint: key, review });
      } else if (!['Killed', 'Timeout'].includes(mutant.status)) {
        failures.push(`Unresolved ${mutant.status}: ${file}:${mutant.id}`);
      }
    }
    for (const key of expectedMutants) if (!observedMutants.has(key)) failures.push(`Planned mutant missing from raw report: ${file}`);
  }
  for (const file of expected) if (!filesSeen.has(file)) failures.push(`Missing source scope: ${file}`);
  for (const [key, review] of proofs) if (occurrences.get(key) !== 1) failures.push(`Review must match exactly one raw mutant: ${review.file}`);
  const killed = rawTotals.Killed ?? 0, timedOut = rawTotals.Timeout ?? 0;
  const equivalent = decisions.filter(item => item.decision === 'equivalent').length;
  const unreachable = decisions.filter(item => item.decision === 'unreachable').length;
  const invalidUnexecutable = decisions.filter(item => item.decision === 'invalid-unloadable').length;
  const meaningfulDetected = killed + timedOut;
  const accepted = failures.length === 0 && meaningfulDetected > 0;
  const rawDenominator = meaningfulDetected + (rawTotals.Survived ?? 0) + (rawTotals.NoCoverage ?? 0);
  return { accepted, rawTotals, rawScore: rawDenominator ? 100 * meaningfulDetected / rawDenominator : null, projected: { meaningfulDetected, equivalent, unreachable, invalidUnexecutable,
    score: accepted ? 100 : null }, failures, decisions };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [reviewPath, reportPath, planPath, ...extra] = process.argv.slice(2);
  if (!reviewPath || !reportPath || !planPath || extra.length) throw Error('Usage: node mutation-review.mjs reviews.json cumulative-raw-report.json matching-plan-event.json');
  const { default: config } = await import('./stryker.config.mjs');
  const expectedFiles = [...globSync(config.mutate)].map(normalized).sort();
  const report = JSON.parse(readFileSync(reportPath, 'utf8')), reviews = JSON.parse(readFileSync(reviewPath, 'utf8')).reviews;
  const sources = Object.fromEntries(Object.entries(report.files).map(([file, data]) => [normalized(file), data.source]));
  const replayEvidence = Object.fromEntries(reviews.filter(review => review.evidence).map(review => {
    try { const text = readFileSync(review.evidence, 'utf8'); return [review.evidence, { sha256: sourceHash(text), data: JSON.parse(text) }]; }
    catch { return [review.evidence, undefined]; }
  }));
  const result = adjudicate({ reports: [report],
    currentSources: Object.fromEntries(expectedFiles.map(path => [path, readFileSync(path, 'utf8')])), expectedFiles,
    reviews, replayEvidence, inventories: inventoryFromPlan(JSON.parse(readFileSync(planPath, 'utf8')), sources) });
  // This kernel diagnostic deliberately cannot replace the audited final jobs wrapper.
  result.finalAcceptance = false; result.acceptanceScope = 'fingerprint-inventory-diagnostic';
  result.reportSha256 = sourceHash(readFileSync(reportPath)); result.planSha256 = sourceHash(readFileSync(planPath));
  writeFileSync('prototypes/gameplay-validation/mutation/adjudication.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ accepted: result.accepted, rawTotals: result.rawTotals, rawScore: result.rawScore, projected: result.projected, failures: result.failures }));
  if (!result.accepted) process.exitCode = 1;
}
