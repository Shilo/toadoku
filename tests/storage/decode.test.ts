import { describe, expect, it } from 'vitest';
import { decodeAttempt, decodeDisclosure, decodePolicy, decodePool, decodeReceipt, mergeSnapshot, object, recomputeReward, same, validateDisclosureAnswers } from '../../src/lib/storage/decode';
import { attempt, receipt, solution } from './fixtures';
import { runInNewContext } from 'node:vm';

describe('strict storage snapshots', () => {
  it('validates indexed values independently of inherited array methods across realms', () => {
    class SpoofArray extends Array<number> {
      override map<U>(_callback: (value: number, index: number, array: number[]) => U): U[] { return Array(81).fill(0) as U[]; }
    }
    const invalid = attempt(), notes = new SpoofArray(...invalid.notes); notes[1] = 512; invalid.notes = notes;
    expect(() => decodeAttempt(invalid)).toThrow();
    const valid = attempt(); valid.notes = new SpoofArray(...valid.notes);
    expect(decodeAttempt(decodeAttempt(valid))).toEqual(decodeAttempt(valid));
    valid.notes = Object.freeze(Array(81).fill(0)) as unknown as number[]; expect(decodeAttempt(valid).notes).toEqual(Array(81).fill(0));
    valid.notes = runInNewContext('Array(81).fill(0)') as number[]; expect(decodeAttempt(valid).notes).toEqual(Array(81).fill(0));
  });
  it('rejects hidden and symbol array metadata, overrides and nonenumerable indices', () => {
    for (const decorate of [
      (array: number[]) => { Object.defineProperty(array, 'extra', { value: 1 }); },
      (array: number[]) => { Object.defineProperty(array, Symbol('extra'), { value: 1 }); },
      (array: number[]) => { Object.defineProperty(array, 'map', { value: () => [] }); },
      (array: number[]) => { Object.defineProperty(array, 0, { enumerable: false }); },
      (array: number[]) => { Object.defineProperty(array, 0, { enumerable: false }); Object.assign(array, { extra: 1 }); },
    ]) {
      for (const name of ['entries', 'notes'] as const) { const value = attempt(); decorate(value[name]); expect(() => decodeAttempt(value)).toThrow(); }
      const array = [0]; decorate(array); expect(same(array, [0])).toBe(false); expect(same([0], array)).toBe(false); expect(same(array, array)).toBe(false);
    }
  });
  it('validates an original test definition and rejects boundary mutations', () => {
    expect(decodeAttempt(attempt())).toEqual(attempt());
    const plain = Object.freeze({}), nullPrototype = Object.freeze(Object.create(null));
    expect(object(plain)).toBe(plain); expect(object(nullPrototype)).toBe(nullPrototype);
    let calls = 0;
    const callable = () => { calls++; };
    Object.setPrototypeOf(callable, Object.prototype); Object.freeze(callable);
    expect(typeof callable).toBe('function'); expect(Object.getPrototypeOf(callable)).toBe(Object.prototype);
    expect(() => object(callable)).toThrow(); expect(calls).toBe(0);
    const mutations: ((value: ReturnType<typeof attempt>) => void)[] = [
      value => { value.entries.pop(); }, value => { value.entries[1] = 1; },
      value => { value.notes[0] = 512; }, value => { value.elapsedMs = -1; },
      value => { value.logicalRevision = 1; }, value => { value.assistance.exposed = [0, 0]; },
      value => { value.assistance = { used: true, exposed: [1] }; },
      value => { value.status = 'completed'; }, value => { value.policy.base++; },
      value => { value.definition = { ...value.definition, ratingTenths: 25 }; },
      value => { value.undo = [{ cell: 0, changes: [{ cell: 0, beforeValue: 0, afterValue: 9, beforeNotes: 0, afterNotes: 0 }] }]; },
    ];
    for (const mutation of mutations) { const value = attempt(); mutation(value); expect(() => decodeAttempt(value)).toThrow(); }
    expect(() => decodeAttempt({ ...attempt(), surprise: 'https://untrusted.test' })).toThrow();
    expect(() => decodeAttempt({ ...attempt(), schemaVersion: 2 })).toThrow();
  });
  it('retains old disclosure payload after restart, but rejects future/foreign disclosure', () => {
    const value = attempt(); value.commandSeq = 2; value.logicalRevision = 2;
    value.assistance = { used: true, exposed: [0] };
    value.pendingDisclosure = { id: 'hint-one', attemptId: value.id, logicalRevision: 1,
      payload: { kind: 'reveal', logicalRevision: 1, cell: 0, digit: Number(solution[0]) }, exposed: [0], information: true };
    expect(decodeAttempt(value)).toEqual(value);
    const future = structuredClone(value); future.pendingDisclosure!.logicalRevision = 3; future.pendingDisclosure!.payload.logicalRevision = 3;
    expect(() => decodeAttempt(future)).toThrow();
    const foreign = structuredClone(value); foreign.pendingDisclosure!.attemptId = 'other';
    expect(() => decodeAttempt(foreign)).toThrow();
  });
  it('rejects a hole masked by a named array property at every structured boundary', () => {
    const corruptArray = (array: unknown[]) => { delete array[0]; Object.assign(array, { extra: 0 }); };
    for (const field of ['entries', 'notes'] as const) {
      const value = attempt(); corruptArray(value[field]);
      expect(() => decodeAttempt(value)).toThrow();
    }
    const proof = attempt();
    proof.definition = { ...proof.definition, attestation: { ...proof.definition.attestation, recordCount: 2, recordSiblings: ['a'.repeat(64)] } };
    corruptArray(proof.definition.attestation.recordSiblings);
    expect(() => decodeAttempt(proof)).toThrow();
    const hint = attempt(); hint.assistance.used = true;
    hint.pendingDisclosure = { id: 'hint-one', attemptId: hint.id, logicalRevision: 0, exposed: [], information: true,
      payload: { kind: 'deduction', technique: 'naked-single', techniqueVersion: 1, logicalRevision: 0,
        witness: { units: [0], cells: [0], digits: [1] }, placements: [{ cell: 0, digit: 1 }], eliminations: [] } };
    if (hint.pendingDisclosure.payload.kind === 'deduction') corruptArray(hint.pendingDisclosure.payload.witness.cells);
    expect(() => decodeAttempt(hint)).toThrow();
  });
  it('requires newer semantic command sequences and freezes pending/completed snapshots', () => {
    const current = attempt(); const next = structuredClone(current); next.entries[0] = Number(solution[0]); next.logicalRevision++;
    expect(() => mergeSnapshot(current, next)).toThrow();
    next.commandSeq++;
    expect(mergeSnapshot(current, next).entries[0]).toBe(Number(solution[0]));
    next.status = 'pending-completion';
    const frozen = structuredClone(next); frozen.entries[0] = 0; frozen.commandSeq++; frozen.logicalRevision++;
    expect(() => mergeSnapshot(next, frozen)).toThrow();
    const later = structuredClone(next); later.elapsedMs++;
    expect(() => mergeSnapshot(next, later)).toThrow();
  });
  it('recomputes exact receipt arithmetic and canonical grant identity', () => {
    const value = attempt('test-generation', 'frontier'); value.elapsedMs = 300_000;
    expect(decodeReceipt(receipt(value)).result.dewdrops).toBe(105);
    const tampered = receipt(value); tampered.result.dewdrops++;
    expect(() => decodeReceipt(tampered)).toThrow();
    const falseGrant = receipt(value); falseGrant.grantId = '["frontier","other","run-one",1,1,1]';
    expect(() => decodeReceipt(falseGrant)).toThrow();
    const unscored = attempt(); unscored.scored = false;
    expect(decodeReceipt(receipt(unscored)).result.dewdrops).toBe(0);
  });
  it('leaves old score policy snapshots unsupported and unchanged for recovery', () => {
    const original = { ...attempt(), policy: { scoreVersion: 1, scheduleVersion: 1, band: 'easy', base: 1000, targetMs: 600_000 } };
    const before = JSON.stringify(original);
    expect(() => decodeAttempt(original)).toThrow('policy');
    expect(JSON.stringify(original)).toBe(before);
  });
  it('rejects nonarrays, oversized arrays and named properties without dropping them', () => {
    for (const entries of [{}, Array(82).fill(0), Object.assign(Array(81).fill(0), { extra: 0 })]) {
      expect(() => decodeAttempt({ ...attempt(), entries })).toThrow();
    }
  });
  it('checks all answer classifications and exact disclosed answer sets', () => {
    const value = attempt(); value.definition = { ...value.definition, givens: `00${solution.slice(2)}` };
    const base = { id: 'proof', attemptId: value.id, logicalRevision: 0, information: true as const };
    const deduction = { ...base, exposed: [1, 0], payload: { kind: 'deduction' as const, technique: 'naked-pair' as const,
      techniqueVersion: 1 as const, logicalRevision: 0, witness: { cells: [0, 1], units: [0], digits: [1, 2] },
      placements: [{ cell: 0, digit: Number(solution[0]) }, { cell: 1, digit: Number(solution[1]) }], eliminations: [] } };
    expect(() => validateDisclosureAnswers(value.definition, decodeDisclosure(deduction))).not.toThrow();
    const inconsistent = { ...base, exposed: [], payload: { kind: 'inconsistent' as const, logicalRevision: 0 } };
    expect(() => validateDisclosureAnswers(value.definition, inconsistent)).not.toThrow();
    expect(() => validateDisclosureAnswers(value.definition, { ...inconsistent, exposed: [0] })).toThrow();
    const wrongDigit = structuredClone(deduction); wrongDigit.payload.placements[0].digit = 9;
    expect(() => validateDisclosureAnswers(value.definition, wrongDigit)).toThrow();
    const clue = structuredClone(deduction); clue.payload.placements[0].cell = 2; clue.exposed = [2, 1];
    expect(() => validateDisclosureAnswers(value.definition, clue)).toThrow();
  });
  it('accepts completed snapshots and every band only at matching schedule positions', () => {
    const complete = attempt(); complete.entries[0] = Number(solution[0]); complete.commandSeq = 1; complete.logicalRevision = 1;
    complete.status = 'completed'; complete.receiptId = complete.id;
    expect(decodeAttempt(complete).status).toBe('completed');
    const hard = Object.freeze({ rewardVersion: 2, scheduleVersion: 1, band: 'hard', base: 400, targetMs: 2_400_000 });
    const unsupportedBand = Object.freeze({ ...hard, band: 'other' });
    expect(decodePolicy(hard)).toEqual(hard); expect(() => decodePolicy(unsupportedBand)).toThrow();
    const replay = attempt('generation', 'replay'), replayReceipt = receipt(replay);
    expect(decodeAttempt(replay).role).toBe('replay'); expect(decodeReceipt(replayReceipt).role).toBe('replay');
    expect(replay.binding).toBeDefined(); expect(replayReceipt.grantId).toBeUndefined();
    const invalidAttempt = Object.freeze({ ...structuredClone(replay), role: 'other' });
    const invalidReceipt = Object.freeze({ ...structuredClone(replayReceipt), role: 'other' });
    const before = structuredClone([invalidAttempt, invalidReceipt]);
    expect(() => decodeAttempt(invalidAttempt)).toThrow(); expect(() => decodeReceipt(invalidReceipt)).toThrow();
    expect([invalidAttempt, invalidReceipt]).toEqual(before);
    for (const [pool, band, ratingTenths, base, targetMs, leap] of [
      ['medium-low', 'medium', 15, 200, 1_200_000, 7], ['hard-low', 'hard', 25, 400, 2_400_000, 25],
    ] as const) {
      const value = attempt('generation', 'frontier'); value.definition = { ...value.definition, pool, ratingTenths };
      value.policy = { rewardVersion: 2, scheduleVersion: 1, band, base, targetMs }; value.binding!.leap = leap;
      expect(decodeAttempt(value).policy.band).toBe(band); expect(decodeReceipt(receipt(value)).policy.band).toBe(band);
      value.binding!.leap = 1; expect(() => decodeAttempt(value)).toThrow('binding-pool');
    }
  });
  it('checks note/value constraints in both sides of undo patches', () => {
    const value = attempt(); value.entries[0] = 1; value.commandSeq = 1; value.logicalRevision = 1;
    value.undo = [{ cell: 0, changes: [{ cell: 0, beforeValue: 2, afterValue: 1, beforeNotes: 0, afterNotes: 0 }] }];
    expect(decodeAttempt(value).undo).toHaveLength(1);
    for (const field of ['beforeNotes', 'afterNotes'] as const) {
      const invalid = structuredClone(value); invalid.undo[0].changes[0][field] = 1;
      expect(() => decodeAttempt(invalid)).toThrow('undo-chain');
    }
  });
  it('preserves monotone knowledge while allowing selection on a frozen result', () => {
    const value = attempt(); value.definition = { ...value.definition, givens: `00${solution.slice(2)}` };
    value.assistance = { used: true, exposed: [1] };
    const next = structuredClone(value); next.assistance.exposed = [0]; next.commandSeq++;
    expect(mergeSnapshot(value, next).assistance.exposed).toEqual([0, 1]);
    expect(recomputeReward(value).bonusBasisPoints).toBe(0);
    const frozen = attempt(); frozen.status = 'pending-completion';
    const selected = structuredClone(frozen); selected.selection = 1; selected.commandSeq++;
    expect(mergeSnapshot(frozen, selected).selection).toBe(1);
    const retired = attempt(); retired.commandSeq++; retired.status = 'retired';
    expect(() => mergeSnapshot(attempt(), retired)).toThrow('snapshot-status');
    const invalidRevision = attempt(); invalidRevision.commandSeq++; invalidRevision.entries[0] = 1;
    expect(() => mergeSnapshot(attempt(), invalidRevision)).toThrow('logical-revision');
  });
  it('keeps last ordinal paired with stable identity and rejects old unresolved traversal', () => {
    const pool = { selectionVersion: '1' as const, catalogVersion: '1', pool: 'easy' as const, revision: 0, seed: 1, epoch: 0, cursor: 0, lifetimeIssued: 0, count: 3 };
    expect(decodePool({ ...pool, lastId: 'a'.repeat(64), lastOrdinal: 2 }).lastOrdinal).toBe(2);
    expect(() => decodePool({ ...pool, lastId: 'a'.repeat(64) })).toThrow('pool-last-ordinal');
  });
  it('compares bounded semantic JSON data independent of property order', () => {
    expect(same({ base: 100, band: 'easy' }, { band: 'easy', base: 100 })).toBe(true);
    expect(same({ optional: undefined, x: [1, 2] }, { x: [1, 2] })).toBe(true);
    expect(same({ base: 100 }, { base: 101 })).toBe(false);
    expect(same({ x: 1 }, { y: 1 })).toBe(false); expect(same({}, { x: 1 })).toBe(false);
    const left = JSON.parse('{"generation":"generation","essentialRevision":0,"__proto__":{}}') as Record<string, unknown>;
    Object.freeze(left['__proto__']); Object.freeze(left);
    const right = Object.freeze({ generation: 'generation', essentialRevision: 0, zz: 123 });
    const before = structuredClone([left, right]);
    expect(same(left, structuredClone(left))).toBe(true);
    expect(same(left, right)).toBe(false); expect(same(right, left)).toBe(false);
    expect([left, right]).toEqual(before);
    expect(same([1, 2], [2, 1])).toBe(false); expect(same([1], [1, 2])).toBe(false);
    const array = Object.freeze([1]), arrayLike = Object.freeze({ 0: 1, length: 1 });
    const indexedBefore = structuredClone([array, arrayLike]);
    expect(same(array, [1])).toBe(true);
    expect(same(array, arrayLike)).toBe(false); expect(same(arrayLike, array)).toBe(false);
    expect([array, arrayLike]).toEqual(indexedBefore);
    expect(same([], {})).toBe(false); expect(same({}, [])).toBe(false); expect(same(null, {})).toBe(false);
    const hole = Array(1); expect(same(hole, hole)).toBe(false); expect(same([1], hole)).toBe(false);
    const cycle: { value?: unknown } = {}; cycle.value = cycle; expect(same(cycle, cycle)).toBe(false);
    const current = attempt(), reordered = structuredClone(current);
    reordered.policy = { targetMs: 600_000, base: 100, band: 'easy', scheduleVersion: 1, rewardVersion: 2 };
    expect(mergeSnapshot(current, reordered).policy.base).toBe(100);
  });
});
