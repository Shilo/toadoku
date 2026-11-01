import type {
  AllocationIntent, Attempt, CompletionReceipt, Definition, Disclosure, Frontier,
  PoolState, Preferences, Profile, Role, RoleRecord, RewardPolicy, RewardResult,
} from '../gameplay/contracts';
import { POOLS, ratingPool } from '../catalog/types';
import { decodeGrid, findConflicts, isComplete } from '../sudoku';
import { poolForLeap } from '../modes';
import { StorageFailure } from './transaction';

export const ROLES: readonly Role[] = ['quick', 'frontier', 'replay'];
const fail = (reason: string): never => { throw new StorageFailure({ kind: 'corrupt', reason }); };
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('object');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail('object-prototype');
  return value as Record<string, unknown>;
}
function fields(input: Record<string, unknown>, allowed: readonly string[]): void {
  if (Object.keys(input).some(key => !allowed.includes(key))) fail('unknown-field');
}
export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) return fail('integer');
  return value as number;
}
export function identifier(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9:._/-]{1,256}$/.test(value)) return fail('identifier');
  return value;
}
function hash(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) return fail('hash');
  return value;
}
function bool(value: unknown): boolean { if (typeof value !== 'boolean') return fail('boolean'); return value; }
export function role(value: unknown): Role {
  if (!ROLES.includes(value as Role)) return fail('role');
  return value as Role;
}
function version(value: unknown): void {
  if (value !== 1) {
    if (typeof value === 'number' && value > 1) throw new StorageFailure({ kind: 'unsupported-future', reason: 'schema' });
    fail('schema');
  }
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max || Reflect.ownKeys(value).length !== value.length + 1) return fail('array');
  const copy: unknown[] = [];
  for (let index = 0; index < value.length; index++) {
    if (!Object.prototype.propertyIsEnumerable.call(value, index)) return fail('array-hole');
    copy[index] = value[index];
  }
  return copy;
}
function cells(value: unknown, max: number, min = 0): number[] {
  const values = list(value, 81).map(cell => integer(cell, min, max));
  if (new Set(values).size !== values.length) return fail('duplicate-cells');
  return values;
}
function board(value: unknown, max: number): number[] {
  const values = list(value, 81).map(item => integer(item, 0, max));
  if (values.length !== 81) return fail('board-length');
  return values;
}
export function decodePreferences(value: unknown): Preferences {
  const input = object(value); version(input.schemaVersion);
  fields(input, ['schemaVersion', 'language', 'motion', 'boardShape', 'theme', 'appearance', 'generation']);
  if (!['en', 'de', 'es'].includes(input.language as string) || !['system', 'reduced', 'full'].includes(input.motion as string)
    || !['fill', 'square'].includes(input.boardShape as string)) return fail('preferences');
  identifier(input.theme); identifier(input.appearance);
  return structuredClone(value) as Preferences;
}
export function decodeDefinition(value: unknown): Definition {
  const input = object(value);
  fields(input, ['id', 'groupId', 'sourceId', 'givens', 'solution', 'ratingTenths', 'sourceFile', 'catalogVersion', 'certificationVersion', 'sourceRevision', 'pool', 'attestation']);
  hash(input.id); hash(input.groupId); identifier(input.sourceId);
  identifier(input.catalogVersion); identifier(input.certificationVersion);
  if (typeof input.sourceRevision !== 'string' || !/^[a-f0-9]{40}$/.test(input.sourceRevision)) return fail('source-revision');
  if (!['easy.txt', 'medium.txt', 'hard.txt'].includes(input.sourceFile as string)) return fail('source-file');
  if (!POOLS.includes(input.pool as typeof POOLS[number]) || ratingPool(integer(input.ratingTenths, 10, 49)) !== input.pool) return fail('rating-pool');
  const attestation = object(input.attestation);
  fields(attestation, ['version', 'shardStart', 'recordCount', 'recordIndex', 'recordSiblings', 'shardIndex', 'shardCount', 'shardSiblings']);
  if (attestation.version !== 1) throw new StorageFailure({ kind: 'unsupported-future', reason: 'attestation' });
  integer(attestation.shardStart, 0, 200_000);
  const recordCount = integer(attestation.recordCount, 1, 256);
  integer(attestation.recordIndex, 0, recordCount - 1);
  const shardCount = integer(attestation.shardCount, 1, 1024);
  integer(attestation.shardIndex, 0, shardCount - 1);
  const recordSiblings = list(attestation.recordSiblings, 8); const shardSiblings = list(attestation.shardSiblings, 10);
  if (recordSiblings.length !== Math.ceil(Math.log2(recordCount)) || shardSiblings.length !== Math.ceil(Math.log2(shardCount))) return fail('attestation-path');
  recordSiblings.forEach(hash); shardSiblings.forEach(hash);
  const givens = decodeGrid(input.givens);
  const solution = decodeGrid(input.solution);
  if (!givens.ok || !solution.ok) return fail('grid');
  if (givens.board.every(Boolean) || findConflicts(givens.board).length || !isComplete(solution.board, givens.board)) return fail('definition-rules');
  return structuredClone(value) as Definition;
}
export function decodePolicy(value: unknown): RewardPolicy {
  const input = object(value);
  if (input.rewardVersion !== 2 || input.scheduleVersion !== 1) {
    throw new StorageFailure({ kind: 'unsupported-future', reason: 'policy' });
  }
  fields(input, ['rewardVersion', 'scheduleVersion', 'band', 'base', 'targetMs']);
  const band = input.band;
  const expected = band === 'easy' ? [100, 600_000] : band === 'medium' ? [200, 1_200_000] : band === 'hard' ? [400, 2_400_000] : undefined;
  if (!expected || input.base !== expected[0] || input.targetMs !== expected[1]) return fail('policy-values');
  return structuredClone(value) as RewardPolicy;
}
export function decodeFrontier(value: unknown): Frontier {
  const input = object(value);
  fields(input, ['runId', 'metamorphosis', 'leap', 'scheduleVersion']);
  identifier(input.runId); integer(input.metamorphosis, 1); integer(input.leap, 1, 60);
  if (input.scheduleVersion !== 1) throw new StorageFailure({ kind: 'unsupported-future', reason: 'schedule' });
  return structuredClone(value) as Frontier;
}
export function decodeProfile(value: unknown): Profile {
  const input = object(value);
  fields(input, ['revision', 'wallet', 'lifetimeEarned', 'frontier', 'highestCompletedLeap', 'generation']);
  integer(input.revision); integer(input.wallet); integer(input.lifetimeEarned);
  if (input.wallet !== input.lifetimeEarned) return fail('wallet-total');
  decodeFrontier(input.frontier); integer(input.highestCompletedLeap, 0, 60);
  return structuredClone(value) as Profile;
}
export function decodePool(value: unknown): PoolState {
  const input = object(value);
  fields(input, ['selectionVersion', 'catalogVersion', 'pool', 'revision', 'seed', 'epoch', 'cursor', 'lifetimeIssued', 'count', 'lastId', 'lastOrdinal', 'generation']);
  if (input.selectionVersion !== '1') throw new StorageFailure({ kind: 'unsupported-future', reason: 'selection' });
  identifier(input.catalogVersion);
  if (!POOLS.includes(input.pool as typeof POOLS[number])) return fail('pool');
  integer(input.revision); integer(input.seed, 0, 0xffffffff); integer(input.epoch);
  const count = integer(input.count, 1, 200_000);
  integer(input.cursor, 0, count); integer(input.lifetimeIssued, 0, count);
  if (input.lastId !== undefined) hash(input.lastId);
  if ((input.lastId !== undefined) !== (input.lastOrdinal !== undefined)) {
    throw new StorageFailure({ kind: 'unsupported-future', reason: 'pool-last-ordinal' });
  }
  if (input.lastOrdinal !== undefined) integer(input.lastOrdinal, 0, count - 1);
  return structuredClone(value) as PoolState;
}
export function decodeRole(value: unknown): RoleRecord {
  const input = object(value); identifier(input.generation); role(input.role); integer(input.revision); integer(input.lastIntentSeq);
  fields(input, ['generation', 'role', 'revision', 'attemptId', 'lastIntentSeq']);
  if (input.attemptId !== undefined) identifier(input.attemptId);
  return structuredClone(value) as RoleRecord;
}
export function decodeIntent(value: unknown): AllocationIntent {
  const input = object(value); identifier(input.id); identifier(input.generation); role(input.role);
  fields(input, ['id', 'generation', 'role', 'sequence', 'expectedRoleRevision', 'previousAttemptId', 'receiptId', 'outcomeAttemptId']);
  integer(input.sequence, 1); integer(input.expectedRoleRevision);
  for (const field of ['previousAttemptId', 'receiptId', 'outcomeAttemptId']) if (input[field] !== undefined) identifier(input[field]);
  return structuredClone(value) as AllocationIntent;
}
export function decodeDisclosure(value: unknown): Disclosure {
  const input = object(value); identifier(input.id); identifier(input.attemptId); integer(input.logicalRevision);
  fields(input, ['id', 'attemptId', 'logicalRevision', 'payload', 'exposed', 'information']);
  if (input.information !== true) return fail('disclosure-information');
  cells(input.exposed, 80);
  const payload = object(input.payload);
  if (payload.logicalRevision !== input.logicalRevision) return fail('disclosure-revision');
  if (payload.kind === 'reveal') { fields(payload, ['kind', 'logicalRevision', 'cell', 'digit']); integer(payload.cell, 0, 80); integer(payload.digit, 1, 9); }
  else if (payload.kind === 'deduction') {
    fields(payload, ['kind', 'technique', 'techniqueVersion', 'logicalRevision', 'witness', 'placements', 'eliminations']);
    if (payload.techniqueVersion !== 1 || !['naked-single', 'hidden-single', 'pointing', 'claiming', 'naked-pair', 'hidden-pair', 'naked-triple', 'hidden-triple', 'x-wing'].includes(payload.technique as string)) return fail('technique');
    const witness = object(payload.witness);
    fields(witness, ['units', 'cells', 'digits']);
    cells(witness.units, 26); cells(witness.cells, 80); cells(witness.digits, 9, 1);
    let count = 0;
    for (const key of ['placements', 'eliminations']) {
      const conclusions = list(payload[key], 729);
      const seen = new Set<string>();
      for (const conclusion of conclusions) {
        const item = object(conclusion); fields(item, ['cell', 'digit']); integer(item.cell, 0, 80); integer(item.digit, 1, 9);
        const id = `${item.cell}:${item.digit}`;
        if (seen.has(id)) return fail('duplicate-conclusion');
        seen.add(id); count++;
      }
    }
    if (!count) return fail('empty-deduction');
  } else if (payload.kind !== 'inconsistent') return fail('hint-kind');
  else fields(payload, ['kind', 'logicalRevision']);
  return structuredClone(value) as Disclosure;
}
export function validateDisclosureAnswers(definition: Definition, disclosure: Disclosure): void {
  const payload = disclosure.payload;
  const answers = payload.kind === 'reveal' ? [{ cell: payload.cell, digit: payload.digit }]
    : payload.kind === 'deduction' ? payload.placements : [];
  const expected = [...new Set(answers.map(answer => answer.cell))].sort((a, b) => a - b);
  const actual = [...disclosure.exposed].sort((a, b) => a - b);
  if (!same(expected, actual) || answers.some(answer => definition.givens[answer.cell] !== '0'
    || Number(definition.solution[answer.cell]) !== answer.digit)) fail('disclosure-answer-ledger');
}
export function decodeAttempt(value: unknown): Attempt {
  const input = object(value); version(input.schemaVersion);
  fields(input, ['schemaVersion', 'id', 'generation', 'role', 'revision', 'commandSeq', 'logicalRevision', 'writer', 'definition', 'policy', 'binding', 'entries', 'notes', 'selection', 'notesMode', 'undo', 'elapsedMs', 'assistance', 'pendingDisclosure', 'status', 'scored', 'receiptId']);
  identifier(input.id); identifier(input.generation); role(input.role); integer(input.revision);
  const sequence = integer(input.commandSeq); integer(input.logicalRevision, 0, sequence);
  const writer = object(input.writer); fields(writer, ['token', 'epoch']); identifier(writer.token); integer(writer.epoch, 1);
  const definition = decodeDefinition(input.definition); const policy = decodePolicy(input.policy);
  const expectedBand = definition.pool === 'easy' ? 'easy' : definition.pool.startsWith('medium') ? 'medium' : 'hard';
  if (policy.band !== expectedBand) return fail('attempt-band');
  if (input.binding !== undefined && poolForLeap(decodeFrontier(input.binding).leap) !== definition.pool) return fail('binding-pool');
  if ((input.role === 'quick') !== (input.binding === undefined)) return fail('attempt-binding');
  const entries = board(input.entries, 9); const notes = board(input.notes, 511);
  for (let cell = 0; cell < 81; cell++) {
    if ((definition.givens[cell] !== '0' && (entries[cell] || notes[cell])) || (entries[cell] && notes[cell])) return fail('clue-entry-notes');
  }
  integer(input.selection, 0, 80); bool(input.notesMode); integer(input.elapsedMs);
  bool(input.scored);
  if (!input.scored && input.role !== 'quick') return fail('unscored-role');
  if (!['playing', 'pending-completion', 'completed', 'retired'].includes(input.status as string)) return fail('attempt-status');
  if (input.receiptId !== undefined) identifier(input.receiptId);
  if ((input.status === 'completed') !== (input.receiptId !== undefined)) return fail('attempt-receipt');
  const assistance = object(input.assistance); fields(assistance, ['used', 'exposed']); bool(assistance.used);
  const exposed = cells(assistance.exposed, 80);
  if ((!assistance.used && exposed.length) || exposed.some(cell => definition.givens[cell] !== '0')) return fail('assistance');
  if (input.pendingDisclosure !== undefined) {
    const disclosure = decodeDisclosure(input.pendingDisclosure);
    validateDisclosureAnswers(definition, disclosure);
    if (disclosure.attemptId !== input.id || disclosure.logicalRevision > (input.logicalRevision as number) || !assistance.used
      || disclosure.exposed.some(cell => !exposed.includes(cell))) return fail('pending-disclosure');
  }
  const undo = list(input.undo, 512);
  const workingEntries = [...entries]; const workingNotes = [...notes];
  for (const patch of [...undo].reverse()) {
    const edit = object(patch); fields(edit, ['cell', 'changes']); integer(edit.cell, 0, 80);
    const changes = list(edit.changes, 21);
    if (!changes.length) return fail('empty-undo');
    const changed = new Set<number>();
    for (const change of changes) {
      const item = object(change); fields(item, ['cell', 'beforeValue', 'afterValue', 'beforeNotes', 'afterNotes']); const cell = integer(item.cell, 0, 80);
      const before = integer(item.beforeValue, 0, 9); const after = integer(item.afterValue, 0, 9);
      const beforeNotes = integer(item.beforeNotes, 0, 511); const afterNotes = integer(item.afterNotes, 0, 511);
      if (changed.has(cell) || definition.givens[cell] !== '0' || (before && beforeNotes) || (after && afterNotes)
        || workingEntries[cell] !== after || workingNotes[cell] !== afterNotes) return fail('undo-chain');
      changed.add(cell); workingEntries[cell] = before; workingNotes[cell] = beforeNotes;
    }
    if (!changed.has(edit.cell as number)) return fail('undo-primary');
  }
  return structuredClone(value) as Attempt;
}

/** Independent arithmetic at the persistence trust boundary, not a UI supplied score. */
export function recomputeReward(attempt: Attempt): RewardResult {
  const blanks = [...attempt.definition.givens].filter(digit => digit === '0').length;
  const exposed = attempt.assistance.exposed.length;
  const { base, targetMs } = attempt.policy;
  const elapsedMs = attempt.elapsedMs;
  const information = attempt.assistance.used;
  const bonusBasisPoints = information ? 0 : Number(1000n * BigInt(Math.max(0, targetMs - elapsedMs)) / BigInt(targetMs));
  const dewdrops = attempt.scored
    ? Number(BigInt(base) * BigInt(blanks - exposed) * BigInt(10_000 + bonusBasisPoints) / (BigInt(blanks) * 10_000n)) : 0;
  return { blanks, exposed, elapsedMs, information, base, targetMs, bonusBasisPoints, dewdrops };
}
export function decodeReceipt(value: unknown): CompletionReceipt {
  const input = object(value); version(input.schemaVersion);
  fields(input, ['schemaVersion', 'id', 'generation', 'attemptId', 'puzzleId', 'groupId', 'definition', 'role', 'scored', 'policy', 'result', 'binding', 'grantId']);
  identifier(input.id); identifier(input.generation); identifier(input.attemptId); hash(input.puzzleId); hash(input.groupId); role(input.role);
  const scored = bool(input.scored);
  if (!scored && input.role !== 'quick') return fail('unscored-role');
  const definition = decodeDefinition(input.definition); const policy = decodePolicy(input.policy);
  if (definition.id !== input.puzzleId || definition.groupId !== input.groupId) return fail('receipt-definition');
  const expectedBand = definition.pool === 'easy' ? 'easy' : definition.pool.startsWith('medium') ? 'medium' : 'hard';
  if (policy.band !== expectedBand) return fail('receipt-band');
  if (input.binding !== undefined && poolForLeap(decodeFrontier(input.binding).leap) !== definition.pool) return fail('receipt-pool');
  if ((input.role === 'quick') !== (input.binding === undefined)) return fail('receipt-binding');
  if (input.grantId !== undefined) {
    if (typeof input.grantId !== 'string' || input.grantId.length > 1024) return fail('grant-id');
    const binding = decodeFrontier(input.binding);
    const expected = ['frontier', input.generation, binding.runId, binding.metamorphosis, binding.leap, binding.scheduleVersion];
    let tuple: unknown;
    try { tuple = JSON.parse(input.grantId); } catch { return fail('grant-json'); }
    if (!Array.isArray(tuple) || tuple.length !== 6 || !same(tuple, expected) || input.grantId !== JSON.stringify(expected)) return fail('grant-tuple');
  }
  if ((input.role === 'frontier') !== (input.grantId !== undefined)) return fail('receipt-grant');
  const result = object(input.result);
  fields(result, ['blanks', 'exposed', 'elapsedMs', 'information', 'base', 'targetMs', 'bonusBasisPoints', 'dewdrops']);
  const blanks = [...definition.givens].filter(digit => digit === '0').length;
  if (result.blanks !== blanks || result.base !== policy.base || result.targetMs !== policy.targetMs) return fail('receipt-inputs');
  const exposed = integer(result.exposed, 0, blanks); const elapsedMs = integer(result.elapsedMs); const information = bool(result.information);
  if (exposed && !information) return fail('receipt-assistance');
  const bonus = information ? 0 : Number(1000n * BigInt(Math.max(0, policy.targetMs - elapsedMs)) / BigInt(policy.targetMs));
  const dewdrops = scored ? Number(BigInt(policy.base) * BigInt(blanks - exposed) * BigInt(10_000 + bonus) / (BigInt(blanks) * 10_000n)) : 0;
  if (result.bonusBasisPoints !== bonus || result.dewdrops !== dewdrops) return fail('receipt-reward');
  return structuredClone(value) as CompletionReceipt;
}

export function same(left: unknown, right: unknown, depth = 0): boolean {
  if (depth > 32) return false;
  if (left === right && (left === null || typeof left !== 'object')) return true;
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length
      || Reflect.ownKeys(left).length !== left.length + 1 || Reflect.ownKeys(right).length !== right.length + 1) return false;
    for (let index = 0; index < left.length; index++) {
      if (!Object.prototype.propertyIsEnumerable.call(left, index) || !Object.prototype.propertyIsEnumerable.call(right, index) || !same(left[index], right[index], depth + 1)) return false;
    }
    return true;
  }
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  const aKeys = Object.keys(a).filter(key => a[key] !== undefined).sort();
  const bKeys = Object.keys(b).filter(key => b[key] !== undefined).sort();
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key, index) => key === bKeys[index] && same(a[key], b[key], depth + 1));
}
export function increment(value: number): number { return integer(value + 1); }
export function mergeSnapshot(current: Attempt, next: Attempt): Attempt {
  for (const key of ['id', 'generation', 'role', 'definition', 'policy', 'binding', 'scored', 'writer', 'receiptId'] as const) {
    if (!same(current[key], next[key])) return fail(`immutable-${key}`);
  }
  if (next.commandSeq < current.commandSeq || next.logicalRevision < current.logicalRevision) return fail('sequence-rollback');
  const semantic = (attempt: Attempt) => {
    const { revision: _revision, commandSeq: _sequence, elapsedMs: _elapsed, ...rest } = attempt;
    return rest;
  };
  if (next.commandSeq === current.commandSeq && !same(semantic(current), semantic(next))) return fail('same-sequence-change');
  if (current.status !== 'playing') {
    const frozen = (attempt: Attempt) => {
      const { revision: _revision, commandSeq: _sequence, selection: _selection, ...rest } = attempt;
      return rest;
    };
    if (!same(frozen(current), frozen(next))) return fail('frozen-attempt');
  }
  if (next.status !== 'playing' && next.status !== 'pending-completion' && next.status !== current.status) return fail('snapshot-status');
  const valueChanged = !same(current.entries, next.entries);
  if (valueChanged && next.logicalRevision <= current.logicalRevision) return fail('logical-revision');
  if (current.pendingDisclosure && !next.pendingDisclosure && current.logicalRevision === next.logicalRevision) return fail('disclosure-removal');
  const merged = structuredClone(next);
  merged.elapsedMs = Math.max(current.elapsedMs, next.elapsedMs);
  merged.assistance = {
    used: current.assistance.used || next.assistance.used,
    exposed: [...new Set([...current.assistance.exposed, ...next.assistance.exposed])].sort((a, b) => a - b),
  };
  return decodeAttempt(merged);
}
