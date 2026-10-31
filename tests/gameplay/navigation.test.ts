import { describe, expect, it } from 'vitest';
import { createNavigation } from '../../src/lib/navigation.ts';
import type { NavigationHost, OverlayState, Route } from '../../src/lib/navigation.ts';

function browser(initial = '#menu') {
  const entries = [{ hash: initial, state: undefined as unknown }]; let index = 0;
  const pending: (() => void)[] = [], listeners = new Set<() => void>();
  const traverse = (delta: number) => pending.push(() => { const next = Math.max(0, Math.min(entries.length - 1, index + delta)); if (next !== index) { index = next; listeners.forEach(listener => listener()); } });
  const host: NavigationHost = {
    location: { get hash() { return entries[index].hash; } },
    history: {
      get state() { return entries[index].state; },
      pushState(state, _, url) { entries.splice(index + 1); entries.push({ hash: String(url), state }); index++; },
      replaceState(state, _, url) { entries[index] = { hash: String(url), state }; },
      back() { traverse(-1); }, go(delta = 0) { if (!delta) throw new Error('No reload traversal'); traverse(delta); },
    },
    addEventListener(_, listener) { listeners.add(listener); }, removeEventListener(_, listener) { listeners.delete(listener); },
  };
  return { host, entries, pending, flush() { while (pending.length) pending.shift()!(); }, traverse, get index() { return index; } };
}

describe('P007 nested single-pane history', () => {
  it('Back closes the child first, then consumes its parent and never resurrects either', () => {
    const b = browser(); let current: Route = 'menu', pane: OverlayState | undefined;
    const nav = createNavigation(b.host, (route, overlay) => { current = route; pane = overlay; });
    nav.go('board'); nav.openMore(); const parent = pane;
    nav.openPanel('settings'); expect(pane?.parentId).toBe(parent?.id); expect(pane?.base).toBe('board');
    nav.closeMore(); expect(nav.isClosing).toBe(true); nav.openPanel('notes'); nav.closeMore(); expect(b.pending).toHaveLength(1);
    b.flush(); expect(current).toBe('more'); expect(pane).toEqual(parent); expect(nav.isClosing).toBe(false);
    nav.closeMore(); b.flush(); expect(current).toBe('board');
    b.traverse(1); b.flush(); expect(current).toBe('board'); b.traverse(1); b.flush(); expect(current).toBe('board');
    nav.destroy();
  });
  it('closes all ancestors with one traversal and guards delayed double actions', () => {
    const b = browser(); let current: Route = 'menu'; const nav = createNavigation(b.host, route => { current = route; });
    nav.go('quick'); nav.openPanel('more'); nav.openPanel('settings'); nav.openPanel('backup');
    const top = b.index; nav.closeAll(); nav.closeAll(); nav.openPanel('notes'); nav.quit(); nav.go('board');
    expect(b.pending).toHaveLength(1); expect(nav.isClosing).toBe(true);
    b.flush(); expect(b.index).toBe(top - 3); expect(current).toBe('quick');
    for (let i = 0; i < 3; i++) { b.traverse(1); b.flush(); expect(current).toBe('quick'); }
    nav.destroy();
  });
  it('consumes skipped ancestry on multi-entry external Back and does not revive a descendant', () => {
    const b = browser(); let pane: OverlayState | undefined, current: Route = 'menu';
    const nav = createNavigation(b.host, (route, overlay) => { current = route; pane = overlay; });
    nav.go('progression'); nav.openPanel('more'); nav.openPanel('replay'); nav.openPanel('replace');
    b.traverse(-3); b.flush(); expect(current).toBe('progression'); expect(pane).toBeUndefined();
    b.traverse(3); b.flush(); expect(current).toBe('progression'); expect(pane).toBeUndefined();
    nav.destroy();
  });
  it('uses document-unique IDs, ignores foreign/reloaded state and validates pane fields', () => {
    const b = browser(); let current: Route = 'menu', pane: OverlayState | undefined;
    const first = createNavigation(b.host, (_, overlay) => { pane = overlay; }); first.go('board'); first.openMore();
    const old = pane!; first.destroy();
    const second = createNavigation(b.host, (route, overlay) => { current = route; pane = overlay; });
    expect(current).toBe('board'); second.openMore(); expect(pane?.id).not.toBe(old.id);
    const fresh = pane!; second.closeMore(); b.flush();
    b.entries.push({ hash: '#more', state: { toadodu: 'more', overlay: old.id, base: 'board', panel: 'more', instance: old.id.split(':')[0] } });
    b.traverse(2); b.flush(); expect(current).toBe('board');
    second.openMore(); const position = b.index;
    b.entries[position].state = { ...b.host.history.state, panel: 'unimplemented', overlay: fresh.id };
    b.traverse(-1); b.flush(); b.traverse(1); b.flush(); expect(current).toBe('board');
    second.destroy();
  });
  it('keeps direct panels normalized and returning to modes independent of attempt data', () => {
    const b = browser('#more'); let current: Route = 'menu'; const nav = createNavigation(b.host, route => { current = route; });
    expect(current).toBe('board'); nav.go('menu'); nav.openPanel('settings'); nav.openPanel('backup'); nav.quit();
    expect(current).toBe('menu'); b.traverse(-1); b.flush(); expect(current).toBe('menu'); b.traverse(1); b.flush(); expect(current).toBe('menu');
    nav.destroy(); nav.openPanel('more'); nav.go('quick'); expect(current).toBe('menu');
  });
});
