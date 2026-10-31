export type Route = 'menu' | 'quick' | 'progression' | 'board' | 'more';
const routes: readonly string[] = ['menu', 'quick', 'progression', 'board', 'more'];
export const parseRoute = (hash: string): Route => routes.includes(hash.slice(1)) ? hash.slice(1) as Route : 'menu';
export interface NavigationHost {
  location: Pick<Location, 'hash'>;
  history: Pick<History, 'state' | 'pushState' | 'replaceState' | 'back'>;
  addEventListener(type: 'popstate', listener: () => void): void;
  removeEventListener(type: 'popstate', listener: () => void): void;
}

/** Only navigation state lives in history. Selection and decorative seeds never do. */
export function createNavigation(host: NavigationHost, render: (route: Route) => void) {
  let current = parseRoute(host.location.hash);
  let closing = false;
  let overlaySequence = 0;
  let activeOverlay: number | undefined;
  const dismissed = new Set<number>();
  // A directly linked modal has no underlying board history entry to consume.
  if (current === 'more') current = 'board';
  host.history.replaceState({ toadodu: current }, '', `#${current}`);
  render(current);
  const pop = () => {
    if (current === 'more' && activeOverlay !== undefined) dismissed.add(activeOverlay);
    closing = false;
    current = parseRoute(host.location.hash);
    activeOverlay = host.history.state?.overlay;
    if (current === 'more' && (host.history.state?.toadodu !== 'more' || activeOverlay === undefined || dismissed.has(activeOverlay))) {
      current = 'board';
      host.history.replaceState({ toadodu: current }, '', '#board');
    }
    render(current);
  };
  host.addEventListener('popstate', pop);
  return {
    go(next: Exclude<Route, 'more'>) {
      if (closing || next === current) return;
      host.history.pushState({ toadodu: next }, '', `#${next}`);
      render(current = next);
    },
    openMore() {
      if (closing || current !== 'board') return;
      activeOverlay = ++overlaySequence;
      host.history.pushState({ toadodu: 'more', overlay: activeOverlay }, '', '#more');
      render(current = 'more');
    },
    closeMore() {
      if (closing || current !== 'more') return;
      // Scrub this entry before traversing, so Forward cannot revive a dismissed modal.
      host.history.replaceState({ toadodu: 'board' }, '', '#board');
      closing = true;
      host.history.back();
    },
    quit() {
      if (closing || (current !== 'more' && current !== 'board')) return;
      host.history.replaceState({ toadodu: 'menu' }, '', '#menu');
      render(current = 'menu');
    },
    destroy() { host.removeEventListener('popstate', pop); }
  };
}
export type Navigation = ReturnType<typeof createNavigation>;
