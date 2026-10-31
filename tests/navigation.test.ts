import { describe, expect, it } from 'vitest';
import { createNavigation, type NavigationHost, type Route } from '../src/lib/navigation';

function browser() {
  const entries = [{ hash: '#menu', state: null as unknown }]; let index = 0;
  const listeners = new Set<() => void>();
  const host: NavigationHost = {
    location: { get hash() { return entries[index].hash; } },
    history: {
      get state() { return entries[index].state; },
      pushState(state, _, url) { entries.splice(++index); entries.push({ hash: String(url), state }); },
      replaceState(state, _, url) { entries[index] = { hash: String(url), state }; },
      back() { if (index > 0) index--; listeners.forEach(fn => fn()); }
    },
    addEventListener(_, fn) { listeners.add(fn); }, removeEventListener(_, fn) { listeners.delete(fn); }
  };
  return { host, forward() { index = Math.min(index + 1, entries.length - 1); listeners.forEach(fn => fn()); }, listeners };
}
describe('navigation history', () => {
  it('consumes dismissed modal entries, ignores duplicate activation, cleans listeners', () => {
    const b = browser(); let route: Route = 'menu'; const nav = createNavigation(b.host, r => route = r);
    nav.go('quick'); nav.go('board'); nav.openMore(); nav.openMore();
    expect(route).toBe('more'); nav.closeMore(); expect(route).toBe('board');
    b.forward(); expect(route).toBe('board');
    nav.openMore(); b.host.history.back(); expect(route).toBe('board');
    b.forward(); expect(route).toBe('board');
    nav.openMore(); nav.quit(); expect(route).toBe('menu');
    b.host.history.back(); expect(route).toBe('board'); b.forward(); expect(route).toBe('menu');
    nav.destroy(); expect(b.listeners.size).toBe(0);
  });
});
