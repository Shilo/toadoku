import { describe, expect, it } from 'vitest';
import { reduceAttempt } from '../../src/lib/session/reducer.ts';
import type { SessionCommand } from '../../src/lib/session/reducer.ts';
import type { Attempt } from '../../src/lib/gameplay/contracts.ts';
import { attemptFixture } from './fixtures.ts';

function edited(): Attempt {
  const result = reduceAttempt(attemptFixture(), { type: 'enter', digit: 2 });
  if (result.kind !== 'changed') throw Error('Expected a legal control edit');
  return result.attempt;
}
function indexed<T>(values: readonly T[]): T[] {
  const result: T[] = []; for (let index = 0; index < values.length; index++) result.push(values[index]);
  return result;
}
function view(state: Attempt) {
  return { ...state, entries: indexed(state.entries), notes: indexed(state.notes),
    undo: indexed(state.undo).map(patch => ({ cell: patch.cell, changes: indexed(patch.changes).map(change => ({ ...change })) })) };
}
function freeze(value: unknown): void {
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
}
function inherited<T>(values: readonly T[], hook: PropertyKey, callback: () => unknown): T[] {
  class HostArray extends Array<T> {}
  if (hook === 'species') Object.defineProperty(HostArray, Symbol.species, { get: callback });
  else Object.defineProperty(HostArray.prototype, hook, { value: callback });
  const result = new HostArray();
  for (let index = 0; index < values.length; index++) result[index] = values[index];
  return result;
}
type Scenario = { name: string; command: SessionCommand; prepare?: (state: Attempt) => void;
  redirect: (state: Attempt, calls: string[]) => void };
const scenarios: Scenario[] = [
  ...(['entries', 'notes'] as const).map(field => ({ name: `${field} slice`, command: { type: 'undo' as const },
    redirect(state: Attempt, calls: string[]) {
      state[field] = inherited(state[field], 'slice', () => { calls.push('slice'); return Array(81).fill(field === 'entries' ? 9 : 511); });
    } })),
  ...(['entries', 'notes'] as const).map(field => ({ name: `${field} some`, command: { type: 'restart' as const },
    prepare(state: Attempt) {
      state.undo = [];
      if (field === 'notes') { state.entries[1] = 0; state.notes[1] = 4; }
    }, redirect(state: Attempt, calls: string[]) {
      state[field] = inherited(state[field], 'some', () => { calls.push('some'); return false; });
    } })),
  { name: 'history at', command: { type: 'undo' }, redirect(state, calls) {
    const fake = structuredClone(state.undo[0]); fake.changes[0].beforeValue = 3;
    state.undo = inherited(state.undo, 'at', () => { calls.push('at'); return fake; });
  } },
  { name: 'history slice', command: { type: 'enter', digit: 3 }, redirect(state, calls) {
    state.undo = inherited(state.undo, 'slice', () => { calls.push('slice'); return []; });
  } },
  { name: 'changes iterator', command: { type: 'undo' }, redirect(state, calls) {
    const forbidden = { cell: 0, beforeValue: 9, afterValue: 0, beforeNotes: 0, afterNotes: 0 };
    state.undo[0].changes = inherited(state.undo[0].changes, Symbol.iterator, () => {
      calls.push('iterator'); return [forbidden][Symbol.iterator]();
    });
  } },
  ...(['entries', 'notes', 'undo'] as const).map(field => ({ name: `${field} species`, command: { type: 'enter' as const, digit: 3 },
    redirect(state: Attempt, calls: string[]) {
      const trap = () => { calls.push('species'); throw Error('Caller species must not execute'); };
      if (field === 'undo') state.undo = inherited(state.undo, 'species', trap);
      else state[field] = inherited(state[field], 'species', trap);
    } })),
];

describe('session arrays have one indexed meaning', () => {
  for (const scenario of scenarios) it(scenario.name, () => {
    const plain = edited(); scenario.prepare?.(plain);
    const expected = reduceAttempt(plain, scenario.command);
    expect(expected.kind).toBe('changed');
    const state = structuredClone(plain), calls: string[] = [];
    scenario.redirect(state, calls);
    const before = view(state); freeze(state);
    const result = reduceAttempt(state, scenario.command);
    expect(result).toEqual(expected);
    expect(view(state)).toEqual(before); expect(calls).toEqual([]);
    if (result.kind !== 'changed') throw Error('Expected the same successful command as the plain control');
    expect(result.attempt.entries[0]).toBe(0); expect(result.attempt.notes[0]).toBe(0);
    if (scenario.command.type === 'undo') expect(result.attempt.entries[1]).toBe(0);
  });
});
