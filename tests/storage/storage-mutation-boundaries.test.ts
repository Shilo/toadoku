import { expect, it } from 'vitest';
import type { Backup } from '../../src/lib/storage/repository';
import type { Disclosure } from '../../src/lib/gameplay/contracts';
import { decodeBackup, decodeIssued } from '../../src/lib/storage/backup';
import { captureRestoreCounts, prepareRestoreRows, validatePreparedRestore } from '../../src/lib/storage/prepare-restore';
import { validateDisclosureProof } from '../../src/lib/storage/disclosure';
import { computeHint } from '../../src/lib/hints';
import { exactCover } from '../../tools/catalog/oracle-exact-cover';
import { attempt, definition, pools, preferences, profile, receipt } from './fixtures';

function corrupt(action: () => unknown) {
  let failure: unknown;
  try { action(); } catch (error) { failure = error; }
  expect(failure).toMatchObject({ issue: { kind: 'corrupt' } });
}
function completed(): Backup {
  const generation = 'storage-boundaries', game = attempt(generation);
  game.entries[0] = 1; game.commandSeq = 1; game.logicalRevision = 1;
  game.status = 'completed'; game.receiptId = game.id;
  const paid = receipt(game), poolStates = pools();
  poolStates[0] = { ...poolStates[0], cursor: 1, lifetimeIssued: 1 };
  return { schemaVersion: 1, application: 'toadodu', preferences: structuredClone(preferences),
    profile: { ...structuredClone(profile), wallet: paid.result.dewdrops, lifetimeEarned: paid.result.dewdrops },
    roles: ['quick', 'frontier', 'replay'].map(role => ({ generation, role: role as 'quick' | 'frontier' | 'replay', revision: 0,
      lastIntentSeq: role === 'quick' ? 1 : 0, ...(role === 'quick' ? { attemptId: game.id } : {}) })),
    attempts: [game], pools: poolStates, receipts: [paid], intents: [],
    issued: [{ generation, id: definition.id, groupId: definition.groupId, pool: 'easy', catalogVersion: '1', firstAttemptId: game.id, issues: 1 }] };
}

it('requires lexical issuance identities without invoking conversion hooks', () => {
  const valid = completed().issued[0]; expect(decodeIssued(valid)).toEqual(valid);
  for (const name of ['generation', 'catalogVersion', 'firstAttemptId'] as const)
    corrupt(() => decodeIssued({ ...valid, [name]: '' }));
  for (const name of ['id', 'groupId'] as const) {
    for (const text of [`x${valid[name]}`, `${valid[name]}x`, `${valid[name]}\n`])
      corrupt(() => decodeIssued({ ...valid, [name]: text }));
    let calls = 0;
    corrupt(() => decodeIssued({ ...valid, [name]: { toString() { calls++; return valid[name]; } } }));
    expect(calls).toBe(0);
  }
});

it('checks each paid total and the retained solved board independently', () => {
  const original = completed(); expect(decodeBackup(original)).toEqual(original);
  for (const name of ['wallet', 'lifetimeEarned'] as const) {
    const changed = structuredClone(original); changed.profile[name]++;
    corrupt(() => decodeBackup(changed));
  }
  const unsolved = structuredClone(original); unsolved.attempts[0].entries[0] = 0;
  // Reward inputs depend on original blanks, time and knowledge, so this receipt remains genuine.
  expect(receipt(unsolved.attempts[0])).toEqual(original.receipts[0]);
  corrupt(() => decodeBackup(unsolved));
  let future: unknown;
  try { decodeBackup({ ...original, schemaVersion: 2 }); } catch (error) { future = error; }
  expect(future).toMatchObject({ issue: { kind: 'unsupported-future' } });
  const scored = completed(); scored.attempts[0].scored = false;
  scored.attempts[0].assistance = { used: true, exposed: [0] };
  scored.receipts = [receipt(scored.attempts[0])]; scored.profile.wallet = 0; scored.profile.lifetimeEarned = 0;
  expect(decodeBackup(scored)).toEqual(scored);
  scored.attempts[0].scored = true; // Both arithmetic results remain0 because every original blank was exposed.
  corrupt(() => decodeBackup(scored));
  const role = completed(), game = role.attempts[0]; game.role = 'frontier'; game.binding = structuredClone(profile.frontier);
  delete role.roles[0].attemptId; role.roles[1].attemptId = game.id; role.roles[1].lastIntentSeq = 1;
  role.receipts = [receipt(game)]; role.profile.highestCompletedLeap = 1; role.profile.frontier.leap = 2;
  expect(decodeBackup(role)).toEqual(role);
  game.role = 'replay'; delete role.roles[1].attemptId; role.roles[2].attemptId = game.id; role.roles[2].lastIntentSeq = 1;
  corrupt(() => decodeBackup(role));
});

it('acknowledges valid disclosures explicitly and keeps solver cancellation technical', () => {
  const game = attempt(), givens = [...game.definition.givens].map(Number);
  const hint = computeHint({ givens, values: givens, logicalRevision: 0, target: 0 });
  expect(hint.kind).toBe('ready');
  if (hint.kind !== 'ready' || hint.payload.kind !== 'deduction') throw Error('Expected original single');
  const disclosure: Disclosure = { id: 'proof', attemptId: game.id, logicalRevision: 0, information: true,
    payload: hint.payload, exposed: hint.payload.placements.map(item => item.cell) };
  const before = structuredClone(game);
  expect(validateDisclosureProof(game, disclosure)).toEqual({ kind: 'committed', value: true });
  expect(validateDisclosureProof(game, { ...disclosure, payload: { kind: 'reveal', logicalRevision: 0, cell: 0, digit: 1 } }))
    .toEqual({ kind: 'committed', value: true });
  for (const options of [{ nodeBudget: 0 }, { shouldAbort: () => true }])
    expect(validateDisclosureProof(game, disclosure, options)).toMatchObject({ kind: 'unavailable', reason: 'abort' });
  expect(game).toEqual(before); // Preflight itself never acknowledges knowledge or changes the ledger.
});

it('recognizes a consistent but unsatisfiable board through an independent exact-cover proof', () => {
  // Existing original solver/hints fixture: row0 has1..8, while9 blocks its final cell through column8.
  const values = Array(81).fill(0); for (let index = 0; index < 8; index++) values[index] = index + 1; values[17] = 9;
  for (const cells of Array.from({ length: 27 }, (_, unit) => Array.from({ length: 9 }, (_, offset) => unit < 9 ? unit * 9 + offset
    : unit < 18 ? offset * 9 + unit - 9 : (Math.floor((unit - 18) / 3) * 3 + Math.floor(offset / 3)) * 9 + ((unit - 18) % 3) * 3 + offset % 3))) {
    const digits = cells.map(cell => values[cell]).filter(Boolean); expect(new Set(digits).size).toBe(digits.length);
  }
  expect(exactCover(values.join(''))).toMatchObject({ kind: 'complete', count: 0 });
  const game = attempt(); game.definition = { ...game.definition, givens: '0'.repeat(81) }; game.entries = values;
  const disclosure: Disclosure = { id: 'unsat', attemptId: game.id, logicalRevision: 0, information: true, exposed: [],
    payload: { kind: 'inconsistent', logicalRevision: 0 } };
  expect(validateDisclosureProof(game, disclosure)).toEqual({ kind: 'committed', value: true });
  expect(game.assistance).toEqual({ used: false, exposed: [] });
});

it('classifies malformed preparation guards and accepts a zero duration', () => {
  const source = completed(), prepared = prepareRestoreRows(source, 'new-storage-boundaries'), expected = captureRestoreCounts(source);
  prepared.packingMs = 0; expect(validatePreparedRestore(prepared, prepared.generation, expected)).toBe(prepared);
  for (const change of [(value: any) => { value.rows = null; }, (value: any) => { value.packingMs = '0'; },
    (value: any) => { Object.defineProperty(value.rows, 0, { enumerable: false }); },
    (value: any) => { value.rows.find((row: any) => row.store === 'roles').key = 0; }]) {
    const changed = structuredClone(prepared); change(changed);
    corrupt(() => validatePreparedRestore(changed, prepared.generation, expected));
  }
  for (const name of ['receipts', 'issued', 'intents', 'attempts'] as const) {
    corrupt(() => captureRestoreCounts({ ...source, [name]: null } as unknown as Backup));
    const changed = structuredClone(source); Object.defineProperty(changed[name], 0, { value: {}, enumerable: false });
    corrupt(() => captureRestoreCounts(changed));
  }
});

it('captures the inclusive bounded compacted-intent history without changing source authority', () => {
  const crossRole = completed(); crossRole.intents = [{ id: 'frontier-intent', generation: 'storage-boundaries', role: 'frontier',
    sequence: 1, expectedRoleRevision: 0, outcomeAttemptId: 'compacted' }];
  corrupt(() => decodeBackup(crossRole));
  crossRole.roles[1].lastIntentSeq = 1; expect(decodeBackup(crossRole)).toEqual(crossRole);
  const source = completed(); source.attempts = []; source.receipts = []; source.issued = [];
  source.profile = structuredClone(profile); source.pools = pools();
  delete source.roles[0].attemptId; source.roles[0].lastIntentSeq = 200_000;
  source.intents = Array.from({ length: 200_000 }, (_, index) => ({ generation: 'storage-boundaries', id: `intent-${index}`, role: 'quick',
    sequence: index + 1, expectedRoleRevision: 0, outcomeAttemptId: 'compacted' }));
  expect(decodeBackup(source).intents).toHaveLength(200_000);
  expect(captureRestoreCounts(source)).toEqual({ receipt: 0, id: 0, group: 0, grants: 0, intents: 200_000, attempts: 0 });
  source.intents.push({ ...source.intents[0], id: 'overflow-intent' });
  corrupt(() => captureRestoreCounts(source)); corrupt(() => decodeBackup(source));
});
