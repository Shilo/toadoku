import { describe, expect, it, vi } from 'vitest';
import { createUpdateGuard, createVisibilityGuard } from '../../src/lib/gameplay/app-guards';

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
};
const plan = () => ({ prepare: vi.fn(async () => true), confirm: vi.fn(async () => true), valid: () => true,
  navigate: vi.fn(), cancel: vi.fn() });

describe('cancellable update orchestration', () => {
  it.each(['prepare', 'confirm'] as const)('cancels a held %s immediately and never navigates after its late result', async held => {
    const gate = deferred<boolean>(), busy = vi.fn(), guard = createUpdateGuard(busy), update = plan();
    update[held] = vi.fn(() => gate.promise);
    const running = guard.run(update); await Promise.resolve();
    expect(busy).toHaveBeenLastCalledWith(true);
    guard.cancel();
    expect(update.cancel).toHaveBeenCalledTimes(1); expect(busy).toHaveBeenLastCalledWith(false);
    expect(update.navigate).not.toHaveBeenCalled();
    gate.resolve(true); expect(await running).toBe('cancelled');
    expect(update.navigate).not.toHaveBeenCalled(); expect(update.cancel).toHaveBeenCalledTimes(1);
  });

  it('does not let a cancelled older completion clear a newer busy attempt', async () => {
    const first = deferred<boolean>(), second = deferred<boolean>(), busy = vi.fn(), guard = createUpdateGuard(busy);
    const old = plan(); old.prepare = vi.fn(() => first.promise);
    const oldRun = guard.run(old); guard.cancel();
    const fresh = plan(); fresh.prepare = vi.fn(() => second.promise);
    const freshRun = guard.run(fresh); first.resolve(true);
    expect(await oldRun).toBe('cancelled'); expect(busy).toHaveBeenLastCalledWith(true);
    expect(fresh.cancel).not.toHaveBeenCalled(); second.resolve(true);
    expect(await freshRun).toBe('navigating'); expect(fresh.navigate).toHaveBeenCalledTimes(1);
  });

  it('keeps the game frozen once navigation has been chosen', async () => {
    const busy = vi.fn(), guard = createUpdateGuard(busy), update = plan();
    expect(await guard.run(update)).toBe('navigating'); guard.cancel();
    expect(busy.mock.calls).toEqual([[true]]); expect(update.cancel).not.toHaveBeenCalled();
  });

  it('restores normal play when verification or the final environment check fails', async () => {
    const busy = vi.fn(), guard = createUpdateGuard(busy), update = plan(); update.valid = () => false;
    expect(await guard.run(update)).toBe('failed');
    expect(update.confirm).not.toHaveBeenCalled();
    expect(update.cancel).toHaveBeenCalledTimes(1); expect(busy).toHaveBeenLastCalledWith(false);
    expect(update.navigate).not.toHaveBeenCalled();
  });
});

function visibilityHarness() {
  const result = deferred<boolean>(), allowed = vi.fn(), writes: boolean[] = [];
  const client = { state: { canStudy: true, attempt: { id: 'attempt', generation: 'generation', writer: { token: 'owner', epoch: 1 } } },
    setView: ({ visible }: { visible: boolean }) => { writes.push(visible); client.state.canStudy = visible; }, checkAuthority: vi.fn(() => result.promise) };
  let hidden = true, current: typeof client | undefined = client;
  const guard = createVisibilityGuard(() => current, () => hidden, allowed);
  return { guard, client, result, allowed, writes, hidden: (value: boolean) => { hidden = value; },
    current: (value: typeof client | undefined) => { current = value; } };
}

describe('visibility authority orchestration', () => {
  it('checks a changed identity anew and never lets an older completion clear the newer pending check', async () => {
    const h = visibilityHarness(), newer = deferred<boolean>(); h.hidden(false);
    const old = h.guard.show(true); await Promise.resolve();
    h.client.state.attempt.writer.epoch++; h.client.checkAuthority = vi.fn(() => newer.promise);
    const fresh = h.guard.show(); expect(fresh).not.toBe(old); await Promise.resolve();
    h.result.resolve(true); await old;
    expect(h.allowed).not.toHaveBeenCalledWith(true); expect(h.guard.show()).toBe(fresh);
    newer.resolve(true); await fresh; expect(h.allowed).toHaveBeenLastCalledWith(true);
  });

  it('clears a completed stale check so a later show can verify the new identity', async () => {
    const h = visibilityHarness(); h.hidden(false); const old = h.guard.show();
    await Promise.resolve(); h.client.state.attempt.writer.epoch++; h.result.resolve(true); await old;
    h.client.checkAuthority = vi.fn(async () => true); await h.guard.show();
    expect(h.client.checkAuthority).toHaveBeenCalledTimes(1); expect(h.writes.at(-1)).toBe(true);
  });

  it('rechecks a readable overlay without fabricating a hidden transition and coalesces repeated checks', async () => {
    const h = visibilityHarness(); h.hidden(false);
    const first = h.guard.show(true), repeated = h.guard.show(true);
    expect(repeated).toBe(first); expect(h.writes).toEqual([]); expect(h.allowed).not.toHaveBeenCalled();
    await Promise.resolve(); expect(h.client.checkAuthority).toHaveBeenCalledTimes(1);
    h.result.resolve(true); await first;
    expect(h.writes).toEqual([true]); expect(h.allowed.mock.calls).toEqual([[true]]);
  });

  it('conceals immediately for a native return during an already pending readable check', async () => {
    const h = visibilityHarness(); h.hidden(false); const readable = h.guard.show(true);
    const returning = h.guard.show(); expect(returning).toBe(readable);
    expect(h.writes).toEqual([false]); expect(h.allowed).toHaveBeenLastCalledWith(false);
    h.guard.hide(); h.hidden(true); h.result.resolve(true); await readable;
    expect(h.writes).not.toContain(true); expect(h.allowed).not.toHaveBeenCalledWith(true);
  });

  it.each(['failure', 'exception'] as const)('conceals a readable overlay after authority %s', async failure => {
    const h = visibilityHarness(); h.hidden(false);
    if (failure === 'exception') h.client.checkAuthority = vi.fn(async () => { throw Error('Unavailable'); });
    const readable = h.guard.show(true); h.result.resolve(false); await readable;
    expect(h.writes).toEqual([false]); expect(h.allowed.mock.calls).toEqual([[false]]);
  });

  it('does not let the readable opt-in reveal a concealed Pause before verification', async () => {
    const h = visibilityHarness(); h.hidden(false); h.client.state.canStudy = false;
    const shown = h.guard.show(true); expect(h.writes).toEqual([false]);
    h.result.resolve(true); await shown; expect(h.writes).toEqual([false, true]);
  });

  it('conceals synchronously and coalesces pageshow/visibility until authority is verified', async () => {
    const h = visibilityHarness(); h.guard.hide(); h.hidden(false);
    const shown = h.guard.show(); const duplicate = h.guard.show();
    expect(h.allowed).toHaveBeenLastCalledWith(false); expect(h.writes).not.toContain(true);
    expect(duplicate).toBe(shown); await Promise.resolve(); expect(h.client.checkAuthority).toHaveBeenCalledTimes(1);
    h.result.resolve(true); await shown;
    expect(h.allowed).toHaveBeenLastCalledWith(true); expect(h.writes.at(-1)).toBe(true);
  });

  it.each(['hide', 'invalidate'] as const)('ignores a late visible readback after %s', async action => {
    const h = visibilityHarness(); h.hidden(false); const shown = h.guard.show(); await Promise.resolve();
    h.guard[action](); if (action === 'hide') h.hidden(true);
    h.result.resolve(true); await shown;
    expect(h.allowed).not.toHaveBeenCalledWith(true); expect(h.writes).not.toContain(true);
  });

  it('does not override a later explicit Resume or a replaced controller', async () => {
    const h = visibilityHarness(); h.hidden(false); const shown = h.guard.show(); await Promise.resolve();
    h.guard.invalidate(); h.client.state.attempt.writer.epoch++;
    h.result.resolve(true); await shown;
    expect(h.allowed).not.toHaveBeenCalledWith(true);
    const replaced = visibilityHarness(); replaced.hidden(false); const old = replaced.guard.show(); await Promise.resolve();
    replaced.current(undefined); replaced.result.resolve(true); await old;
    expect(replaced.allowed).not.toHaveBeenCalledWith(true);
  });

  it('keeps only the board concealed after a failed authority check and permits an explicit retry', async () => {
    const h = visibilityHarness(); h.hidden(false); const shown = h.guard.show();
    h.result.resolve(false); await shown;
    expect(h.allowed).toHaveBeenLastCalledWith(false); expect(h.writes.at(-1)).toBe(false);
    h.client.checkAuthority = vi.fn(async () => true); await h.guard.show();
    expect(h.allowed).toHaveBeenLastCalledWith(true);
  });

  it('never starts authority work for a hidden document', async () => {
    const h = visibilityHarness(); await h.guard.show();
    expect(h.client.checkAuthority).not.toHaveBeenCalled(); expect(h.writes).toEqual([false]);
  });

  it('allows a visible menu without an attached controller and settles repeated events', async () => {
    const allowed = vi.fn(), guard = createVisibilityGuard(() => undefined, () => false, allowed);
    await guard.show(); expect(allowed).toHaveBeenLastCalledWith(true);
    await guard.show(); expect(allowed.mock.calls).toEqual([[false], [true], [false], [true]]);
  });
});
