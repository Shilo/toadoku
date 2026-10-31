import { describe, expect, it } from 'vitest';
import { createNavigation, type NavigationHost, type Route } from '../src/lib/navigation';

/** Browser traversal dispatches popstate in a later task, unlike push/replace. */
function queuedBrowser(initial = '#menu') {
  const entries = [{ hash: initial, state: null as unknown }];
  let index = 0;
  const pending: (() => void)[] = [];
  const listeners = new Set<() => void>();
  const traverse = (delta: number) => pending.push(() => {
    const next = Math.max(0, Math.min(entries.length - 1, index + delta));
    if (next === index) return;
    index = next;
    for (const listener of listeners) listener();
  });
  const host: NavigationHost = {
    location: { get hash() { return entries[index].hash; } },
    history: {
      get state() { return entries[index].state; },
      pushState(state, _, url) {
        entries.splice(index + 1);
        entries.push({ hash: String(url), state });
        index++;
      },
      replaceState(state, _, url) { entries[index] = { hash: String(url), state }; },
      back() { traverse(-1); },
    },
    addEventListener(_, listener) { listeners.add(listener); },
    removeEventListener(_, listener) { listeners.delete(listener); },
  };
  return {
    host, entries, listeners,
    forward() { traverse(1); },
    flush() { while (pending.length) pending.shift()!(); },
    get pendingCount() { return pending.length; },
  };
}

describe('independent navigation review with delayed traversal', () => {
  it('normalizes a direct modal link to a board with a valid future modal entry', () => {
    const browser = queuedBrowser('#more');
    let route: Route | undefined;
    const navigation = createNavigation(browser.host, next => route = next);
    expect(route).toBe('board');
    expect(browser.host.location.hash).toBe('#board');
    navigation.openMore();
    navigation.closeMore();
    browser.flush();
    expect(route).toBe('board');
    navigation.destroy();
  });

  it('makes Close single-flight until its real popstate arrives', () => {
    const browser = queuedBrowser();
    let route: Route | undefined;
    const navigation = createNavigation(browser.host, next => route = next);
    navigation.go('quick'); navigation.go('board'); navigation.openMore();
    navigation.closeMore(); navigation.closeMore(); navigation.openMore(); navigation.quit(); navigation.go('progression');
    expect(browser.pendingCount).toBe(1);
    browser.flush();
    expect(route).toBe('board');
    browser.forward(); browser.flush();
    expect(route).toBe('board');
    expect(browser.entries.some(entry => entry.hash === '#more')).toBe(false);
    navigation.openMore();
    expect(route).toBe('more');
    navigation.destroy();
  });

  it('does not resurrect a quit modal across Back/Forward and removes listeners', () => {
    const browser = queuedBrowser();
    let route: Route | undefined;
    const navigation = createNavigation(browser.host, next => route = next);
    navigation.go('progression'); navigation.go('board'); navigation.openMore(); navigation.quit();
    expect(route).toBe('menu');
    browser.host.history.back(); browser.flush();
    expect(route).toBe('board');
    browser.forward(); browser.flush();
    expect(route).toBe('menu');
    expect(browser.entries.some(entry => entry.hash === '#more')).toBe(false);
    navigation.destroy();
    expect(browser.listeners.size).toBe(0);
  });
});
