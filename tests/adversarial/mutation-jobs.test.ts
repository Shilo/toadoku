import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
// @ts-expect-error Local evidence tooling is JavaScript, not an application declaration module.
import { adjudicateJobs, captureInventory, combineJobs, loadedConfig, normalizedConfig } from './mutation-jobs.mjs';
// @ts-expect-error Independent accounting helpers have no application declaration module.
import { sourceHash } from './mutation-review.mjs';

/** Synthetic accounting fixtures only. No game mutant or production policy is waived here. */
function fixture() {
  const file = 'src/lib/example.ts' as const, source = 'export const value = 1;\n', test = 'tests/example.test.ts' as const, testSource = 'original test source';
  const packages = { '@stryker-mutator/core': '10.1.1', typescript: '6.0.3' }, configs: Record<string, string> = { 'configuration fixture': 'same bytes' }, node = 'v25.0.0';
  const config = { mutate: [file], force: true, concurrency: 2, ignoreStatic: false, mutator: { plugins: null, excludedMutations: [] },
    tempDirName: 'prototypes/gameplay-validation/tmp', incrementalFile: 'prototypes/gameplay-validation/incremental.json',
    eventReporter: { baseDir: 'prototypes/gameplay-validation/events' }, jsonReporter: { fileName: 'prototypes/gameplay-validation/raw.json' },
    htmlReporter: { fileName: 'prototypes/gameplay-validation/raw.html' }, thresholds: { high: 100, low: 100, break: 100 } };
  const mutant = { id: '0', mutatorName: 'ArithmeticOperator', replacement: '2', status: 'Killed',
    coveredBy: ['0'], killedBy: ['0'],
    location: { start: { line: 1, column: 22 }, end: { line: 1, column: 23 } } };
  const report = { files: { [file]: { source, mutants: [mutant] } }, config, framework: { name: 'StrykerJS', version: '10.1.1', dependencies: { typescript: '6.0.3' } },
    testFiles: { [test]: { source: testSource, tests: [{ id: '0' }] } } };
  const log = `timestamp DEBUG ConfigReader Loaded config: ${JSON.stringify(config, null, 2)}\nrest of log`;
  const ownedFiles: string[] = [file], expectedFiles: string[] = [file];
  const executionInputs = { [file]: source, [test]: testSource, 'tests/helper.ts': 'independent helper source' } as Record<string, string>;
  const job = { name: 'example', files: ownedFiles, report, plan: { mutantPlans: [{ plan: 'Run', mutant: { ...mutant, relativeFileName: file,
    location: { start: { line: 0, column: 21 }, end: { line: 0, column: 22 } } } }] }, log,
    inventory: { version: 2, node, packages: structuredClone(packages), configs: structuredClone(configs), files: [file], sources: { [file]: sourceHash(source) }, tests: { [test]: sourceHash(testSource) },
      inputs: Object.fromEntries(Object.entries(executionInputs).map(([path, value]) => [path, sourceHash(value)])) }, hashes: {} };
  const options = { jobs: [job], expectedFiles, currentSources: { [file]: source }, currentTests: { [test]: testSource } as Record<string, string>, currentConfigs: configs,
    currentInputs: executionInputs, currentPackages: packages, node, policy: { version: 1, packages: structuredClone(packages), configs: structuredClone(configs), node, config: normalizedConfig(config, [file]) } };
  return { file, source, test, testSource, config, mutant, job, options };
}

describe('complete mutation-job evidence union', () => {
  it('extracts one colored JSON config without evaluating braces inside escaped strings', () => {
    const config = { nested: { value: 'a brace } and escaped quote " and slash \\' } };
    const log = `\u001b[36mtimestamp DEBUG ConfigReader Loaded config: \u001b[0m${JSON.stringify(config, null, 2)}\nnext line`;
    expect(loadedConfig(log)).toEqual(config);
    for (const value of ['', 'DEBUG ConfigReader Loaded config: {', log + log, 'DEBUG ConfigReader Loaded config: []']) expect(() => loadedConfig(value)).toThrow();
  });

  it('accounts one complete source and preserves both raw and final results', () => {
    const h = fixture(), combined = combineJobs(h.options);
    expect(Object.keys(combined.report.files)).toEqual([h.file]);
    expect(adjudicateJobs({ combined, expectedFiles: h.options.expectedFiles, currentSources: h.options.currentSources, reviews: [], timeoutAudits: [] }))
      .toMatchObject({ accepted: true, finalAcceptance: true, rawTotals: { Killed: 1 }, rawScore: 100 });
    expect(combined.provenance[0].forced).toBe(true);
    h.job.report.config.force = false; h.job.log = `DEBUG ConfigReader Loaded config: ${JSON.stringify(h.job.report.config)}`;
    expect(() => combineJobs(h.options)).toThrow('force every mutant');
  });

  it('rejects missing, duplicate, unexpected and noncanonical authoritative scopes', () => {
    for (const mutate of [
      (h: ReturnType<typeof fixture>) => { h.options.expectedFiles.push('src/lib/missing.ts'); },
      (h: ReturnType<typeof fixture>) => { h.options.jobs.push(structuredClone({ ...h.job, name: 'duplicate-owner' })); },
      (h: ReturnType<typeof fixture>) => { h.job.files = ['src/lib/other.ts']; },
      (h: ReturnType<typeof fixture>) => { h.job.files = ['src/lib/../example.ts']; },
      (h: ReturnType<typeof fixture>) => { h.job.files = [h.file, h.file]; },
    ]) { const h = fixture(); mutate(h); expect(() => combineJobs(h.options)).toThrow(); }
  });

  it('pins every effective cut, plugin, gate and full-file path instead of trusting a partial plan', () => {
    const changes = [
      (value: any) => { value.ignoreStatic = true; },
      (value: any) => { value.mutator.excludedMutations = ['StringLiteral']; },
      (value: any) => { value.mutator.plugins = ['custom-mutator']; },
      (value: any) => { value.thresholds.break = 90; },
      (value: any) => { value.mutate = ['src/lib/example.ts:1:0-1:24']; },
      (value: any) => { value.mutate = ['src/lib/*.ts']; },
      (value: any) => { value.tempDirName = '../elsewhere'; },
    ];
    for (const change of changes) {
      const h = fixture(); change(h.config); h.job.log = `DEBUG ConfigReader Loaded config: ${JSON.stringify(h.config)}`;
      expect(() => combineJobs(h.options)).toThrow();
    }
    const h = fixture(); h.job.report.config.ignoreStatic = true;
    expect(() => combineJobs(h.options)).toThrow();
  });

  it('rejects stale source, test, start capture, framework, package and policy evidence', () => {
    const changes = [
      (h: ReturnType<typeof fixture>) => { h.options.currentSources[h.file] += 'changed'; },
      (h: ReturnType<typeof fixture>) => { h.options.currentTests[h.test] += 'changed'; },
      (h: ReturnType<typeof fixture>) => { h.job.inventory.tests[h.test] = 'stale'; },
      (h: ReturnType<typeof fixture>) => { h.job.inventory.sources[h.file] = 'stale'; },
      (h: ReturnType<typeof fixture>) => { h.job.report.framework.version = 'other'; },
      (h: ReturnType<typeof fixture>) => { h.options.currentPackages.typescript = 'other'; },
      (h: ReturnType<typeof fixture>) => { h.job.inventory.configs = {}; },
    ];
    for (const change of changes) { const h = fixture(); change(h); expect(() => combineJobs(h.options)).toThrow(); }
  });

  it('fails final acceptance for a raw mutant omitted from or added to its independent plan', () => {
    for (const direction of ['missing', 'extra']) {
      const h = fixture();
      if (direction === 'missing') h.job.report.files[h.file].mutants = [];
      else h.job.report.files[h.file].mutants.push({ ...h.mutant, id: 'extra', replacement: '3' });
      if (direction === 'missing') expect(() => combineJobs(h.options)).toThrow();
      else expect(adjudicateJobs({ combined: combineJobs(h.options), expectedFiles: h.options.expectedFiles, currentSources: h.options.currentSources, reviews: [], timeoutAudits: [] }).finalAcceptance).toBe(false);
    }
  });

  it('rejects added or removed current tests and deletion of a referenced reported test source', () => {
    for (const attack of ['new-current', 'removed-current', 'dropped-reported', 'duplicate-id', 'numeric-reference']) {
      const h = fixture();
      if (attack === 'new-current') h.options.currentTests['tests/added.test.ts'] = 'new';
      else if (attack === 'removed-current') delete h.options.currentTests[h.test];
      else if (attack === 'numeric-reference') Object.assign(h.mutant, { coveredBy: [0] });
      else {
        const test = 'tests/second.test.ts', source = 'second source';
        Object.assign(h.job.report.testFiles, { [test]: { source, tests: [{ id: attack === 'duplicate-id' ? '0' : '1' }] } });
        h.options.currentTests[test] = source; Object.assign(h.job.inventory.tests, { [test]: sourceHash(source) });
        if (attack === 'dropped-reported') delete (h.job.report.testFiles as Partial<typeof h.job.report.testFiles>)[h.test];
      }
      expect(() => combineJobs(h.options)).toThrow();
    }
  });

  it('requires one independent causal audit for every timeout even in a single full job', () => {
    const h = fixture(); h.mutant.status = 'Timeout';
    const combined = combineJobs(h.options);
    const args = { combined, expectedFiles: h.options.expectedFiles, currentSources: h.options.currentSources, reviews: [] };
    expect(adjudicateJobs({ ...args, timeoutAudits: [] })).toMatchObject({ accepted: false, finalAcceptance: false, rawTotals: { Timeout: 1 }, rawScore: 100 });
    const audit = { file: h.file, sourceSha256: sourceHash(h.source), mutatorName: h.mutant.mutatorName, location: h.mutant.location, original: '1', replacement: '2',
      observedStatus: 'Timeout', reviewStatus: 'approved', decision: 'nontermination', author: 'Author', proof: 'Synthetic audit mechanics only.',
      projectContract: 'Synthetic fixture only.', testPremise: 'Synthetic premise.', progressInvariant: 'Synthetic progress relation.',
      challengers: [{ name: 'Independent reviewer', agreement: 'Reviewed synthetic accounting fixture only.' }] };
    expect(adjudicateJobs({ ...args, timeoutAudits: [audit] }).finalAcceptance).toBe(true);
    for (const audits of [[audit, audit], [{ ...audit, replacement: '3' }], [{ ...audit, sourceSha256: '0'.repeat(64) }], [{ ...audit, progressInvariant: '' }], [{ ...audit, reviewStatus: 'proposed' }]])
      expect(adjudicateJobs({ ...args, timeoutAudits: audits }).finalAcceptance).toBe(false);
    for (const invalid of [{ proof: {} }, { proof: ' ' }, { author: 'Author ' }, { challengers: [{ name: 'Independent reviewer', agreement: {} }] },
      { author: 'Author ', challengers: [{ name: 'Author', agreement: 'Self-review hidden by padding.' }] }])
      expect(adjudicateJobs({ ...args, timeoutAudits: [{ ...audit, ...invalid }] }).finalAcceptance).toBe(false);
  });

  it('rejects helper and execution-data changes even when every test entry is unchanged', () => {
    for (const mutation of ['changed', 'added', 'removed', 'data', 'missing-capture', 'old-version']) {
      const h = fixture();
      if (mutation === 'changed') h.options.currentInputs['tests/helper.ts'] += 'changed';
      else if (mutation === 'added') h.options.currentInputs['tests/new-helper.ts'] = 'new helper';
      else if (mutation === 'removed') delete h.options.currentInputs['tests/helper.ts'];
      else if (mutation === 'data') h.options.currentInputs['public/catalog/v1/fixture.json'] = 'new data';
      else if (mutation === 'old-version') h.job.inventory.version = 1;
      else delete (h.job.inventory as Partial<typeof h.job.inventory>).inputs;
      expect(h.options.currentTests[h.test]).toBe(h.testSource);
      expect(() => combineJobs(h.options)).toThrow();
    }
  });

  it('creates a fresh ignored nested directory before capturing actual source provenance', async () => {
    const output = `prototypes/gameplay-validation/capture-smoke-${randomUUID()}/nested/inventory.json`;
    await captureInventory(['src/lib/sudoku/rules.ts'], output);
    const inventory = JSON.parse(readFileSync(output, 'utf8'));
    expect(inventory).toMatchObject({ version: 2, files: ['src/lib/sudoku/rules.ts'] });
    expect(inventory.sources['src/lib/sudoku/rules.ts']).toBe(sourceHash(readFileSync('src/lib/sudoku/rules.ts')));
    for (const path of ['tests/session/fixtures.ts', 'tests/fixtures/techniques/original.v1.json', 'tools/catalog/oracle-exact-cover.ts', 'public/catalog/v1/manifest.json'])
      expect(inventory.inputs[path]).toBe(sourceHash(readFileSync(path)));
    for (const path of ['tests/adversarial/mutation-equivalents.v1.json', 'tests/adversarial/mutation-timeouts.v1.json']) expect(inventory.inputs[path]).toBeUndefined();
  });
});
