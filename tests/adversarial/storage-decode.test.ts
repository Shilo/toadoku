import { describe, expect, it } from 'vitest';
import {
  decodeAttempt, decodeDefinition, decodeDisclosure, decodeFrontier, decodeIntent, decodePolicy, decodePool,
  decodePreferences, decodeProfile, decodeReceipt, decodeRole, identifier, increment, integer, mergeSnapshot, object,
} from '../../src/lib/storage/decode.ts';
import { parseBoundedJson } from '../../src/lib/storage/json.ts';
import { attempt, definition, pools, preferences, profile, receipt, solution } from '../storage/fixtures.ts';
import type { Attempt, Disclosure } from '../../src/lib/gameplay/contracts.ts';

function rejects<T>(decode: (value: unknown) => unknown, good: T, edits: ((value: T) => void)[]): void {
  for (const edit of edits) { const value = structuredClone(good); edit(value); expect(() => decode(value)).toThrow(); }
}

describe('independent persistent schema boundary attacks', () => {
  it('rejects object prototypes, invalid primitives and unknown preference/profile policy fields', () => {
    for (const value of [null, [], 1, 'object', new Date(), Object.create({ inherited: 1 })]) expect(() => object(value)).toThrow();
    expect(object(Object.create(null))).toEqual({});
    for (const value of ['', 'a b', '__bad?', 1, 'x'.repeat(257)]) expect(() => identifier(value)).toThrow();
    for (const value of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) expect(() => integer(value)).toThrow();
    expect(() => increment(Number.MAX_SAFE_INTEGER)).toThrow();
    expect(() => decodePreferences({ ...preferences, schemaVersion: 0 })).toThrow();
    expect(() => decodePreferences({ ...preferences, schemaVersion: 2 })).toThrow();
    rejects(decodePreferences, preferences, [value => { value.language = 'fr' as never; }, value => { value.motion = 'fast' as never; }, value => { value.boardShape = 'circle' as never; }, value => { value.theme = ''; }]);
    expect(() => decodePreferences({ ...preferences, arbitrary: true })).toThrow();
    expect(decodePreferences({ ...preferences, theme: 'future-theme', appearance: 'future-appearance' })).toMatchObject({ theme: 'future-theme', appearance: 'future-appearance' });
    expect(() => decodeProfile({ ...profile, wallet: 1 })).toThrow();
    expect(() => decodeFrontier({ ...profile.frontier, scheduleVersion: 2 })).toThrow();
    for (const value of [{}, { ...attempt().policy, rewardVersion: 1 }, { ...attempt().policy, scheduleVersion: 2 }, { ...attempt().policy, band: 'expert' }]) expect(() => decodePolicy(value)).toThrow();
    for (const [band, base, targetMs] of [['easy', 100, 600000], ['medium', 200, 1200000], ['hard', 400, 2400000]] as const) expect(decodePolicy({ rewardVersion: 2, scheduleVersion: 1, band, base, targetMs })).toMatchObject({ base, targetMs });
  });
  it('checks definition fields, proof dimensions, clue rules and every supported rating pool', () => {
    rejects(decodeDefinition, definition, [
      value => { Object.assign(value, { id: 'bad' }); }, value => { Object.assign(value, { groupId: 'bad' }); }, value => { value.sourceRevision = 'bad'; },
      value => { Object.assign(value, { sourceFile: 'archive.txt' }); }, value => { value.pool = 'hard-low'; },
      value => { value.attestation.version = 2 as never; }, value => { value.attestation.recordCount = 257; },
      value => { value.attestation.recordIndex = 1; }, value => { value.attestation.shardCount = 0; },
      value => { value.attestation.recordCount = 2; },
      value => { value.attestation.recordCount = 2; value.attestation.recordSiblings = ['bad']; },
      value => { Object.assign(value, { givens: solution }); }, value => { Object.assign(value, { givens: '0'.repeat(80) }); },
      value => { Object.assign(value, { solution: '1'.repeat(81) }); },
      value => { Object.assign(value, { givens: '11' + solution.slice(2) }); },
    ]);
    for (const [pool, ratingTenths] of [['easy', 10], ['medium-low', 15], ['medium-high', 20], ['hard-low', 25], ['hard-high', 35]] as const) expect(decodeDefinition({ ...definition, pool, ratingTenths }).pool).toBe(pool);
    expect(() => decodePool({ ...pools()[0], selectionVersion: '2' })).toThrow();
    expect(() => decodePool({ ...pools()[0], pool: 'other' })).toThrow();
    expect(() => decodePool({ ...pools()[0], lastId: 'bad' })).toThrow();
    expect(() => decodePool({ ...pools()[0], lastId: 'a'.repeat(64) })).toThrow();
    expect(decodePool({ ...pools()[0], lastId: 'a'.repeat(64), lastOrdinal: 0 }).lastId).toBe('a'.repeat(64));
    expect(() => decodeRole({ generation: 'gen', role: 'other', revision: 0, lastIntentSeq: 0 })).toThrow();
    expect(decodeRole({ generation: 'gen', role: 'quick', revision: 0, lastIntentSeq: 0 })).toMatchObject({ role: 'quick' });
    expect(decodeRole({ generation: 'gen', role: 'quick', revision: 0, lastIntentSeq: 0, attemptId: 'one' }).attemptId).toBe('one');
    const intent = { id: 'intent', generation: 'gen', role: 'quick', sequence: 1, expectedRoleRevision: 0 };
    expect(decodeIntent(intent)).toMatchObject(intent);
    expect(decodeIntent({ ...intent, previousAttemptId: 'before', receiptId: 'receipt', outcomeAttemptId: 'after' })).toMatchObject({ outcomeAttemptId: 'after' });
    expect(() => decodeIntent({ ...intent, sequence: 0 })).toThrow();
    expect(() => decodeIntent({ ...intent, previousAttemptId: '?' })).toThrow();
  });
  it('rejects coercible givens objects before internal typed reward helpers can observe them', () => {
    let coercions = 0, iterations = 0;
    const givens = {
      '-1': '0', 81: '0',
      toString() { coercions++; return '0'.repeat(81); },
      *[Symbol.iterator]() { iterations++; yield* '0'.repeat(81); },
    };
    expect(() => decodeDefinition({ ...definition, givens })).toThrow();
    const current = attempt();
    expect(() => decodeAttempt({ ...current, definition: { ...current.definition, givens } })).toThrow();
    expect(coercions).toBe(0);
    expect(iterations).toBe(0);
  });
  it('checks useful disclosure structures, version/revision and all conclusion fields', () => {
    const proof: Disclosure = { id: 'hint', attemptId: 'attempt', logicalRevision: 0, exposed: [0], information: true,
      payload: { kind: 'deduction', technique: 'naked-single', techniqueVersion: 1, logicalRevision: 0, witness: { units: [], cells: [0], digits: [1] }, placements: [{ cell: 0, digit: 1 }], eliminations: [] } };
    expect(decodeDisclosure(proof)).toEqual(proof);
    rejects(decodeDisclosure, proof, [
      value => { value.information = false as never; }, value => { value.payload.logicalRevision = 1; },
      value => { if (value.payload.kind === 'deduction') value.payload.techniqueVersion = 2 as never; },
      value => { if (value.payload.kind === 'deduction') value.payload.technique = 'fishy' as never; },
      value => { if (value.payload.kind === 'deduction') value.payload.placements = []; },
      value => { if (value.payload.kind === 'deduction') value.payload.placements.push(value.payload.placements[0]); },
      value => { if (value.payload.kind === 'deduction') value.payload.witness.cells = [0, 0]; },
      value => { value.payload = { kind: 'unknown', logicalRevision: 0 } as never; },
    ]);
    const inconsistent = { ...proof, exposed: [], payload: { kind: 'inconsistent', logicalRevision: 0 } };
    expect(decodeDisclosure(inconsistent)).toMatchObject({ payload: { kind: 'inconsistent' } });
    expect(decodeDisclosure({ ...proof, payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 1 } })).toMatchObject({ payload: { kind: 'reveal' } });
  });
  it('validates attempt cross-fields and inverse history instead of trusting a solved snapshot', () => {
    rejects(decodeAttempt, attempt(), [
      value => { value.policy = { rewardVersion: 2, scheduleVersion: 1, band: 'hard', base: 400, targetMs: 2400000 }; },
      value => { value.binding = structuredClone(profile.frontier); }, value => { value.scored = false; value.role = 'frontier'; value.binding = structuredClone(profile.frontier); },
      value => { value.status = 'future' as never; }, value => { value.entries = [0]; }, value => { value.notesMode = 'true' as never; },
      value => { value.assistance.used = false; value.assistance.exposed = [0]; },
      value => { value.undo = [{ cell: 0, changes: [] }]; },
      value => { value.undo = [{ cell: 1, changes: [{ cell: 0, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 0 }] }]; },
    ]);
    const hinted = attempt(); hinted.assistance.used = true;
    hinted.pendingDisclosure = { id: 'help', attemptId: hinted.id, logicalRevision: 0, exposed: [0], information: true, payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: Number(solution[0]) } };
    expect(() => decodeAttempt(hinted)).toThrow(); // payload exposure must be included in monotone ledger
    const inverse = attempt(); inverse.notes[0] = 1; inverse.commandSeq = 1;
    inverse.undo = [{ cell: 0, changes: [{ cell: 0, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 1 }] }];
    expect(decodeAttempt(inverse).undo).toHaveLength(1);
    const duplicate = structuredClone(inverse); duplicate.undo[0].changes.push(duplicate.undo[0].changes[0]); expect(() => decodeAttempt(duplicate)).toThrow();
  });
  it('rejects forged receipt bindings, arithmetic, grants and unsupported versions', () => {
    const frontier = receipt(attempt('generation', 'frontier'));
    rejects(decodeReceipt, frontier, [
      value => { value.puzzleId = 'c'.repeat(64); }, value => { value.grantId = '['; },
      value => { value.grantId = '{}'; }, value => { value.grantId = 'x'.repeat(513); },
      value => { value.grantId = undefined; }, value => { value.binding = undefined; },
      value => { value.result.blanks++; }, value => { value.result.base++; }, value => { value.result.dewdrops++; },
      value => { value.result.exposed = 1; value.result.information = false; },
      value => { value.scored = false; },
    ]);
    const quick = receipt(attempt()); quick.binding = structuredClone(profile.frontier); expect(() => decodeReceipt(quick)).toThrow();
    const canonical = receipt(attempt()); canonical.result.information = true; canonical.result.bonusBasisPoints = 0; canonical.result.dewdrops = 100;
    expect(decodeReceipt(canonical).result.dewdrops).toBe(100);
  });
  it('preserves monotone state while refusing immutable, status and revision rollback', () => {
    const current = attempt();
    rejects(value => mergeSnapshot(current, value as Attempt), current, [
      value => { value.id = 'other'; }, value => { value.commandSeq = -1; }, value => { value.status = 'completed'; value.commandSeq++; },
      value => { value.entries[0] = Number(solution[0]); value.commandSeq++; },
    ]);
    const knowledgeable = attempt(); knowledgeable.assistance = { used: true, exposed: [0] }; knowledgeable.elapsedMs = 100;
    const newer = structuredClone(knowledgeable); newer.commandSeq++; newer.assistance = { used: false, exposed: [] }; newer.elapsedMs = 1;
    expect(mergeSnapshot(knowledgeable, newer)).toMatchObject({ elapsedMs: 100, assistance: { used: true, exposed: [0] } });
    const retained = attempt(); retained.assistance = { used: true, exposed: [0] };
    retained.pendingDisclosure = { id: 'help', attemptId: retained.id, logicalRevision: 0, exposed: [0], information: true, payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: Number(solution[0]) } };
    const removed = structuredClone(retained); delete removed.pendingDisclosure; removed.commandSeq++;
    expect(() => mergeSnapshot(retained, removed)).toThrow();
  });
  it('bounds key lengths separately from value lengths in backup JSON', () => {
    expect(() => parseBoundedJson('{"long":0}', { bytes: 100, depth: 3, nodes: 3, array: 3, string: 3, keys: 3 })).toThrow();
  });
});
