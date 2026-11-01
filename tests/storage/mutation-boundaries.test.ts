import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { CatalogLoader } from '../../src/lib/catalog/load';
import { verifyAttestedRecord } from '../../src/lib/catalog/attestation';
import { frontierGrantId, policyForBand } from '../../src/lib/modes';
import { decodeAttempt, decodeDefinition, decodeDisclosure, decodeFrontier, decodeIntent, decodePolicy, decodePool, decodePreferences, decodeProfile, decodeReceipt, decodeRole, identifier, integer, mergeSnapshot, object, recomputeReward, same, validateDisclosureAnswers } from '../../src/lib/storage/decode';
import { attempt, definition, pools, preferences, profile, receipt, solution } from './fixtures';
import type { Attempt, Disclosure, RewardResult } from '../../src/lib/gameplay/contracts';

function corrupt(action: () => unknown): void {
  let rejected: unknown;
  try { action(); } catch (error) { rejected = error; }
  expect(rejected).toMatchObject({ issue: { kind: 'corrupt' } });
}

it('classifies malformed unknown decoder inputs as corruption rather than accidental native errors', () => {
  for (const value of [null, undefined, [], 0, false, 'object', new Date(), () => 1]) corrupt(() => object(value));
  for (const value of [null, undefined, '', 1, true, 'a b', '?', 'x'.repeat(257)]) corrupt(() => identifier(value));
  for (const value of [null, undefined, '1', true, -1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) corrupt(() => integer(value));
  expect(object(Object.create(null))).toEqual({});
  expect(integer(0)).toBe(0); expect(integer(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
});

it('preserves all supported language, motion and board-shape choices when decoding preferences', () => {
  for (const language of ['en', 'de', 'es'] as const) for (const motion of ['system', 'reduced', 'full'] as const) for (const boardShape of ['fill', 'square'] as const) {
    const value = { ...preferences, language, motion, boardShape };
    expect(decodePreferences(value)).toEqual(value);
  }
});

it('refuses valid changes to immutable attempt identity, writer, scoring lineage and binding', () => {
  const cases: { current: Attempt; change: (next: Attempt) => void }[] = [
    { current: attempt(), change: next => { next.id = 'different-attempt'; } },
    { current: attempt(), change: next => { next.generation = 'different-generation'; } },
    { current: attempt(), change: next => { next.writer.token = 'different-writer'; } },
    { current: attempt(), change: next => { next.writer.epoch++; } },
    { current: attempt(), change: next => { next.scored = false; } },
    { current: attempt('gen', 'frontier'), change: next => { next.role = 'replay'; } },
    { current: attempt('gen', 'frontier'), change: next => { next.binding!.leap = 2; } },
  ];
  for (const { current, change } of cases) {
    const next = structuredClone(current); next.commandSeq++; change(next);
    expect(decodeAttempt(next)).toEqual(next); // An unrelated shape/rule rejection must not mask immutability.
    corrupt(() => mergeSnapshot(current, next));
  }
});

it('refuses swapping two fully certified definitions in one existing attempt', async () => {
  // Pure Node fixture transport only. Native browser loader tests retain their default real fetch.
  const loader = new CatalogLoader('https://storage-mutation.test/catalog/v1/', { fetcher: (async input => {
    const name = new URL(String(input)).pathname.split('/').at(-1)!;
    return new Response(new Uint8Array(await readFile(`public/catalog/v1/${name}`)), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch });
  try {
    const first = await loader.getRecord('easy', 0), second = await loader.getRecord('easy', 1);
    expect(first.kind).toBe('ready'); expect(second.kind).toBe('ready');
    if (first.kind !== 'ready' || second.kind !== 'ready') throw new Error('Missing certified test records');
    expect(await verifyAttestedRecord(first.value)).toBe(true); expect(await verifyAttestedRecord(second.value)).toBe(true);
    const current = attempt(); current.definition = first.value;
    const next = structuredClone(current); next.commandSeq++; next.definition = second.value;
    expect(decodeAttempt(current)).toEqual(current); expect(decodeAttempt(next)).toEqual(next);
    corrupt(() => mergeSnapshot(current, next));
  } finally { loader.dispose(); }
});

it('checks command and logical high-water marks separately from valid semantic changes', () => {
  const current = attempt(); current.commandSeq = 4; current.logicalRevision = 2;
  const commandRollback = structuredClone(current); commandRollback.commandSeq = 3;
  const logicalRollback = structuredClone(current); logicalRollback.commandSeq = 5; logicalRollback.logicalRevision = 1;
  const sameSequenceNotes = structuredClone(current); sameSequenceNotes.notes[0] = 1;
  for (const next of [commandRollback, logicalRollback, sameSequenceNotes]) {
    expect(decodeAttempt(next)).toEqual(next); corrupt(() => mergeSnapshot(current, next));
  }
  const timed = structuredClone(current); timed.elapsedMs = 123;
  expect(mergeSnapshot(current, timed).elapsedMs).toBe(123);
  const newerNotes = structuredClone(sameSequenceNotes); newerNotes.commandSeq++;
  const merged = mergeSnapshot(current, newerNotes);
  expect(merged.notes[0]).toBe(1); expect(merged.assistance).toEqual({ used: false, exposed: [] });
});

it('independently pins assisted arithmetic for two original blanks and one exposed answer', () => {
  const game = attempt(); game.definition = { ...game.definition, givens: `00${solution.slice(2)}` };
  game.assistance = { used: true, exposed: [0] };
  const expected: RewardResult = { blanks: 2, exposed: 1, elapsedMs: 0, information: true,
    base: 100, targetMs: 600_000, bonusBasisPoints: 0, dewdrops: 50 };
  expect(recomputeReward(game)).toEqual(expected);
  const completed = receipt(game); completed.result = expected;
  expect(decodeReceipt(completed).result).toEqual(expected);
});

function badFields(decode: (input: unknown) => unknown, valid: unknown, fields: [string, unknown][]): void {
  for (const [field, value] of fields) {
    const changed = { ...structuredClone(valid) as Record<string, unknown>, [field]: value };
    corrupt(() => decode(changed));
  }
}
it('validates each metadata field before it can become a persisted authority', () => {
  badFields(decodePreferences, preferences, [['appearance', ''], ['appearance', '?']]);
  badFields(decodeDefinition, definition, [['sourceId', ''], ['catalogVersion', ''], ['certificationVersion', '']]);
  badFields(decodeFrontier, profile.frontier, [['runId', ''], ['metamorphosis', 0], ['metamorphosis', 1.5], ['leap', 0], ['leap', 61]]);
  badFields(decodeProfile, profile, [['revision', -1], ['highestCompletedLeap', -1], ['highestCompletedLeap', 61], ['frontier', { ...profile.frontier, runId: '' }]]);
  const pool = pools()[0];
  badFields(decodePool, pool, [['catalogVersion', ''], ['revision', -1], ['seed', -1], ['seed', 0x1_0000_0000], ['epoch', -1],
    ['count', 0], ['count', 200_001], ['cursor', -1], ['cursor', pool.count + 1], ['lifetimeIssued', -1], ['lifetimeIssued', pool.count + 1]]);
  badFields(decodePool, { ...pool, lastId: definition.id, lastOrdinal: 0 }, [['lastId', '?'], ['lastOrdinal', -1], ['lastOrdinal', pool.count]]);
  const role = { generation: 'gen', role: 'quick', revision: 0, lastIntentSeq: 0, attemptId: 'first' };
  badFields(decodeRole, role, [['generation', ''], ['revision', -1], ['lastIntentSeq', -1], ['attemptId', '?']]);
  const intent = { id: 'intent', generation: 'gen', role: 'quick', sequence: 1, expectedRoleRevision: 0 };
  badFields(decodeIntent, intent, [['id', ''], ['generation', ''], ['role', 'other'], ['sequence', 0], ['expectedRoleRevision', -1],
    ['previousAttemptId', '?'], ['receiptId', '?'], ['outcomeAttemptId', '?']]);
  expect(decodeFrontier({ ...profile.frontier, metamorphosis: Number.MAX_SAFE_INTEGER, leap: 60 }).leap).toBe(60);
  expect(decodeProfile({ ...profile, revision: Number.MAX_SAFE_INTEGER, wallet: Number.MAX_SAFE_INTEGER, lifetimeEarned: Number.MAX_SAFE_INTEGER,
    frontier: { ...profile.frontier, metamorphosis: 2 }, highestCompletedLeap: 60 }).wallet).toBe(Number.MAX_SAFE_INTEGER);
  expect(decodePool({ ...pool, seed: 0xffffffff, count: 200_000, cursor: 200_000, lifetimeIssued: 200_000,
    lastId: definition.id, lastOrdinal: 199_999 }).lastOrdinal).toBe(199_999);
});
it('keeps malformed and unsupported schema or policy versions distinct', () => {
  for (const version of [undefined, null, 0, '2']) corrupt(() => decodePreferences({ ...preferences, schemaVersion: version }));
  for (const action of [
    () => decodePreferences({ ...preferences, schemaVersion: 2 }),
    () => decodePolicy({ ...attempt().policy, rewardVersion: 1 }),
    () => decodeFrontier({ ...profile.frontier, scheduleVersion: 2 }),
    () => decodePool({ ...pools()[0], selectionVersion: '2' }),
    () => decodePool({ ...pools()[0], lastId: definition.id }),
  ]) {
    let rejected: unknown; try { action(); } catch (error) { rejected = error; }
    expect(rejected).toMatchObject({ issue: { kind: 'unsupported-future' } });
  }
  corrupt(() => decodePolicy({ ...attempt().policy, targetMs: 600_001 }));
});
it('requires exact lexical hashes and refuses conversion hooks on unknown provenance fields', () => {
  for (const field of ['id', 'groupId', 'sourceRevision'] as const) {
    const good = definition[field];
    for (const value of ['x' + good, good + 'x', good + '\n']) corrupt(() => decodeDefinition({ ...definition, [field]: value }));
    let conversions = 0;
    const value = { toString() { conversions++; return good; } };
    corrupt(() => decodeDefinition({ ...definition, [field]: value })); expect(conversions).toBe(0);
  }
});
it('accepts actual certified records in all five source rating intervals', async () => {
  const loader = new CatalogLoader('https://storage-metadata.test/catalog/v1/', { fetcher: (async input => {
    const name = new URL(String(input)).pathname.split('/').at(-1)!;
    return new Response(new Uint8Array(await readFile(`public/catalog/v1/${name}`)), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch });
  try {
    for (const pool of ['easy', 'medium-low', 'medium-high', 'hard-low', 'hard-high'] as const) {
      const result = await loader.getRecord(pool, 0);
      expect(result.kind).toBe('ready'); if (result.kind !== 'ready') throw new Error('Missing certified metadata fixture');
      expect(await verifyAttestedRecord(result.value)).toBe(true); expect(decodeDefinition(result.value)).toEqual(result.value);
      if (pool === 'hard-high') {
        const game = attempt('g'.repeat(256), 'frontier'); game.definition = result.value; game.policy = policyForBand('hard');
        game.binding = { runId: 'r'.repeat(256), metamorphosis: Number.MAX_SAFE_INTEGER, leap: 60, scheduleVersion: 1 };
        const paid = receipt(game);
        expect(paid.grantId).toBe(frontierGrantId(game.generation, game.binding)); expect(paid.grantId).toHaveLength(552);
        expect(decodeReceipt(paid)).toEqual(paid);
        for (const change of [
          (value: typeof paid) => { value.generation = 'g'.repeat(257); },
          (value: typeof paid) => { value.binding = { ...value.binding!, runId: 'r'.repeat(257) }; },
        ]) { const invalid = structuredClone(paid); change(invalid); corrupt(() => decodeReceipt(invalid)); }
      }
    }
  } finally { loader.dispose(); }
});

it('replays a two-edit inverse chain in reverse chronological order', () => {
  const game = attempt(); game.commandSeq = 2; game.notes[0] = 2;
  game.undo = [
    { cell: 0, changes: [{ cell: 0, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 1 }] },
    { cell: 0, changes: [{ cell: 0, beforeValue: 0, afterValue: 0, beforeNotes: 1, afterNotes: 2 }] },
  ];
  expect(decodeAttempt(game)).toEqual(game);
  const reordered = structuredClone(game); reordered.undo.reverse();
  corrupt(() => decodeAttempt(reordered));
});

it('rejects history touching an original clue or disagreeing only with the final notes', () => {
  const clue = attempt(); clue.commandSeq = 1;
  expect(decodeAttempt(clue)).toEqual(clue);
  // Every scalar and current value matches; only the original-clue constraint rejects this no-op.
  clue.undo = [{ cell: 1, changes: [{ cell: 1, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 0 }] }];
  corrupt(() => decodeAttempt(clue));
  const notes = attempt(); notes.commandSeq = 1; notes.notes[0] = 2;
  notes.undo = [{ cell: 0, changes: [{ cell: 0, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 2 }] }];
  expect(decodeAttempt(notes)).toEqual(notes);
  notes.undo[0].changes[0].afterNotes = 1;
  corrupt(() => decodeAttempt(notes));
});

it('requires every exposed pending answer in the acknowledged knowledge ledger', () => {
  const game = attempt(); game.definition = { ...game.definition, givens: `00${solution.slice(2)}` };
  game.assistance = { used: true, exposed: [0, 1] };
  game.pendingDisclosure = { id: 'two-answers', attemptId: game.id, logicalRevision: 0, information: true, exposed: [0, 1],
    payload: { kind: 'deduction', technique: 'naked-single', techniqueVersion: 1, logicalRevision: 0,
      witness: { units: [0], cells: [0, 1], digits: [1, 2] }, placements: [{ cell: 1, digit: 2 }, { cell: 0, digit: 1 }], eliminations: [] } };
  expect(decodeAttempt(game)).toEqual(game);
  game.assistance.exposed = [0];
  corrupt(() => decodeAttempt(game));
});

it('validates persisted attempt and receipt scalar authorities without unrelated shape failures', () => {
  const game = attempt();
  badFields(decodeAttempt, game, [['id', ''], ['generation', ''], ['role', 'other'], ['revision', -1],
    ['selection', -1], ['selection', 81], ['scored', 0], ['writer', { token: '', epoch: 1 }], ['writer', { token: 'writer-one', epoch: 0 }],
    ['assistance', { used: 0, exposed: [] }]]);
  const entryNotes = structuredClone(game); entryNotes.entries[0] = 1; entryNotes.notes[0] = 1;
  corrupt(() => decodeAttempt(entryNotes));
  const completed = structuredClone(game); completed.status = 'completed'; completed.receiptId = completed.id;
  expect(decodeAttempt(completed)).toEqual(completed);
  badFields(decodeAttempt, completed, [['receiptId', '?']]);
  const retired = { ...game, status: 'retired' }; expect(decodeAttempt(retired)).toEqual(retired);
  const paid = receipt(game);
  badFields(decodeReceipt, paid, [['id', ''], ['generation', ''], ['attemptId', ''], ['role', 'other'],
    ['puzzleId', 'invalid'], ['groupId', 'invalid'], ['groupId', 'c'.repeat(64)], ['schemaVersion', 0]]);
  const unscoredFrontier = receipt(attempt('gen', 'frontier')); unscoredFrontier.scored = false;
  unscoredFrontier.result.dewdrops = 0; corrupt(() => decodeReceipt(unscoredFrontier));
  const wrongBand = receipt(game); wrongBand.policy = { rewardVersion: 2, scheduleVersion: 1, band: 'medium', base: 200, targetMs: 1_200_000 };
  wrongBand.result = { ...wrongBand.result, base: 200, targetMs: 1_200_000, dewdrops: 220 };
  corrupt(() => decodeReceipt(wrongBand));
  const wrongPool = receipt(attempt('gen', 'frontier')); wrongPool.binding!.leap = 7;
  wrongPool.grantId = JSON.stringify(['frontier', 'gen', wrongPool.binding!.runId, 1, 7, 1]);
  corrupt(() => decodeReceipt(wrongPool));
});

it('bounds every reveal and deduction coordinate while retaining supported technique discriminants', () => {
  const reveal: Disclosure = { id: 'hint', attemptId: 'attempt', logicalRevision: 0, exposed: [0], information: true,
    payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 1 } };
  badFields(decodeDisclosure, reveal, [['id', ''], ['attemptId', ''], ['exposed', [-1]], ['exposed', [81]]]);
  corrupt(() => decodeDisclosure({ ...reveal, logicalRevision: -1, payload: { ...reveal.payload, logicalRevision: -1 } }));
  for (const value of [{ cell: -1 }, { cell: 81 }, { digit: 0 }, { digit: 10 }])
    corrupt(() => decodeDisclosure({ ...reveal, payload: { ...reveal.payload, ...value } }));
  const deduction: Disclosure = { ...reveal, payload: { kind: 'deduction', technique: 'naked-single', techniqueVersion: 1, logicalRevision: 0,
    witness: { units: [0], cells: [0], digits: [1] }, placements: [{ cell: 0, digit: 1 }], eliminations: [] } };
  if (deduction.payload.kind !== 'deduction') throw Error('Expected structural deduction');
  const payload = deduction.payload;
  for (const technique of ['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing'] as const) {
    const value = { ...deduction, payload: { ...deduction.payload, technique } }; expect(decodeDisclosure(value)).toEqual(value);
  }
  for (const units of [[-1], [27]]) corrupt(() => decodeDisclosure({ ...deduction, payload: { ...payload, witness: { ...payload.witness, units } } }));
  for (const digits of [[0], [10]]) corrupt(() => decodeDisclosure({ ...deduction, payload: { ...payload, witness: { ...payload.witness, digits } } }));
  for (const key of ['placements', 'eliminations'] as const) for (const item of [{ cell: -1, digit: 1 }, { cell: 81, digit: 1 }, { cell: 0, digit: 0 }, { cell: 0, digit: 10 }])
    corrupt(() => decodeDisclosure({ ...deduction, payload: { ...deduction.payload, [key]: [item] } }));
});

it('bounds attestation coordinates and sibling paths independently of later membership verification', () => {
  const valid = { ...definition, attestation: { ...definition.attestation, shardCount: 2, shardSiblings: ['a'.repeat(64)] } };
  expect(decodeDefinition(valid)).toEqual(valid);
  for (const fields of [{ shardStart: -1 }, { shardStart: 200_001 }, { shardIndex: 2 }, { shardIndex: 3 },
    { shardSiblings: [] }, { shardSiblings: ['not-a-hash'] }])
    corrupt(() => decodeDefinition({ ...valid, attestation: { ...valid.attestation, ...fields } }));
  for (const fields of [{ givens: '0'.repeat(80) }, { solution: '1'.repeat(80) }])
    corrupt(() => decodeDefinition({ ...definition, ...fields }));
  let failure: unknown;
  try { decodeDefinition({ ...definition, attestation: { ...definition.attestation, version: 2 } }); } catch (error) { failure = error; }
  expect(failure).toMatchObject({ issue: { kind: 'unsupported-future' } });
  badFields(decodeProfile, profile, [['wallet', -1], ['lifetimeEarned', 0.5]]);
});

it('bounds inverse-history collections without relying on a later chain failure', () => {
  const game = attempt(); game.commandSeq = 513;
  const patch = { cell: 0, changes: [{ cell: 0, beforeValue: 0, afterValue: 0, beforeNotes: 0, afterNotes: 0 }] };
  game.undo = Array.from({ length: 512 }, () => structuredClone(patch)); expect(decodeAttempt(game)).toEqual(game);
  game.undo.push(structuredClone(patch)); corrupt(() => decodeAttempt(game));
  corrupt(() => decodeAttempt({ ...game, undo: null }));
});

it('checks retained payload answers against the original blank and certified digit', () => {
  const game = attempt(); game.assistance = { used: true, exposed: [0] };
  game.pendingDisclosure = { id: 'answer', attemptId: game.id, logicalRevision: 0, information: true, exposed: [0],
    payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 1 } };
  expect(decodeAttempt(game)).toEqual(game);
  game.pendingDisclosure.payload = { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 9 };
  corrupt(() => decodeAttempt(game));
  const clue: Disclosure = { id: 'clue', attemptId: game.id, logicalRevision: 0, information: true, exposed: [1],
    payload: { kind: 'reveal', logicalRevision: 0, cell: 1, digit: 2 } };
  expect(decodeDisclosure(clue)).toEqual(clue);
  corrupt(() => validateDisclosureAnswers(game.definition, clue));
});

it('pins receipt inputs, acknowledged information and canonical grant bytes at their inclusive limit', () => {
  const game = attempt(); game.definition = { ...game.definition, givens: `00${solution.slice(2)}` };
  game.assistance = { used: true, exposed: [0] };
  const paid = receipt(game); expect(decodeReceipt(paid)).toEqual(paid);
  for (const fields of [{ targetMs: 600_001 }, { bonusBasisPoints: 1 },
    { information: false, bonusBasisPoints: 1000, dewdrops: 55 }])
    corrupt(() => decodeReceipt({ ...paid, result: { ...paid.result, ...fields } }));
  const frontier = attempt('gen', 'frontier');
  const grant = { ...receipt(frontier), generation: 'g'.repeat(232), binding: { ...frontier.binding!, runId: 'r'.repeat(256) } };
  grant.grantId = JSON.stringify(['frontier', grant.generation, grant.binding.runId, 1, 1, 1]);
  expect(grant.grantId).toHaveLength(512); expect(decodeReceipt(grant)).toEqual(grant);
  const longer = { ...grant, generation: 'g'.repeat(233) };
  longer.grantId = JSON.stringify(['frontier', longer.generation, grant.binding.runId, 1, 1, 1]);
  expect(longer.grantId).toHaveLength(513); expect(decodeReceipt(longer)).toEqual(longer);
  corrupt(() => decodeReceipt({ ...grant, grantId: ` ${grant.grantId}` }));
  let conversions = 0;
  corrupt(() => decodeReceipt({ ...grant, grantId: { toString() { conversions++; return grant.grantId; } } }));
  expect(conversions).toBe(0);
  for (const grantId of ['null', '1', 'true', '{}', '[]']) corrupt(() => decodeReceipt({ ...grant, grantId }));
  const parse = vi.spyOn(JSON, 'parse');
  try {
    corrupt(() => decodeReceipt({ ...grant, grantId: 'x'.repeat(1025) })); expect(parse).not.toHaveBeenCalled();
    expect(decodeReceipt(grant)).toEqual(grant); expect(parse).toHaveBeenCalledTimes(1);
  } finally { parse.mockRestore(); }
});

it('compares both directions of bounded JSON values and optional undefined keys', () => {
  expect(same(null, null)).toBe(true);
  for (const [left, right] of [[1, {}], [{}, 1], [{}, null], [null, {}], [[], {}], [{}, []]]) expect(same(left, right)).toBe(false);
  expect(same({ x: 1 }, { optional: undefined, x: 1 })).toBe(true);
  expect(same({ optional: undefined, x: 1 }, { x: 1 })).toBe(true);
  const nested = (depth: number): unknown => { let value: unknown = 0; while (depth--) value = [value]; return value; };
  expect(same(nested(32), nested(32))).toBe(true); expect(same(nested(33), nested(33))).toBe(false);
  const cycle: unknown[] = []; cycle[0] = cycle; expect(same(cycle, cycle)).toBe(false);
});

it('allows selection on retained completion and clearing a stale payload after a new logical revision', () => {
  const completed = attempt(); completed.entries[0] = 1; completed.commandSeq = 1; completed.logicalRevision = 1;
  completed.status = 'completed'; completed.receiptId = completed.id;
  const selected = structuredClone(completed); selected.selection = 1; selected.commandSeq++;
  expect(mergeSnapshot(completed, selected)).toEqual(selected);
  const helped = attempt(); helped.assistance = { used: true, exposed: [0] };
  helped.pendingDisclosure = { id: 'old-proof', attemptId: helped.id, logicalRevision: 0, information: true, exposed: [0],
    payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 1 } };
  const edited = structuredClone(helped); edited.commandSeq++; edited.logicalRevision++; edited.entries[0] = 1; delete edited.pendingDisclosure;
  expect(decodeAttempt(edited)).toEqual(edited); expect(mergeSnapshot(helped, edited)).toEqual(edited);
});
