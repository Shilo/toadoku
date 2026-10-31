import { expect, it } from 'vitest';
import type { SessionCommand } from '../../src/lib/session/index.ts';
import { reduceAttempt } from '../../src/lib/session/index.ts';
import { attemptFixture } from './fixtures.ts';

interface Snapshot { entries: number[]; notes: number[]; cell: number }
interface Model {
  entries: number[]; notes: number[]; selection: number; notesMode: boolean;
  history: Snapshot[]; logical: number; sequence: number; elapsed: number;
}

/** Deliberately uses full before snapshots and direct coordinates, never production patches/peers. */
function reference(model: Model, command: SessionCommand): void {
  const beforeEntries = model.entries.slice(), beforeNotes = model.notes.slice();
  const oldSelection = model.selection, oldMode = model.notesMode, oldHistory = model.history.length, oldElapsed = model.elapsed;
  let saveEdit = false;
  if (command.type === 'select') model.selection = command.cell;
  else if (command.type === 'toggle-notes') model.notesMode = !model.notesMode;
  else if (command.type === 'checkpoint') model.elapsed = Math.max(model.elapsed, command.elapsedMs);
  else if (command.type === 'restart') { model.entries.fill(0); model.notes.fill(0); model.history = []; }
  else if (command.type === 'undo') {
    const last = model.history.pop();
    if (last) { model.entries = last.entries; model.notes = last.notes; model.selection = last.cell; }
  } else if (model.selection !== 0 && (command.type === 'enter' || command.type === 'erase')) {
    const cell = model.selection;
    if (command.type === 'erase') { model.entries[cell] = 0; model.notes[cell] = 0; }
    else if (model.notesMode) {
      if (!model.entries[cell]) {
        const digitOn = Math.floor(model.notes[cell] / 2 ** (command.digit - 1)) % 2 === 1;
        model.notes[cell] += (digitOn ? -1 : 1) * 2 ** (command.digit - 1);
      }
    } else if (model.entries[cell] !== command.digit) {
      model.entries[cell] = command.digit; model.notes[cell] = 0;
      const row = Math.floor(cell / 9), col = cell % 9;
      for (let peer = 1; peer < 81; peer++) if (peer !== cell && model.entries[peer] === 0 &&
        (Math.floor(peer / 9) === row || peer % 9 === col ||
         Math.floor(peer / 27) === Math.floor(cell / 27) && Math.floor(peer % 9 / 3) === Math.floor(col / 3))) {
        const bit = 2 ** (command.digit - 1);
        if (Math.floor(model.notes[peer] / bit) % 2 === 1) model.notes[peer] -= bit;
      }
    }
    saveEdit = true;
  }
  const valuesChanged = model.entries.some((value, cell) => value !== beforeEntries[cell]);
  const notesChanged = model.notes.some((value, cell) => value !== beforeNotes[cell]);
  if (saveEdit && (valuesChanged || notesChanged)) {
    model.history.push({ entries: beforeEntries, notes: beforeNotes, cell: oldSelection });
    if (model.history.length > 512) model.history.shift();
  }
  if (valuesChanged) model.logical++;
  if (valuesChanged || notesChanged || model.selection !== oldSelection || model.notesMode !== oldMode ||
      model.history.length !== oldHistory || model.elapsed !== oldElapsed) model.sequence++;
}

it('matches an independent snapshot model across 2000 seeded sequences of 250 commands', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    let random = seed;
    const next = () => { random = (Math.imul(random, 1664525) + 1013904223) >>> 0; return random; };
    let state = attemptFixture();
    state.assistance = { used: true, exposed: [5, 40] };
    const model: Model = { entries: Array(81).fill(0), notes: Array(81).fill(0), selection: 1, notesMode: false, history: [], logical: 0, sequence: 0, elapsed: 0 };
    for (let step = 0; step < 250; step++) {
      const choice = next() % 16;
      const command: SessionCommand = choice < 4 ? { type: 'select', cell: next() % 81 } :
        choice < 9 ? { type: 'enter', digit: next() % 9 + 1 } :
        choice === 9 ? { type: 'toggle-notes' } :
        choice === 10 ? { type: 'erase' } : choice < 14 ? { type: 'undo' } :
        choice === 14 ? { type: 'checkpoint', elapsedMs: next() % 100000 } : { type: 'restart' };
      const result = reduceAttempt(state, command);
      reference(model, command);
      if (result.kind === 'changed') state = result.attempt;
      if (step % 31 === 0) state = structuredClone(state); // persisted/reloaded snapshots use the same semantics
      if (state.entries.some((n, cell) => n !== model.entries[cell]) || state.notes.some((n, cell) => n !== model.notes[cell]) ||
          state.selection !== model.selection || state.notesMode !== model.notesMode || state.commandSeq !== model.sequence ||
          state.logicalRevision !== model.logical || state.undo.length !== model.history.length || state.elapsedMs !== model.elapsed) {
        throw new Error(`Model disagreement seed=${seed} step=${step} command=${JSON.stringify(command)} result=${JSON.stringify(result)} expected=${JSON.stringify(model)}`);
      }
      if (!state.assistance.used || state.assistance.exposed.join(',') !== '5,40' || state.entries[0] !== 0 || state.notes[0] !== 0) {
        throw new Error(`Monotone/clue disagreement seed=${seed} step=${step}`);
      }
    }
  }
}, 120000);
