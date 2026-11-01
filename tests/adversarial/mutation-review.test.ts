import { describe, expect, it } from 'vitest';
// Deliberately separate from app code and its mutation scope.
// @ts-expect-error A plain JavaScript evidence tool has no application declaration module.
import { adjudicate, fingerprint, originalAt, sourceHash } from './mutation-review.mjs';

const source = 'export const value = 1;\n';
function fixture() {
  const location = { start: { line: 1, column: 22 }, end: { line: 1, column: 23 } };
  const mutant = { id: 'arbitrary-id', mutatorName: 'ArithmeticOperator', replacement: '2', location, status: 'Survived' };
  const input = {
    reports: [{ files: { 'src/example.ts': { source, mutants: [mutant, { ...mutant, id: 'killed-id', replacement: '3', status: 'Killed' }] } } }],
    currentSources: { 'src/example.ts': source }, expectedFiles: ['src/example.ts'],
    reviews: [{ file: 'src/example.ts', sourceSha256: sourceHash(source), mutatorName: mutant.mutatorName, location,
      original: '1', replacement: '2', observedStatus: 'Survived', decision: 'equivalent', reviewStatus: 'approved', author: 'Author',
      projectContract: 'Synthetic accounting fixture only, no app exemption.', proof: 'Fixture proof for accounting mechanics only.',
      contractProjection: 'Synthetic value is unused.', challengers: [{ name: 'Independent reviewer', agreement: 'Reviewed synthetic accounting case.' }] }],
  };
  return { ...input, inventories: { 'src/example.ts': { sourceSha256: sourceHash(source), fingerprints: input.reports[0].files['src/example.ts'].mutants.map(mutant => fingerprint('src/example.ts', source, mutant)) } }, replayEvidence: {} as Record<string, { sha256: string; data: unknown }> };
}
describe('fail-closed exact mutation evidence accounting', () => {
  it('preserves raw totals and requires independent exact source evidence', () => {
    const input = fixture(), unchanged = structuredClone(input), result = adjudicate(input);
    expect(result.accepted).toBe(true); expect(result.rawTotals).toEqual({ Survived: 1, Killed: 1 });
    expect(result.rawScore).toBe(50);
    expect(result.projected).toEqual({ meaningfulDetected: 1, equivalent: 1, unreachable: 0, invalidUnexecutable: 0, score: 100 });
    expect(input).toEqual(unchanged);
  });
  it('rejects stale source, changed replacement, location and missing proof', () => {
    const changes = [
      (value: ReturnType<typeof fixture>) => { value.currentSources['src/example.ts'] += ' '; },
      (value: ReturnType<typeof fixture>) => { value.reviews[0].replacement = '4'; },
      (value: ReturnType<typeof fixture>) => { value.reviews[0].location.end.column = 24; },
      (value: ReturnType<typeof fixture>) => { value.reviews = []; },
      (value: ReturnType<typeof fixture>) => { value.reviews[0].challengers[0].agreement = ''; },
      (value: ReturnType<typeof fixture>) => { value.reviews[0].challengers[0].name = 'Author'; },
    ];
    for (const change of changes) { const input = fixture(); change(input); expect(adjudicate(input).accepted).toBe(false); }
  });
  it('rejects duplicate signatures regardless of differing IDs and incomplete source scopes', () => {
    const duplicateProof = fixture(); duplicateProof.reviews.push(structuredClone(duplicateProof.reviews[0])); expect(adjudicate(duplicateProof).accepted).toBe(false);
    const duplicateRaw = fixture(); duplicateRaw.reports[0].files['src/example.ts'].mutants.push({ ...duplicateRaw.reports[0].files['src/example.ts'].mutants[0], id: 'different-id' }); expect(adjudicate(duplicateRaw).accepted).toBe(false);
    const missingScope = fixture(); missingScope.expectedFiles.push('src/missing.ts'); expect(adjudicate(missingScope).accepted).toBe(false);
    const duplicateFile = fixture(); duplicateFile.reports.push(structuredClone(duplicateFile.reports[0])); expect(adjudicate(duplicateFile).accepted).toBe(false);
  });
  it('rejects every unresolved survivor, no-coverage, ignored and error classification', () => {
    for (const status of ['Survived', 'NoCoverage', 'Ignored', 'RuntimeError', 'CompileError', 'Pending']) {
      const input = fixture(); input.reviews = []; input.reports[0].files['src/example.ts'].mutants[0].status = status;
      expect(adjudicate(input).accepted).toBe(false);
    }
  });
  it('accounts unloadable errors separately with explicit evidence, never as kills', () => {
    const input = fixture(); input.reports[0].files['src/example.ts'].mutants[0].status = 'RuntimeError';
    const data = { file: 'src/example.ts', sourceSha256: sourceHash(source), mutatorName: input.reviews[0].mutatorName, location: input.reviews[0].location,
      original: '1', replacement: '2', node: process.version, baseline: { status: 0 }, mutated: { status: 1 }, invalidUnexecutable: true, claimedKilled: false };
    const evidenceSha256 = sourceHash(JSON.stringify(data)); input.replayEvidence.replay = { sha256: evidenceSha256, data };
    Object.assign(input.reviews[0], { observedStatus: 'RuntimeError', decision: 'invalid-unloadable', evidence: 'replay', evidenceSha256 });
    const result = adjudicate(input); expect(result.accepted).toBe(true);
    expect(result.projected).toEqual({ meaningfulDetected: 1, equivalent: 0, unreachable: 0, invalidUnexecutable: 1, score: 100 });
    const staleHash = structuredClone(input); staleHash.replayEvidence.replay.sha256 = '0'.repeat(64); expect(adjudicate(staleHash).accepted).toBe(false);
    const changedFacts = structuredClone(input); (changedFacts.replayEvidence.replay.data as typeof data).claimedKilled = true; expect(adjudicate(changedFacts).accepted).toBe(false);
    const failedBaseline = structuredClone(input); (failedBaseline.replayEvidence.replay.data as typeof data).baseline.status = 1; expect(adjudicate(failedBaseline).accepted).toBe(false);
    delete (input.reviews[0] as Record<string, unknown>).evidence; expect(adjudicate(input).accepted).toBe(false);
  });
  it('rejects deleted, additional, empty and stale mutant plan inventories', () => {
    const missing = fixture(); missing.reports[0].files['src/example.ts'].mutants.pop(); expect(adjudicate(missing).accepted).toBe(false);
    const added = fixture(); added.reports[0].files['src/example.ts'].mutants.push({ ...added.reports[0].files['src/example.ts'].mutants[1], replacement: '9' }); expect(adjudicate(added).accepted).toBe(false);
    const empty = fixture(); empty.reports[0].files['src/example.ts'].mutants = []; expect(adjudicate(empty).accepted).toBe(false);
    const stale = fixture(); stale.inventories['src/example.ts'].sourceSha256 = '0'.repeat(64); expect(adjudicate(stale).accepted).toBe(false);
    const noInventory = fixture(); noInventory.inventories['src/example.ts'].fingerprints = []; expect(adjudicate(noInventory).accepted).toBe(false);
  });
  it('extracts literal locations across CRLF and rejects malformed or empty spans', () => {
    expect(originalAt('first\r\nsecond\r\n', { start: { line: 1, column: 3 }, end: { line: 2, column: 4 } })).toBe('rst\r\nsec');
    for (const location of [
      { start: { line: 0, column: 1 }, end: { line: 1, column: 2 } },
      { start: { line: 1, column: 1 }, end: { line: 1, column: 99 } },
      { start: { line: 1, column: 2 }, end: { line: 1, column: 2 } },
    ]) expect(() => originalAt(source, location)).toThrow();
  });
  it('requires actual nonempty proof text and canonical independent reviewer names', () => {
    for (const invalid of [{ proof: {} }, { proof: ' ' }, { projectContract: [] }, { contractProjection: '\t' },
      { author: 'Author ' }, { challengers: [{ name: 'Independent reviewer', agreement: {} }] },
      { author: 'Author ', challengers: [{ name: 'Author', agreement: 'Self-review hidden by padding.' }] }]) {
      const input = fixture(); Object.assign(input.reviews[0], invalid);
      expect(adjudicate(input).accepted).toBe(false);
    }
  });
});
