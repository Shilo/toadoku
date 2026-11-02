import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GameController, TIME_SAVE_INTERVAL_MS } from '../../src/lib/gameplay/game.ts';
import type { HintComputer, StartRequest } from '../../src/lib/gameplay/game.ts';
import type { Attempt, Disclosure, Preferences, Role, StorageResult } from '../../src/lib/gameplay/contracts.ts';
import type { AllocationRequest, CurrentSave, Repository, RestorePreview, RestoreStage } from '../../src/lib/storage/repository.ts';
import type { CatalogLoader } from '../../src/lib/catalog/load.ts';
import type { CatalogManifest } from '../../src/lib/catalog/types.ts';
import type { HintResult } from '../../src/lib/hints/index.ts';
import { computeHint } from '../../src/lib/hints/index.ts';
import { BackupValidationClient } from '../../src/lib/storage/backup-client.ts';
import { attemptFixture } from '../session/fixtures.ts';
import { attempt as oneBlankAttempt, pools, preferences, profile, receipt } from '../storage/fixtures.ts';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function until(predicate: () => boolean): Promise<void> {
  for (let n = 0; n < 100; n++) { if (predicate()) return; await Promise.resolve(); }
  throw new Error('Deferred operation did not reach expected boundary');
}
const committed = <T>(value: T): StorageResult<T> => ({ kind: 'committed', value: structuredClone(value) });

/** Pure deferred ports test coordination only. They do not substitute for Sage's real-IDB cases. */
function harness(initial = attemptFixture()) {
  const manifest = JSON.parse(readFileSync('public/catalog/v1/manifest.json', 'utf8')) as CatalogManifest;
  let now = 0, ids = 0;
  const data: CurrentSave = {
    meta: { generation: initial.generation, essentialRevision: 0 }, preferences: structuredClone(preferences), profile: structuredClone(profile),
    roles: (['quick', 'frontier', 'replay'] as Role[]).map(role => ({ generation: initial.generation, role, revision: 0, lastIntentSeq: 0, ...(role === initial.role ? { attemptId: initial.id } : {}) })),
    attempts: [structuredClone(initial)], pools: pools().map(pool => ({ ...pool, count: manifest.pools[pool.pool].count })),
  };
  const calls = { saves: [] as Attempt[], disclosures: [] as Disclosure[], acquisitions: [] as string[], allocations: [] as AllocationRequest[], reads: 0, catalogInitializations: 0, records: 0, exports: 0, previews: 0, stages: 0, activations: 0, cancellations: 0 };
  let saveWait: Promise<void> | undefined, discloseWait: Promise<void> | undefined, acquireWait: Promise<void> | undefined, preferenceWait: Promise<void> | undefined, allocateWait: Promise<void> | undefined, activationWait: Promise<void> | undefined, exportWait: Promise<void> | undefined, previewWait: Promise<void> | undefined, stageWait: Promise<void> | undefined;
  let saveIssue: Exclude<StorageResult<Attempt>, { kind: 'committed' }> | undefined;
  let acquireIssue: Exclude<StorageResult<Attempt>, { kind: 'committed' }> | undefined;
  let allocateIssue: Exclude<StorageResult<Attempt>, { kind: 'committed' }> | undefined;
  const computations: Promise<HintResult>[] = [];
  const reads: Promise<StorageResult<CurrentSave>>[] = [];
  const hints: HintComputer = { compute: () => computations.shift() ?? Promise.resolve({ kind: 'unavailable', reason: 'invalid' }), cancel: () => {} };
  const repository = {
    durability: 'durable',
    readCurrent: async () => { calls.reads++; return reads.shift() ?? committed(data); },
    acquireWriter: async (_generation: string, id: string, token: string) => {
      calls.acquisitions.push(id); await acquireWait;
      if (acquireIssue) return acquireIssue;
      const attempt = data.attempts.find(item => item.id === id)!;
      attempt.writer = { token, epoch: attempt.writer.epoch + 1 }; attempt.revision++;
      return committed(attempt);
    },
    saveSnapshot: async (_guard: unknown, revision: number, snapshot: Attempt) => {
      calls.saves.push(structuredClone(snapshot)); await saveWait;
      if (saveIssue) return saveIssue;
      const index = data.attempts.findIndex(item => item.id === snapshot.id);
      if (data.attempts[index].revision !== revision) return { kind: 'conflict', reason: 'revision' };
      data.attempts[index] = { ...structuredClone(snapshot), revision: revision + 1 };
      return committed(data.attempts[index]);
    },
    disclose: async (_guard: unknown, disclosure: Disclosure) => {
      calls.disclosures.push(structuredClone(disclosure)); await discloseWait;
      const index = data.attempts.findIndex(item => item.id === disclosure.attemptId), attempt = data.attempts[index];
      data.attempts[index] = { ...attempt, revision: attempt.revision + 1, pendingDisclosure: structuredClone(disclosure), assistance: { used: true, exposed: [...new Set([...attempt.assistance.exposed, ...disclosure.exposed])] } };
      return committed(data.attempts[index]);
    },
    savePreferences: async (_generation: string, value: Preferences) => { await preferenceWait; data.preferences = structuredClone(value); return committed(value); },
    readIssued: async () => committed({}),
    allocate: async (request: AllocationRequest) => {
      calls.allocations.push(structuredClone(request)); await allocateWait;
      if (allocateIssue) return allocateIssue;
      const role = data.roles.find(item => item.role === request.attempt.role)!;
      data.attempts = data.attempts.filter(item => item.role !== request.attempt.role).concat(structuredClone(request.attempt));
      role.attemptId = request.attempt.id; role.revision++; role.lastIntentSeq = request.intent.sequence;
      return committed(request.attempt);
    },
    complete: async (_guard: unknown, _revision: number) => {
      const attempt = data.attempts[0]; const paid = receipt(attempt);
      attempt.status = 'completed'; attempt.receiptId = paid.id; attempt.revision++;
      data.profile.wallet += paid.result.dewdrops; data.profile.lifetimeEarned += paid.result.dewdrops;
      return committed({ attempt, receipt: paid, profile: data.profile });
    },
    exportBackup: async () => { calls.exports++; await exportWait; return committed({ text: '{}', meta: data.meta }); },
    previewRestore: async () => { calls.previews++; await previewWait; return committed({ expected: data.meta } as RestorePreview); },
    cancelBackupWork: () => { calls.cancellations++; },
    stageRestore: async (preview: RestorePreview) => { calls.stages++; await stageWait; return committed({ generation: 'restored-generation', expected: preview.expected }); },
    activateRestore: async (stage: RestoreStage) => {
      calls.activations++; await activationWait; data.meta = { generation: stage.generation, essentialRevision: 0 }; data.attempts = [];
      data.roles = data.roles.map(role => ({ generation: stage.generation, role: role.role, revision: 0, lastIntentSeq: 0 }));
      return committed(data.meta);
    },
    close: () => {},
  } as unknown as Repository;
  const catalog = {
    initialize: async () => { calls.catalogInitializations++; return { kind: 'ready', value: manifest }; },
    getRecord: async () => { calls.records++; return { kind: 'ready', value: initial.definition }; },
    dispose: () => {},
  } as unknown as CatalogLoader;
  const game = new GameController(repository, catalog, hints, () => now, () => `uuid-${++ids}`, () => 0);
  return {
    game, data, calls, computations, reads,
    setNow: (value: number) => { now = value; },
    waits: {
      save: (value?: Promise<void>) => { saveWait = value; }, disclose: (value?: Promise<void>) => { discloseWait = value; },
      acquire: (value?: Promise<void>) => { acquireWait = value; }, preferences: (value?: Promise<void>) => { preferenceWait = value; },
      allocate: (value?: Promise<void>) => { allocateWait = value; },
      activate: (value?: Promise<void>) => { activationWait = value; },
      export: (value?: Promise<void>) => { exportWait = value; }, preview: (value?: Promise<void>) => { previewWait = value; }, stage: (value?: Promise<void>) => { stageWait = value; },
    },
    saveIssue: (value?: typeof saveIssue) => { saveIssue = value; },
    acquireIssue: (value?: typeof acquireIssue) => { acquireIssue = value; },
    allocateIssue: (value?: typeof allocateIssue) => { allocateIssue = value; },
    async reveal() { expect(await game.resume(initial.role)).toBe(true); game.setView({ board: true, visible: true }); },
  };
}

describe('active-only autosave scheduling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('saves idle thinking at the ten-second boundary and has no inactive timer', async () => {
    const h = harness(); await h.reveal();
    try {
      expect(TIME_SAVE_INTERVAL_MS).toBe(10000);
      h.setNow(TIME_SAVE_INTERVAL_MS - 1); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS - 1); expect(h.calls.saves).toHaveLength(0);
      h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(1);
      expect(h.calls.saves.map(a => a.elapsedMs)).toEqual([TIME_SAVE_INTERVAL_MS]);
      const hiddenAt = TIME_SAVE_INTERVAL_MS + 432;
      h.setNow(hiddenAt); h.game.setView({ visible: false }); await vi.advanceTimersByTimeAsync(0);
      expect(h.data.attempts[0].elapsedMs).toBe(hiddenAt); expect(vi.getTimerCount()).toBe(0);
      const resumedAt = hiddenAt + TIME_SAVE_INTERVAL_MS * 2;
      h.setNow(resumedAt); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS * 2); expect(h.calls.saves).toHaveLength(2);
      h.game.setView({ visible: true }); h.setNow(resumedAt + TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS);
      expect(h.data.attempts[0].elapsedMs).toBe(hiddenAt + TIME_SAVE_INTERVAL_MS);
      h.setNow(resumedAt + TIME_SAVE_INTERVAL_MS + 135); h.game.setView({ concealed: true }); await vi.advanceTimersByTimeAsync(0);
      expect(h.data.attempts[0].elapsedMs).toBe(hiddenAt + TIME_SAVE_INTERVAL_MS + 135); expect(vi.getTimerCount()).toBe(0);
      h.game.setView({ board: false }); h.setNow(resumedAt + TIME_SAVE_INTERVAL_MS * 4 + 135); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS * 3);
      expect(h.calls.saves).toHaveLength(4); expect(vi.getTimerCount()).toBe(0);
    } finally { await h.game.dispose(); }
  });

  it('includes exact time in edits without a redundant nearby periodic save', async () => {
    const h = harness(); await h.reveal();
    try {
      const editedAt = TIME_SAVE_INTERVAL_MS - 100;
      h.setNow(editedAt); await vi.advanceTimersByTimeAsync(editedAt);
      h.game.command({ type: 'enter', digit: 2 }); await vi.advanceTimersByTimeAsync(0);
      expect(h.data.attempts[0].elapsedMs).toBe(editedAt); expect(h.data.attempts[0].entries[1]).toBe(2);
      h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(100); expect(h.calls.saves).toHaveLength(1);
      h.setNow(editedAt + TIME_SAVE_INTERVAL_MS - 1); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS - 101); expect(h.calls.saves).toHaveLength(1);
      h.setNow(editedAt + TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(1);
      expect(h.calls.saves.map(a => a.elapsedMs)).toEqual([editedAt, editedAt + TIME_SAVE_INTERVAL_MS]);
    } finally { await h.game.dispose(); }
  });

  it('does not postpone a deadline for read-only checks or noop input', async () => {
    const h = harness(); await h.reveal();
    try {
      h.setNow(TIME_SAVE_INTERVAL_MS - 1000); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS - 1000); expect(await h.game.checkAuthority()).toBe(true);
      expect(h.game.command({ type: 'select', cell: 1 })).toEqual({ kind: 'noop' });
      expect(h.game.command({ type: 'enter', digit: 0 })).toEqual({ kind: 'rejected', reason: 'digit' });
      h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(1000);
      expect(h.calls.saves.map(a => a.elapsedMs)).toEqual([TIME_SAVE_INTERVAL_MS]);
      h.setNow(TIME_SAVE_INTERVAL_MS * 2 - 1000); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS - 1000); expect(await h.game.checkAuthority()).toBe(true);
      h.setNow(TIME_SAVE_INTERVAL_MS * 2); await vi.advanceTimersByTimeAsync(1000);
      expect(h.calls.saves.map(a => a.elapsedMs)).toEqual([TIME_SAVE_INTERVAL_MS, TIME_SAVE_INTERVAL_MS * 2]);
    } finally { await h.game.dispose(); }
  });

  it('drains a cursor on hide even when elapsed time is unchanged', async () => {
    const h = harness(); await h.reveal();
    try {
      h.game.command({ type: 'select', cell: 2 });
      expect(h.game.state.saveState).toBe('pending'); expect(h.calls.saves).toHaveLength(0);
      h.game.setView({ visible: false }); await vi.advanceTimersByTimeAsync(0);
      expect(h.data.attempts[0].selection).toBe(2); expect(h.game.state.saveState).toBe('saved');
      expect(vi.getTimerCount()).toBe(0);
    } finally { await h.game.dispose(); }
  });

  it('stops periodic work on failure and includes the failed interval on retry', async () => {
    const h = harness(); await h.reveal();
    try {
      h.saveIssue({ kind: 'unavailable', reason: 'quota' }); h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS);
      expect(h.game.state.saveState).toBe('unsaved'); expect(vi.getTimerCount()).toBe(0);
      h.setNow(TIME_SAVE_INTERVAL_MS * 3); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS * 2); expect(h.calls.saves).toHaveLength(1);
      h.game.command({ type: 'enter', digit: 2 }); expect(h.calls.saves).toHaveLength(1);
      h.setNow(TIME_SAVE_INTERVAL_MS * 3 + 1123); h.saveIssue(); expect(await h.game.retry()).toBe(true);
      expect(h.data.attempts[0].elapsedMs).toBe(TIME_SAVE_INTERVAL_MS * 3 + 1123); expect(h.data.attempts[0].entries[1]).toBe(2);
      expect(vi.getTimerCount()).toBe(1);
    } finally { await h.game.dispose(); }
  });

  it('rejects stale ownership on the next periodic save without committing it', async () => {
    const h = harness(); await h.reveal();
    try {
      const before = structuredClone(h.data); h.saveIssue({ kind: 'conflict', reason: 'owner' });
      h.setNow(TIME_SAVE_INTERVAL_MS - 1); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS - 1); expect(h.game.state.owned).toBe(true);
      h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(1);
      expect(h.game.state.owned).toBe(false); expect(h.game.state.canStudy).toBe(false);
      expect(h.data).toEqual(before); expect(vi.getTimerCount()).toBe(0);
    } finally { await h.game.dispose(); }
  });

  it('cancels the timer throughout a held barrier and rearms after its noop tail', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.acquire(gate.promise);
    try {
      const resumed = h.game.resume('quick'); await until(() => h.calls.acquisitions.length === 2);
      expect(vi.getTimerCount()).toBe(0);
      h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS); expect(h.calls.saves).toHaveLength(0);
      gate.resolve(); expect(await resumed).toBe(true); await vi.advanceTimersByTimeAsync(0);
      expect(h.data.attempts[0].elapsedMs).toBe(TIME_SAVE_INTERVAL_MS); expect(vi.getTimerCount()).toBe(1);
      h.setNow(TIME_SAVE_INTERVAL_MS * 2); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS); expect(h.data.attempts[0].elapsedMs).toBe(TIME_SAVE_INTERVAL_MS * 2);
    } finally { gate.resolve(); await h.game.dispose(); }
  });

  it('captures exact completion time between checkpoints and has no completed timer', async () => {
    const initial = oneBlankAttempt(), h = harness(initial); await h.reveal();
    try {
      h.setNow(1234); await vi.advanceTimersByTimeAsync(1234);
      h.game.command({ type: 'enter', digit: Number(initial.definition.solution[0]) });
      await until(() => h.game.state.completionEvent === 1);
      expect(h.game.state.receipt?.result.elapsedMs).toBe(1234); expect(vi.getTimerCount()).toBe(0);
      const writes = h.calls.saves.length; h.setNow(61234); await vi.advanceTimersByTimeAsync(60000);
      expect(h.calls.saves).toHaveLength(writes);
      h.game.command({ type: 'select', cell: 2 }); h.game.setView({ board: false }); await vi.advanceTimersByTimeAsync(0);
      expect(h.data.attempts[0].selection).toBe(2); expect(vi.getTimerCount()).toBe(0);
    } finally { await h.game.dispose(); }
  });

  it('publishes newer elapsed time and commands while an older save remains pending', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.save(gate.promise);
    const observed: { elapsedMs: number; selection: number; digit: number; pending: boolean }[] = [];
    const unsubscribe = h.game.subscribe(state => {
      if (state.attempt) observed.push({ elapsedMs: state.attempt.elapsedMs, selection: state.attempt.selection,
        digit: state.attempt.entries[1], pending: state.saveState === 'pending' });
    });
    try {
      h.setNow(TIME_SAVE_INTERVAL_MS); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS);
      expect(h.calls.saves).toHaveLength(1);
      expect(observed.at(-1)).toMatchObject({ elapsedMs: TIME_SAVE_INTERVAL_MS, pending: true });
      h.setNow(TIME_SAVE_INTERVAL_MS * 2); await vi.advanceTimersByTimeAsync(TIME_SAVE_INTERVAL_MS);
      expect(h.calls.saves).toHaveLength(1);
      expect(observed.at(-1)).toMatchObject({ elapsedMs: TIME_SAVE_INTERVAL_MS * 2, pending: true });
      h.game.command({ type: 'enter', digit: 2 });
      expect(observed.at(-1)).toMatchObject({ digit: 2, pending: true });
      h.game.command({ type: 'select', cell: 2 });
      expect(observed.at(-1)).toMatchObject({ selection: 2, digit: 2, pending: true });
      const beforeAcknowledgement = observed.length;
      gate.resolve(); await h.game.flush();
      expect(observed.slice(beforeAcknowledgement).every(value => value.elapsedMs === TIME_SAVE_INTERVAL_MS * 2 && value.selection === 2 && value.digit === 2)).toBe(true);
      expect(observed.at(-1)?.pending).toBe(false);
      expect(h.data.attempts[0]).toMatchObject({ elapsedMs: TIME_SAVE_INTERVAL_MS * 2, selection: 2 });
    } finally { gate.resolve(); unsubscribe(); await h.game.dispose(); }
  });
});

describe('verified reload preparation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('freezes synchronously, drains held edits and verifies their full acknowledged readback', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.save(gate.promise);
    try {
      h.setNow(123); h.game.command({ type: 'enter', digit: 2 });
      await until(() => h.calls.saves.length === 1);
      h.setNow(456); const prepared = h.game.prepareReload();
      expect(h.game.state.busy).toBe(true); expect(h.game.state.canStudy).toBe(false); expect(vi.getTimerCount()).toBe(0);
      expect(h.game.command({ type: 'enter', digit: 3 })).toEqual({ kind: 'rejected', reason: 'frozen' });
      expect(await h.game.preferences({ ...preferences, language: 'de' })).toBe(false);
      h.setNow(5000); gate.resolve(); expect(await prepared).toBe(true);
      expect(h.data.attempts[0]).toMatchObject({ elapsedMs: 456, entries: h.game.state.attempt?.entries });
      expect(h.game.state.busy).toBe(true); expect(h.game.state.canStudy).toBe(false);
      h.setNow(6000); h.game.cancelReload();
      expect(h.game.state.busy).toBe(false); expect(h.game.state.canStudy).toBe(true);
      h.setNow(6100); h.game.checkpoint(); await h.game.flush();
      expect(h.data.attempts[0].elapsedMs).toBe(556);
    } finally { gate.resolve(); h.game.cancelReload(); await h.game.dispose(); }
  });

  it('accepts newer meta revisions from acknowledged writes without comparing stale saved attempts', async () => {
    const h = harness(); await h.reveal();
    try {
      h.setNow(321); h.game.command({ type: 'enter', digit: 2 }); await h.game.flush();
      expect(h.game.state.save?.attempts[0].entries[1]).not.toBe(2);
      h.data.meta.essentialRevision += 4;
      expect(await h.game.prepareReload()).toBe(true);
      expect(h.game.state.save?.meta.essentialRevision).toBe(4);
    } finally { h.game.cancelReload(); await h.game.dispose(); }
  });

  it.each(['entries', 'notes', 'elapsed', 'revision', 'sequence', 'role-binding', 'meta'] as const)(
    'refuses mismatched %s readback and retains local recovery', async mismatch => {
      const h = harness(); await h.reveal();
      try {
        const readback = structuredClone(h.data);
        if (mismatch === 'entries') readback.attempts[0].entries[1] = 7;
        if (mismatch === 'notes') readback.attempts[0].notes[1] = 1;
        if (mismatch === 'elapsed') readback.attempts[0].elapsedMs++;
        if (mismatch === 'revision') readback.attempts[0].revision++;
        if (mismatch === 'sequence') readback.attempts[0].commandSeq++;
        if (mismatch === 'role-binding') readback.roles[0].attemptId = 'other-attempt';
        if (mismatch === 'meta') readback.meta.essentialRevision = -1;
        h.reads.push(Promise.resolve(committed(readback)));
        expect(await h.game.prepareReload()).toBe(false);
        expect(h.game.state.busy).toBe(false);
        expect(JSON.parse(h.game.exportRecovery().text).localAttempt.id).toBe(h.data.attempts[0].id);
        expect(vi.getTimerCount()).toBe(0);
      } finally { h.game.cancelReload(); await h.game.dispose(); }
    });

  it('retains legitimate changes to preferences, profile and another role metadata from a second window', async () => {
    const h = harness(); await h.reveal();
    try {
      const readback = structuredClone(h.data);
      readback.preferences.language = 'de'; readback.profile.wallet += 10;
      readback.roles[1].revision++;
      readback.meta.essentialRevision++;
      h.reads.push(Promise.resolve(committed(readback)));
      expect(await h.game.prepareReload()).toBe(true);
      expect(h.game.state.save).toEqual(readback);
      expect(h.game.state.owned).toBe(true);
    } finally { h.game.cancelReload(); await h.game.dispose(); }
  });

  it('rejects lost ownership without acquiring a writer or resuming the board', async () => {
    const h = harness(); await h.reveal();
    try {
      const readback = structuredClone(h.data); readback.attempts[0].writer.epoch++;
      h.reads.push(Promise.resolve(committed(readback)));
      expect(await h.game.prepareReload()).toBe(false);
      expect(h.game.state.owned).toBe(false); expect(h.game.state.canStudy).toBe(false);
      expect(h.calls.acquisitions).toHaveLength(1);
    } finally { await h.game.dispose(); }
  });

  it('preserves pause when cancelled and permits a menu-only verified reload', async () => {
    const h = harness(); await h.reveal();
    try {
      h.setNow(234); h.game.setView({ concealed: true }); await h.game.flush();
      expect(await h.game.prepareReload()).toBe(true); h.game.cancelReload();
      expect(h.game.state.canStudy).toBe(false); expect(vi.getTimerCount()).toBe(0);
    } finally { await h.game.dispose(); }
    const menu = harness();
    try {
      expect(await menu.game.initialize()).toBe(true);
      expect(await menu.game.prepareReload()).toBe(true);
      expect(menu.calls.acquisitions).toHaveLength(0);
    } finally { menu.game.cancelReload(); await menu.game.dispose(); }
  });

  it('allows a clean unowned menu to adopt the newer owner without acquiring or overwriting its old RAM board', async () => {
    const h = harness(); await h.reveal();
    try {
      h.setNow(123); h.game.command({ type: 'enter', digit: 2 }); await h.game.flush();
      h.game.setView({ board: false }); await h.game.flush();
      const old = structuredClone(h.game.state.attempt);
      h.data.attempts[0].writer.epoch++; h.data.attempts[0].entries[1] = 3;
      expect(await h.game.checkAuthority()).toBe(false);
      expect(await h.game.prepareReload()).toBe(true);
      expect(h.game.state.save?.attempts[0].entries[1]).toBe(3);
      expect(h.game.state.attempt).toEqual(old);
      expect(h.calls.acquisitions).toHaveLength(1);
      h.game.cancelReload(); expect(h.game.state.canStudy).toBe(false); expect(vi.getTimerCount()).toBe(0);
    } finally { h.game.cancelReload(); await h.game.dispose(); }
  });

  it('refuses an unowned visible board and a dirty ownership-conflict menu', async () => {
    const h = harness(); await h.reveal();
    try {
      h.data.attempts[0].writer.epoch++;
      expect(await h.game.checkAuthority()).toBe(false);
      expect(await h.game.prepareReload()).toBe(false);
    } finally { await h.game.dispose(); }
    const dirty = harness(); await dirty.reveal();
    try {
      dirty.saveIssue({ kind: 'conflict', reason: 'owner' }); dirty.game.command({ type: 'enter', digit: 2 });
      await until(() => dirty.game.state.conflictedChanges === true);
      dirty.game.setView({ board: false }); expect(await dirty.game.prepareReload()).toBe(false);
      expect(JSON.parse(dirty.game.exportRecovery().text).localAttempt.entries[1]).toBe(2);
    } finally { await dirty.game.dispose(); }
  });

  it('refuses an earlier preferences write and blocks later preferences until cancellation', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.preferences(gate.promise);
    try {
      const changed = h.game.preferences({ ...preferences, language: 'de' });
      expect(await h.game.prepareReload()).toBe(false); expect(h.game.state.busy).toBe(false);
      gate.resolve(); expect(await changed).toBe(true);
      expect(await h.game.prepareReload()).toBe(true);
      expect(await h.game.preferences({ ...preferences, language: 'es' })).toBe(false);
      expect(h.data.preferences.language).toBe('de');
      h.game.cancelReload(); expect(await h.game.preferences({ ...preferences, language: 'es' })).toBe(true);
    } finally { gate.resolve(); h.game.cancelReload(); await h.game.dispose(); }
  });

  it('refuses busy, computing, ephemeral and pending-completion states', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.acquire(gate.promise);
    try {
      const resumed = h.game.resume('quick'); await until(() => h.calls.acquisitions.length === 2);
      expect(await h.game.prepareReload()).toBe(false); gate.resolve(); expect(await resumed).toBe(true);
      Object.assign(h.game.repository, { durability: 'ephemeral' }); expect(await h.game.prepareReload()).toBe(false);
      Object.assign(h.game.repository, { durability: 'durable' });
      const computation = deferred<HintResult>(); h.computations.push(computation.promise);
      const hint = h.game.requestHint('logical'); expect(await h.game.prepareReload()).toBe(false);
      computation.resolve({ kind: 'unavailable', reason: 'invalid' }); await hint;
    } finally { gate.resolve(); await h.game.dispose(); }
    const initial = oneBlankAttempt(), pending = harness(initial), finalSave = deferred<void>(); await pending.reveal();
    try {
      pending.waits.save(finalSave.promise);
      pending.game.command({ type: 'enter', digit: Number(initial.definition.solution[0]) });
      expect(pending.game.state.attempt?.status).toBe('pending-completion');
      expect(await pending.game.prepareReload()).toBe(false);
      finalSave.resolve(); await until(() => pending.game.state.completionEvent === 1);
    } finally { finalSave.resolve(); await pending.game.dispose(); }
  });

  it('unfreezes after a failed read and invalidates an earlier cancelled preparation', async () => {
    const h = harness(); await h.reveal();
    try {
      h.reads.push(Promise.resolve({ kind: 'unavailable', reason: 'closed' })); expect(await h.game.prepareReload()).toBe(false);
      expect(h.game.state.busy).toBe(false); expect(h.game.state.canStudy).toBe(true);
      const gate = deferred<void>(); h.waits.save(gate.promise); h.setNow(987);
      const prepared = h.game.prepareReload(); await until(() => h.calls.saves.length === 1);
      h.game.cancelReload(); h.game.command({ type: 'enter', digit: 2 }); gate.resolve();
      expect(await prepared).toBe(false); await h.game.flush();
      expect(h.game.state.busy).toBe(false); expect(h.data.attempts[0].entries[1]).toBe(2);
    } finally { h.game.cancelReload(); await h.game.dispose(); }
  });
});

describe('independent integrated controller interleavings', () => {
  it('waits for durable disclosure, counts barrier thinking time and preserves newest notes/time', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.disclose(gate.promise);
    h.setNow(100); const request = h.game.requestHint('reveal');
    await until(() => h.calls.disclosures.length === 1);
    expect(h.game.state.hint).toBeUndefined(); expect(h.game.state.attempt?.assistance.used).toBe(false);
    h.setNow(1100); h.game.checkpoint();
    expect(h.game.command({ type: 'enter', digit: 2 })).toEqual({ kind: 'rejected', reason: 'frozen' });
    gate.resolve(); expect(await request).toBe(true);
    await until(() => h.game.state.saveState === 'saved');
    expect(h.game.state.hint?.kind).toBe('reveal'); expect(h.game.state.attempt?.elapsedMs).toBe(1100);
    expect(h.data.attempts[0].assistance).toEqual({ used: true, exposed: [1] });
    await h.game.dispose();
  });
  it('rebases a delayed logical hint across harmless note and time edits', async () => {
    const initial = oneBlankAttempt(); initial.selection = 0;
    const h = harness(initial); await h.reveal(); const gate = deferred<HintResult>(); h.computations.push(gate.promise);
    const request = h.game.requestHint('logical');
    expect(h.game.command({ type: 'toggle-notes' }).kind).toBe('changed');
    expect(h.game.command({ type: 'enter', digit: 3 }).kind).toBe('changed');
    h.setNow(2000); h.game.checkpoint();
    gate.resolve(computeHint({ values: [...initial.definition.givens].map(Number), givens: [...initial.definition.givens].map(Number), logicalRevision: 0, target: 0 }));
    expect(await request).toBe(true); await until(() => h.game.state.saveState === 'saved');
    expect(h.game.state.attempt?.notes[0]).toBe(4); expect(h.game.state.attempt?.elapsedMs).toBe(2000);
    expect(h.game.state.attempt?.logicalRevision).toBe(0); expect(h.data.attempts[0].assistance.exposed).toEqual([0]);
    await h.game.dispose();
  });
  it('cancels stale work without trapping hint state or clearing a newer request', async () => {
    const h = harness(); await h.reveal(); const first = deferred<HintResult>(), second = deferred<HintResult>();
    h.computations.push(first.promise, second.promise);
    const a = h.game.requestHint('logical'); expect(h.game.state.hintComputing).toBe(true);
    expect(h.game.command({ type: 'enter', digit: 2 }).kind).toBe('changed');
    expect(h.game.state.hintComputing).toBe(false);
    const b = h.game.requestHint('logical'); expect(h.game.state.hintComputing).toBe(true);
    first.reject(new Error('late worker rejection')); expect(await a).toBe(false);
    expect(h.game.state.hintComputing).toBe(true);
    second.resolve({ kind: 'unavailable', reason: 'budget' }); expect(await b).toBe(false);
    expect(h.game.state.hintComputing).toBe(false); expect(h.calls.disclosures).toHaveLength(0);
    await h.game.dispose();
  });
  it('cancels context-left hint computation before any disclosure starts', async () => {
    const initial = oneBlankAttempt(), h = harness(initial); await h.reveal(); const gate = deferred<HintResult>(); h.computations.push(gate.promise);
    const request = h.game.requestHint('logical'); h.game.cancelHint(); h.game.setView({ board: false });
    gate.resolve(computeHint({ values: [...initial.definition.givens].map(Number), givens: [...initial.definition.givens].map(Number), logicalRevision: 0, target: 0 }));
    expect(await request).toBe(false); expect(h.calls.disclosures).toHaveLength(0); expect(h.game.state.hint).toBeUndefined();
    expect(h.game.state.attempt?.assistance.used).toBe(false); expect(h.game.state.canStudy).toBe(false); await h.game.dispose();
  });
  it('retains recoverable disclosure already committing when context leaves without revealing the board', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.disclose(gate.promise);
    const request = h.game.requestHint('reveal'); await until(() => h.calls.disclosures.length === 1);
    h.game.cancelHint(); h.game.setView({ board: false }); gate.resolve(); expect(await request).toBe(true);
    expect(h.game.state.canStudy).toBe(false); expect(h.game.state.attempt?.assistance).toEqual({ used: true, exposed: [1] });
    expect(h.game.state.attempt?.pendingDisclosure?.payload).toEqual({ kind: 'reveal', logicalRevision: 0, cell: 1, digit: 2 });
    expect(h.data.attempts[0].pendingDisclosure?.payload).toEqual(h.game.state.attempt?.pendingDisclosure?.payload); await h.game.dispose();
  });
  it('requires explicit reveal after an unsupported logical step and recovers from worker rejection', async () => {
    const h = harness(); await h.reveal();
    h.computations.push(Promise.reject(new Error('worker failed')));
    expect(await h.game.requestHint('logical')).toBe(false); expect(h.game.state.hintComputing).toBe(false);
    h.computations.push(Promise.resolve({ kind: 'ready', payload: { kind: 'reveal', logicalRevision: 0, cell: 1, digit: 2 } }));
    expect(await h.game.requestHint('logical')).toBe(false);
    expect(h.game.state.problem).toBe('hint-unavailable:reveal-choice'); expect(h.calls.disclosures).toHaveLength(0);
    expect(await h.game.requestHint('reveal')).toBe(true); expect(h.calls.disclosures).toHaveLength(1);
    await h.game.dispose();
  });
  it('recovers committed payload only after ownership, never highlights stale historical proof', async () => {
    const initial = attemptFixture(); initial.assistance = { used: true, exposed: [1] };
    initial.pendingDisclosure = { id: 'paid-help', attemptId: initial.id, logicalRevision: 0, exposed: [1], information: true, payload: { kind: 'reveal', logicalRevision: 0, cell: 1, digit: 2 } };
    const h = harness(initial), gate = deferred<void>(); h.waits.acquire(gate.promise);
    const resumed = h.game.resume('quick'); await until(() => h.calls.acquisitions.length === 1);
    expect(h.game.state.hint).toBeUndefined(); expect(h.game.state.canStudy).toBe(false);
    gate.resolve(); expect(await resumed).toBe(true); expect(h.game.state.hint).toEqual(initial.pendingDisclosure.payload);
    expect(h.game.state.canStudy).toBe(false); h.game.setView({ board: true }); expect(h.game.state.canStudy).toBe(true);
    await h.game.dispose();
    initial.commandSeq = 1; initial.logicalRevision = 1;
    const stale = harness(initial); await stale.reveal(); expect(stale.game.state.hint).toBeUndefined(); expect(stale.game.state.attempt?.assistance.used).toBe(true); await stale.game.dispose();
  });
  it('conceals after authority failure and retains local unsaved progress', async () => {
    const h = harness(); await h.reveal(); h.saveIssue({ kind: 'conflict', reason: 'owner' });
    h.game.command({ type: 'enter', digit: 2 }); await until(() => h.game.state.saveState === 'unsaved');
    expect(h.game.state.canStudy).toBe(false); expect(h.game.state.owned).toBe(false); expect(h.game.state.attempt?.entries[1]).toBe(2);
    expect(h.game.command({ type: 'enter', digit: 3 })).toEqual({ kind: 'rejected', reason: 'frozen' });
    await h.game.dispose();
  });
  it('replaces conflicted RAM only after explicit saved-role acquisition acknowledges', async () => {
    const initial = attemptFixture(); initial.assistance = { used: true, exposed: [1] };
    const h = harness(initial); await h.reveal(); h.saveIssue({ kind: 'conflict', reason: 'owner' });
    h.game.command({ type: 'enter', digit: 2 }); await until(() => h.game.state.conflictedChanges === true);
    expect(await h.game.resume('quick')).toBe(false); expect(h.calls.acquisitions).toHaveLength(1);
    const latest = attemptFixture(); latest.id = 'latest-durable'; latest.entries[1] = 3; latest.commandSeq = 1; latest.logicalRevision = 1; latest.elapsedMs = 100;
    latest.writer = { token: 'other-writer', epoch: 9 };
    h.data.attempts = [latest]; h.data.roles.find(role => role.role === 'quick')!.attemptId = latest.id;
    const gate = deferred<void>(); h.waits.acquire(gate.promise);
    const resumed = h.game.resumeSaved('quick'); await until(() => h.calls.acquisitions.length === 2);
    expect(h.game.state.attempt?.id).toBe(initial.id); expect(h.game.state.attempt?.entries[1]).toBe(2);
    expect(h.game.state.canStudy).toBe(false); expect(JSON.parse(h.game.exportRecovery().text).localAttempt.entries[1]).toBe(2);
    gate.resolve(); expect(await resumed).toBe(true);
    expect(h.game.state.attempt?.id).toBe(latest.id); expect(h.game.state.attempt?.entries[1]).toBe(3);
    expect(h.game.state.attempt?.assistance).toEqual({ used: false, exposed: [] }); expect(h.game.state.attempt?.scored).toBe(latest.scored);
    expect(h.game.state.conflictedChanges).toBe(false); expect(h.game.state.attempt?.writer.epoch).toBe(10);
    await h.game.dispose();
  });
  it('preserves conflicted RAM when latest role is missing or acquisition fails', async () => {
    for (const failure of ['missing-role', 'closed-acquisition'] as const) {
      const h = harness(); await h.reveal(); h.saveIssue({ kind: 'conflict', reason: 'owner' });
      h.game.command({ type: 'enter', digit: 2 }); await until(() => h.game.state.conflictedChanges === true);
      if (failure === 'missing-role') {
        h.data.attempts = []; delete h.data.roles.find(role => role.role === 'quick')!.attemptId;
      } else h.acquireIssue({ kind: 'unavailable', reason: 'closed' });
      expect(await h.game.resumeSaved('quick')).toBe(false); expect(h.game.state.attempt?.entries[1]).toBe(2);
      expect(h.game.state.owned).toBe(false); expect(h.game.state.conflictedChanges).toBe(true);
      expect(JSON.parse(h.game.exportRecovery().text).localAttempt.entries[1]).toBe(2); await h.game.dispose();
    }
  });
  it('never uses explicit conflict recovery to bypass quota, corruption or future schema failures', async () => {
    for (const issue of [{ kind: 'unavailable', reason: 'quota' }, { kind: 'corrupt', reason: 'state' }, { kind: 'unsupported-future', reason: 'schema' }] as const) {
      const h = harness(); await h.reveal(); h.saveIssue(issue); h.game.command({ type: 'enter', digit: 2 });
      await until(() => h.game.state.saveState === 'unsaved');
      expect(h.game.state.conflictedChanges).toBe(false); expect(await h.game.resumeSaved('quick')).toBe(false);
      expect(h.calls.acquisitions).toHaveLength(1); expect(h.game.state.attempt?.entries[1]).toBe(2); await h.game.dispose();
    }
  });
  it('exports newest RAM recovery during quota failure without database reads or reward promotion', async () => {
    const initial = attemptFixture(); initial.assistance = { used: true, exposed: [5] };
    const h = harness(initial); await h.reveal(); h.saveIssue({ kind: 'unavailable', reason: 'quota' });
    h.game.command({ type: 'enter', digit: 2 });
    h.game.command({ type: 'select', cell: 2 }); h.game.command({ type: 'toggle-notes' }); h.game.command({ type: 'enter', digit: 4 });
    h.setNow(1200); h.game.checkpoint(); await until(() => h.game.state.saveState === 'unsaved');
    const unchanged = structuredClone(h.game.state.attempt), durable = structuredClone(h.data), saves = h.calls.saves.length;
    const unread = deferred<StorageResult<CurrentSave>>(); h.reads.push(unread.promise);
    h.setNow(2200); const exported = h.game.exportRecovery(); const artifact = JSON.parse(exported.text);
    expect(artifact.kind).toBe('toadodu-emergency-recovery'); expect(artifact.importableBackup).toBe(false);
    expect(artifact.durableReadback).toBe('not-requested'); expect(artifact.saveState).toBe('unsaved');
    expect(artifact.localAttempt.entries[1]).toBe(2); expect(artifact.localAttempt.notes[2]).toBe(8);
    expect(artifact.localAttempt.assistance).toEqual({ used: true, exposed: [5] }); expect(artifact.localAttempt.elapsedMs).toBe(2200);
    expect(artifact.localAttempt.scored).toBe(true); expect(artifact.lastKnownSave.profile.wallet).toBe(0);
    expect(h.game.state.attempt).toEqual(unchanged); expect(h.data).toEqual(durable); expect(h.calls.saves).toHaveLength(saves);
    expect(h.reads).toHaveLength(1); expect(h.game.state.receipt).toBeUndefined(); expect(h.game.state.completionEvent).toBe(0);
    expect(new TextEncoder().encode(exported.text).byteLength).toBeLessThanOrEqual(2 * 1024 * 1024);
    // Same semantic decoder as the browser worker, exercised through its Node-only port.
    const validator = new BackupValidationClient(); let verified = false;
    expect(await validator.validate(exported.text, async () => { verified = true; return true; })).toEqual({ kind: 'corrupt', reason: 'backup-field' });
    expect(verified).toBe(false); await h.game.dispose();
  });
  it('does not replace newer profile state after a delayed preference acknowledgement', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.preferences(gate.promise);
    const saved = h.game.preferences({ ...preferences, language: 'de' });
    h.data.profile.wallet = 400; h.data.profile.lifetimeEarned = 400; await h.game.initialize();
    gate.resolve(); expect(await saved).toBe(true); expect(h.game.state.save?.profile.wallet).toBe(400); expect(h.game.state.save?.preferences.language).toBe('de');
    await h.game.dispose();
  });
  it('flushes the prior role before attaching another role and retains its exact progress', async () => {
    const h = harness();
    const frontier = attemptFixture(); frontier.id = 'frontier-attempt'; frontier.role = 'frontier'; frontier.binding = structuredClone(profile.frontier);
    h.data.attempts.push(frontier); h.data.roles.find(role => role.role === 'frontier')!.attemptId = frontier.id;
    await h.reveal(); const gate = deferred<void>(); h.waits.save(gate.promise);
    h.game.command({ type: 'enter', digit: 2 }); await until(() => h.calls.saves.length === 1);
    const resumed = h.game.resume('frontier'); await Promise.resolve();
    expect(h.calls.acquisitions).toEqual(['attempt-test']); expect(h.game.state.attempt?.id).toBe('attempt-test');
    h.waits.save(undefined); gate.resolve(); expect(await resumed).toBe(true);
    expect(h.game.state.attempt?.id).toBe('frontier-attempt'); expect(h.data.attempts.find(attempt => attempt.role === 'quick')?.entries[1]).toBe(2);
    await h.game.dispose();
  });
  it('freezes at the final valid entry and excludes later storage drain time', async () => {
    const initial = oneBlankAttempt(); initial.selection = 0;
    const h = harness(initial); await h.reveal(); const gate = deferred<void>(); h.waits.save(gate.promise);
    h.setNow(100); expect(h.game.command({ type: 'enter', digit: Number(initial.definition.solution[0]) }).kind).toBe('changed');
    await until(() => h.calls.saves.length === 1); h.setNow(1600); h.waits.save(undefined); gate.resolve();
    await until(() => !!h.game.state.receipt);
    expect(h.game.state.attempt?.status).toBe('completed'); expect(h.game.state.receipt?.result.elapsedMs).toBe(100);
    expect(h.game.state.completionEvent).toBe(1); expect(h.game.command({ type: 'undo' })).toEqual({ kind: 'rejected', reason: 'frozen' });
    await h.game.dispose();
  });
  it('publishes committed replay status and wallet together while retaining the other active role', async () => {
    const initial = oneBlankAttempt(); initial.role = 'replay';
    initial.binding = { runId: 'run-two', metamorphosis: 2, leap: 60, scheduleVersion: 1 };
    const h = harness(initial);
    h.data.profile.frontier = { ...initial.binding, leap: 1 }; h.data.profile.highestCompletedLeap = 60;
    const frontier = attemptFixture(); frontier.id = 'other-frontier'; frontier.role = 'frontier'; frontier.binding = structuredClone(h.data.profile.frontier);
    h.data.attempts.push(frontier); h.data.roles.find(role => role.role === 'frontier')!.attemptId = frontier.id;
    await h.reveal(); const untouched = structuredClone({ frontier: h.game.state.save!.attempts[1], pools: h.game.state.save!.pools, roles: h.game.state.save!.roles });
    const mismatches: string[] = [];
    const unsubscribe = h.game.subscribe(state => {
      if (state.attempt?.status !== 'completed') return;
      const replay = state.save?.attempts.find(attempt => attempt.id === initial.id);
      if (replay?.status !== 'completed' || replay.receiptId !== state.attempt.receiptId || state.save!.profile.wallet <= 0) mismatches.push('Completion split across published snapshots');
    });
    h.game.command({ type: 'enter', digit: Number(initial.definition.solution[0]) }); await until(() => !!h.game.state.receipt);
    expect(mismatches).toEqual([]); expect(h.game.state.save?.attempts.find(attempt => attempt.role === 'replay')?.status).toBe('completed');
    expect(h.game.state.save?.attempts.find(attempt => attempt.role === 'replay')?.receiptId).toBe(h.game.state.receipt?.id);
    expect({ frontier: h.game.state.save!.attempts[1], pools: h.game.state.save!.pools, roles: h.game.state.save!.roles }).toEqual(untouched);
    expect(h.game.state.save?.profile.wallet).toBe(h.game.state.receipt?.result.dewdrops);
    unsubscribe(); await h.game.dispose();
  });
  it('keeps a solved last entry frozen through quota failure and retries the same identity', async () => {
    const initial = oneBlankAttempt(), h = harness(initial); await h.reveal();
    h.saveIssue({ kind: 'unavailable', reason: 'quota' }); h.setNow(125);
    expect(h.game.command({ type: 'enter', digit: Number(initial.definition.solution[0]) }).kind).toBe('changed');
    expect(h.game.state.attempt?.status).toBe('pending-completion');
    await until(() => !h.game.state.busy && h.game.state.saveState === 'unsaved');
    expect(h.game.state.receipt).toBeUndefined(); expect(h.data.profile.wallet).toBe(0);
    expect(h.game.state.canStudy).toBe(true); // Frozen review is readable, never editable or timed.
    expect(h.game.command({ type: 'undo' })).toEqual({ kind: 'rejected', reason: 'frozen' });
    expect(h.game.command({ type: 'enter', digit: 9 })).toEqual({ kind: 'rejected', reason: 'frozen' });
    h.setNow(50_000); h.game.checkpoint(); expect(h.game.state.attempt?.elapsedMs).toBe(125);
    h.saveIssue(); expect(await h.game.retry()).toBe(true);
    expect(h.game.state.receipt?.attemptId).toBe(initial.id); expect(h.game.state.receipt?.result.elapsedMs).toBe(125);
    expect(h.game.state.completionEvent).toBe(1); expect(h.calls.saves.every(snapshot => snapshot.status === 'pending-completion')).toBe(true);
    await h.game.dispose();
  });
  it('publishes the final entry only as frozen even to a reentrant observer', async () => {
    const initial = oneBlankAttempt(), h = harness(initial); await h.reveal();
    const observed: string[] = [], replies: ReturnType<GameController['command']>[] = [];
    let attacked = false;
    const unsubscribe = h.game.subscribe(state => {
      if (state.attempt?.entries[0] !== Number(initial.definition.solution[0])) return;
      observed.push(state.attempt.status);
      if (!attacked) {
        attacked = true;
        replies.push(h.game.command({ type: 'select', cell: 1 }));
        replies.push(h.game.command({ type: 'undo' }));
      }
    });
    h.game.command({ type: 'enter', digit: Number(initial.definition.solution[0]) });
    await until(() => !!h.game.state.receipt);
    expect(observed.length).toBeGreaterThan(0); expect(observed).not.toContain('playing');
    expect(replies.map(reply => reply.kind)).toEqual(['changed', 'rejected']);
    expect(replies[1]).toEqual({ kind: 'rejected', reason: 'frozen' });
    expect(h.game.state.attempt?.selection).toBe(1);
    unsubscribe(); await h.game.dispose();
  });
  it('recovers an older durable full-playing snapshot before any editable reveal', async () => {
    const initial = oneBlankAttempt(); initial.entries[0] = Number(initial.definition.solution[0]); initial.commandSeq = 9; initial.logicalRevision = 1; initial.elapsedMs = 345;
    const h = harness(initial), observed: string[] = [];
    const unsubscribe = h.game.subscribe(state => { if (state.attempt) observed.push(state.attempt.status); });
    h.game.setView({ board: true }); h.setNow(8000);
    expect(await h.game.resume('quick')).toBe(true);
    expect(observed).not.toContain('playing'); expect(h.calls.saves[0].status).toBe('pending-completion');
    expect(h.calls.saves[0].commandSeq).toBe(10); expect(h.game.state.receipt?.result.elapsedMs).toBe(345);
    expect(h.game.state.completionEvent).toBe(0); expect(h.game.command({ type: 'undo' })).toEqual({ kind: 'rejected', reason: 'frozen' });
    unsubscribe(); await h.game.dispose();
  });
  it('conceals full-playing recovery when its command sequence cannot safely increment', async () => {
    const initial = oneBlankAttempt(); initial.entries[0] = Number(initial.definition.solution[0]); initial.commandSeq = Number.MAX_SAFE_INTEGER;
    const h = harness(initial), observed: Attempt[] = [];
    const unsubscribe = h.game.subscribe(state => { if (state.attempt) observed.push(state.attempt); });
    h.game.setView({ board: true }); expect(await h.game.resume('quick')).toBe(false);
    expect(h.game.state.canStudy).toBe(false); expect(h.game.state.owned).toBe(false); expect(observed).toEqual([]);
    expect(h.game.state.problem).toBe('corrupt:exhausted-command-sequence'); expect(h.calls.saves).toEqual([]); expect(h.game.state.receipt).toBeUndefined();
    expect(h.data.attempts[0].commandSeq).toBe(Number.MAX_SAFE_INTEGER); expect(h.data.attempts[0].status).toBe('playing');
    unsubscribe(); await h.game.dispose();
  });
  it('canceled committed allocation cannot leave the replaced old attempt studyable', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.allocate(gate.promise);
    const start = h.game.start({ role: 'quick', band: 'easy', authorization: 'replace' });
    await until(() => h.calls.allocations.length === 1); h.game.cancelStart(); gate.resolve();
    expect(await start).toBe(false); expect(h.game.state.owned).toBe(false); expect(h.game.state.canStudy).toBe(false);
    expect(h.data.roles.find(role => role.role === 'quick')?.attemptId).not.toBe(h.game.state.attempt?.id);
    h.game.setView({ board: true }); expect(h.game.state.canStudy).toBe(false);
    await h.game.dispose();
  });
  it.each(['generation', 'attempt', 'role-revision'] as const)('rejects a %s change during the start refresh before catalog work', async fault => {
    const h = harness(); await h.reveal();
    const old = structuredClone(h.game.state.attempt), fresh = structuredClone(h.data), gate = deferred<StorageResult<CurrentSave>>();
    const role = fresh.roles.find(item => item.role === 'quick')!;
    if (fault === 'generation') {
      fresh.meta.generation = 'restored-generation'; fresh.attempts = [];
      fresh.roles = fresh.roles.map(item => ({ ...item, generation: fresh.meta.generation, attemptId: undefined }));
    } else if (fault === 'attempt') {
      role.attemptId = 'replacement-attempt'; fresh.attempts[0].id = role.attemptId;
    } else role.revision++;
    h.reads.push(gate.promise); const reads = h.calls.reads;
    const request = h.game.start({ role: 'quick', band: 'easy', authorization: 'replace' });
    await until(() => h.calls.reads === reads + 1); gate.resolve(committed(fresh));
    expect(await request).toBe(false);
    expect(h.calls.catalogInitializations).toBe(0); expect(h.calls.records).toBe(0); expect(h.calls.allocations).toEqual([]);
    expect(h.game.state.attempt).toEqual(old); expect(h.game.state.canStudy).toBe(false);
    await h.game.dispose();
  });
  it('binds implicit Continue to the shown attempt even after a separate refresh sees its replacement', async () => {
    const h = harness(); await h.reveal(); const shownId = h.game.state.attempt!.id;
    h.data.attempts[0].id = 'new-current-attempt';
    h.data.roles.find(item => item.role === 'quick')!.attemptId = 'new-current-attempt';
    expect(await h.game.initialize()).toBe(true);
    expect(h.game.state.attempt?.id).toBe(shownId);
    expect(await h.game.start({ role: 'quick', band: 'easy', authorization: 'continue' })).toBe(false);
    expect(h.calls.records).toBe(0); expect(h.calls.catalogInitializations).toBe(0); expect(h.calls.allocations).toEqual([]);
    await h.game.dispose();
  });
  it('rejects an explicit stale replacement identity even when the freshly observed role is stable', async () => {
    const h = harness(); await h.reveal();
    expect(await h.game.start({ role: 'quick', band: 'easy', authorization: 'replace',
      expectedCurrent: { generation: h.data.meta.generation, attemptId: 'previous-decision-attempt' } })).toBe(false);
    expect(h.calls.catalogInitializations).toBe(0); expect(h.calls.records).toBe(0); expect(h.calls.allocations).toEqual([]);
    await h.game.dispose();
  });
  it('captures all caller decision primitives before an awaited start refresh', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<StorageResult<CurrentSave>>(); h.reads.push(gate.promise);
    const request: StartRequest = { role: 'quick', band: 'easy', authorization: 'replace',
      expectedCurrent: { generation: h.data.meta.generation, attemptId: h.game.state.attempt!.id } };
    const reads = h.calls.reads, started = h.game.start(request);
    await until(() => h.calls.reads === reads + 1);
    request.role = 'frontier'; request.band = 'hard'; request.authorization = 'continue';
    request.expectedCurrent!.generation = 'mutated-generation'; request.expectedCurrent!.attemptId = 'mutated-attempt';
    gate.resolve(committed(h.data)); expect(await started).toBe(true);
    expect(h.calls.allocations).toHaveLength(1);
    expect(h.calls.allocations[0]).toMatchObject({ authorization: 'replace', generation: h.data.meta.generation,
      attempt: { role: 'quick', policy: { band: 'easy' } } });
    await h.game.dispose();
  });
  it('permits unrelated preference and profile updates while preserving the selected role decision', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<StorageResult<CurrentSave>>(); h.reads.push(gate.promise);
    const reads = h.calls.reads, started = h.game.start({ role: 'quick', band: 'easy', authorization: 'replace' });
    await until(() => h.calls.reads === reads + 1);
    h.data.profile.wallet++; h.data.profile.revision++; h.data.meta.essentialRevision++;
    h.data.preferences.language = 'de'; gate.resolve(committed(h.data));
    expect(await started).toBe(true); expect(h.calls.allocations).toHaveLength(1);
    expect(h.game.state.save?.preferences.language).toBe('de'); expect(h.game.state.save?.profile.wallet).toBe(h.data.profile.wallet);
    await h.game.dispose();
  });
  it.each(['continue', 'replace', 'initial'] as const)('allows an unobserved role only for initial allocation, with %s authorization', async authorization => {
    const h = harness(); h.data.attempts = []; h.data.roles = h.data.roles.map(item => ({ ...item, attemptId: undefined }));
    expect(h.game.state.save).toBeUndefined();
    expect(await h.game.start({ role: 'quick', band: 'easy', authorization })).toBe(authorization === 'initial');
    expect(h.calls.catalogInitializations).toBe(authorization === 'initial' ? 1 : 0);
    expect(h.calls.allocations).toHaveLength(authorization === 'initial' ? 1 : 0);
    await h.game.dispose();
  });
  it('reuses an unchanged decision intent after a failed allocation and ordinary retry', async () => {
    const h = harness(); await h.reveal(); h.allocateIssue({ kind: 'unavailable', reason: 'quota' });
    const request: StartRequest = { role: 'quick', band: 'easy', authorization: 'replace' };
    expect(await h.game.start(request)).toBe(false); expect(h.calls.allocations).toHaveLength(1);
    const intent = structuredClone(h.calls.allocations[0].intent);
    h.allocateIssue(); expect(await h.game.start(request)).toBe(true); expect(h.calls.allocations).toHaveLength(2);
    expect(h.calls.allocations[1].intent).toEqual(intent);
    await h.game.dispose();
  });
  it('ignores old authority replies after explicit reacquisition without concealing the new writer', async () => {
    const h = harness(); await h.reveal(); const previous = structuredClone(h.data), gate = deferred<StorageResult<CurrentSave>>();
    h.reads.push(gate.promise); const authority = h.game.checkAuthority();
    const oldEpoch = h.game.state.attempt!.writer.epoch;
    expect(await h.game.resume('quick')).toBe(true); expect(h.game.state.attempt!.writer.epoch).toBe(oldEpoch + 1);
    gate.resolve(committed(previous)); expect(await authority).toBe(false);
    expect(h.game.state.owned).toBe(true); expect(h.game.state.canStudy).toBe(true); expect(h.game.state.problem).toBeUndefined();
    await h.game.dispose();
  });
  it('conceals an active scored board when a fresh authority read sees a restored generation', async () => {
    const h = harness(); await h.reveal(); const replaced = structuredClone(h.data);
    replaced.meta = { generation: 'different-generation', essentialRevision: 0 }; replaced.attempts = [];
    h.reads.push(Promise.resolve(committed(replaced)));
    expect(await h.game.checkAuthority()).toBe(false); expect(h.game.state.owned).toBe(false); expect(h.game.state.canStudy).toBe(false);
    expect(h.game.state.attempt?.id).toBe('attempt-test'); // retained only for recovery, never study
    await h.game.dispose();
  });
  it('activates restore once, clears old authority and rejects an outstanding old-generation read', async () => {
    const h = harness(); await h.reveal(); const previous = structuredClone(h.data), gate = deferred<StorageResult<CurrentSave>>();
    h.reads.push(gate.promise); const authority = h.game.checkAuthority();
    const activation = deferred<void>(); h.waits.activate(activation.promise);
    const restored = h.game.restore({ expected: h.data.meta } as RestorePreview);
    await Promise.resolve(); expect(h.game.state.busy).toBe(true);
    activation.resolve(); expect(await restored).toBe(true);
    expect(h.game.state.attempt).toBeUndefined(); expect(h.game.state.owned).toBe(false); expect(h.game.state.canStudy).toBe(false);
    expect(h.game.state.save?.meta.generation).toBe('restored-generation');
    gate.resolve(committed(previous)); expect(await authority).toBe(false);
    expect(h.game.state.save?.meta.generation).toBe('restored-generation');
    await h.game.dispose();
  });
  it('cancels before export flush completes without starting repository export work', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.save(gate.promise);
    h.game.command({ type: 'enter', digit: 2 }); await until(() => h.calls.saves.length === 1);
    const exported = h.game.exportBackup(); h.game.cancelBackupWork();
    h.waits.save(); gate.resolve();
    expect(await exported).toEqual({ kind: 'unavailable', reason: 'abort', detail: 'backup-cancelled' });
    expect(h.calls.exports).toBe(0); expect(h.data.attempts[0].entries[1]).toBe(2); await h.game.dispose();
  });
  it('ignores a canceled old preview while a newer preview completes', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.preview(gate.promise);
    const old = h.game.previewRestore('old'); await until(() => h.calls.previews === 1);
    h.game.cancelBackupWork(); h.waits.preview();
    expect((await h.game.previewRestore('new')).kind).toBe('committed'); gate.resolve();
    expect(await old).toEqual({ kind: 'unavailable', reason: 'abort', detail: 'backup-cancelled' });
    expect(h.calls.previews).toBe(2); expect(h.game.state.restorePhase).toBeUndefined(); await h.game.dispose();
  });
  it('conceals and pauses staging independently of presentation, then cancels without activation', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.stage(gate.promise);
    h.setNow(100); const restored = h.game.restore({ expected: h.data.meta } as RestorePreview);
    await until(() => h.calls.stages === 1);
    expect(h.game.state.restorePhase).toBe('staging'); expect(h.game.state.canStudy).toBe(false);
    h.setNow(5100); h.game.setView({ board: true, concealed: false }); expect(h.game.state.canStudy).toBe(false);
    h.game.cancelBackupWork(); gate.resolve(); expect(await restored).toBe(false);
    expect(h.calls.activations).toBe(0); expect(h.game.state.restorePhase).toBeUndefined(); expect(h.game.state.busy).toBe(false);
    expect(h.data.meta.generation).toBe('generation-test'); expect(h.game.state.attempt?.elapsedMs).toBe(100);
    expect(h.game.state.canStudy).toBe(true); await h.game.dispose();
  });
  it('does not cancel activation or invalidate it with duplicate confirmation', async () => {
    const h = harness(); await h.reveal(); const gate = deferred<void>(); h.waits.activate(gate.promise);
    const restored = h.game.restore({ expected: h.data.meta } as RestorePreview); await until(() => h.calls.activations === 1);
    const cancellations = h.calls.cancellations;
    expect(h.game.state.restorePhase).toBe('activating'); expect(h.game.state.canStudy).toBe(false);
    h.game.cancelBackupWork(); expect(h.calls.cancellations).toBe(cancellations);
    expect(await h.game.restore({ expected: h.data.meta } as RestorePreview)).toBe(false);
    gate.resolve(); expect(await restored).toBe(true); expect(h.calls.activations).toBe(1);
    expect(h.game.state.save?.meta.generation).toBe('restored-generation'); expect(h.game.state.restorePhase).toBeUndefined(); await h.game.dispose();
  });
});
