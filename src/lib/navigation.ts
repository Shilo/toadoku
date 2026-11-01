import type { DialogView } from './gameplay/ui/types.ts';

export type Screen = 'menu' | 'quick' | 'progression' | 'board';
export type Route = Screen | 'more';
export interface OverlayState {
  readonly id: string;
  readonly base: Screen;
  readonly panel: DialogView;
  readonly parentId?: string;
}
const screens: readonly string[] = ['menu', 'quick', 'progression', 'board'];
const panels: readonly string[] = ['more', 'settings', 'notes', 'hint', 'result', 'pause', 'replay', 'backup', 'restart', 'replace', 'recover'];
const routes: readonly string[] = [...screens, 'more'];
const isScreen = (value: unknown): value is Screen => typeof value === 'string' && screens.includes(value);
export const parseRoute = (hash: string): Route => routes.includes(hash.slice(1)) ? hash.slice(1) as Route : 'menu';
export interface NavigationHost {
  location: Pick<Location, 'hash'>;
  history: Pick<History, 'state' | 'pushState' | 'replaceState' | 'back'> & Partial<Pick<History, 'go'>>;
  addEventListener(type: 'popstate', listener: () => void): void;
  removeEventListener(type: 'popstate', listener: () => void): void;
}

/** P007: UI history only. Durable roles, ownership, entries and time never live here. */
export function createNavigation(host: NavigationHost, render: (route: Route, overlay?: OverlayState) => void) {
  let current = parseRoute(host.location.hash);
  let closing = false, destroyed = false, sequence = 0;
  // A reload cannot confuse an old document's first pane with a new document's first pane.
  const instance = crypto.randomUUID();
  let active: OverlayState | undefined;
  const known = new Map<string, OverlayState>(), consumed = new Set<string>();
  function screenState(screen: Screen) { return { toadodu: screen }; }
  function overlayState(overlay: OverlayState) { return { toadodu: 'more', instance, overlay: overlay.id, base: overlay.base, panel: overlay.panel, ...(overlay.parentId ? { parentId: overlay.parentId } : {}) }; }
  function replaceScreen(screen: Screen): void { host.history.replaceState(screenState(screen), '', `#${screen}`); }
  function ancestry(overlay = active): OverlayState[] {
    const chain: OverlayState[] = [];
    while (overlay) { chain.push(overlay); overlay = overlay.parentId ? known.get(overlay.parentId) : undefined; }
    return chain;
  }
  function consumeUntil(stopId?: string): void {
    for (const overlay of ancestry()) { if (overlay.id === stopId) break; consumed.add(overlay.id); }
  }
  function incoming(): OverlayState | undefined {
    const state = host.history.state;
    if (!state || typeof state !== 'object' || state.toadodu !== 'more' || state.instance !== instance ||
        typeof state.overlay !== 'string' || !isScreen(state.base) || !panels.includes(state.panel)) return;
    const overlay = known.get(state.overlay);
    if (!overlay || overlay.base !== state.base || overlay.panel !== state.panel || overlay.parentId !== state.parentId ||
        ancestry(overlay).some(item => consumed.has(item.id))) return;
    return overlay;
  }
  // A directly linked/reloaded modal has no live ancestry or durable session authority.
  if (current === 'more') current = 'board';
  replaceScreen(current); render(current);
  const pop = () => {
    if (destroyed) return;
    const route = parseRoute(host.location.hash);
    const target = route === 'more' ? incoming() : undefined;
    // A multi-entry Back consumes every skipped child, while a parent restored by Back remains live.
    consumeUntil(target?.id);
    closing = false;
    if (route === 'more' && !target) {
      const state = host.history.state;
      const previous = typeof state?.overlay === 'string' ? known.get(state.overlay) : undefined;
      const base: Screen = previous?.base ?? (isScreen(state?.base) ? state.base : 'board');
      current = base; active = undefined; replaceScreen(base);
    } else { current = route; active = target; }
    render(current, active);
  };
  host.addEventListener('popstate', pop);
  function openPanel(panel: DialogView): void {
    if (closing || destroyed || !panels.includes(panel) || active?.panel === panel) return;
    const overlay: OverlayState = Object.freeze({ id: `${instance}:${++sequence}`, base: active?.base ?? current as Screen,
      panel, ...(active ? { parentId: active.id } : {}) });
    known.set(overlay.id, overlay); active = overlay;
    host.history.pushState(overlayState(overlay), '', '#more'); current = 'more'; render(current, active);
  }
  function closeTop(): void {
    if (closing || destroyed || current !== 'more' || !active) return;
    consumed.add(active.id); replaceScreen(active.base);
    closing = true; host.history.back();
  }
  return {
    get isClosing() { return closing; },
    go(next: Screen) {
      if (closing || destroyed || next === current || !isScreen(next)) return;
      consumeUntil(); active = undefined;
      host.history.pushState(screenState(next), '', `#${next}`); current = next; render(current);
    },
    openMore() { if (current === 'board') openPanel('more'); },
    openPanel,
    closeMore: closeTop,
    closeAll() {
      if (closing || destroyed || current !== 'more' || !active) return;
      const chain = ancestry(), base = active.base;
      consumeUntil(); replaceScreen(base); closing = true;
      if (chain.length > 1 && host.history.go) host.history.go(-chain.length);
      else host.history.back(); // Legacy single-overlay test hosts have only back().
    },
    quit() {
      if (closing || destroyed || current !== 'more' && current !== 'board') return;
      consumeUntil(); active = undefined; replaceScreen('menu'); current = 'menu'; render(current);
    },
    destroy() { destroyed = true; host.removeEventListener('popstate', pop); },
  };
}
export type Navigation = ReturnType<typeof createNavigation>;
