import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPwaClient } from '../../src/lib/pwa/client';
const base = new URL('https://example.test/toadoku/'), build = 'a'.repeat(64);
const values = new Map<string, string>();
const clients: ReturnType<typeof createPwaClient>[] = [];
function client() { const result = createPwaClient(base); clients.push(result); return result; }
let register: ReturnType<typeof vi.fn>, getRegistration: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(100_000); vi.stubEnv('DEV', false);
  values.clear(); register = vi.fn(); getRegistration = vi.fn().mockResolvedValue(undefined);
  const host = Object.assign(new EventTarget(), { isSecureContext: true });
  vi.stubGlobal('window', host);
  vi.stubGlobal('document', Object.assign(new EventTarget(), { hidden: false, querySelector: () => ({ content: build }) }));
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: { register, getRegistration } });
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
});
afterEach(() => { clients.splice(0).forEach(value => value.dispose()); vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('app-owned PWA bridge', () => {
  it('preserves failure throttling across new documents and allows explicit preparation retry', async () => {
    register.mockRejectedValue(new Error('offline'));
    await client().start(); expect(register).toHaveBeenCalledTimes(1);
    await client().start(); expect(register).toHaveBeenCalledTimes(1);
    vi.setSystemTime(500_001); await client().start(); expect(register).toHaveBeenCalledTimes(2);
    vi.setSystemTime(2_400_002); await client().start(); expect(register).toHaveBeenCalledTimes(3);
    vi.setSystemTime(3_000_000); await client().start(); expect(register).toHaveBeenCalledTimes(3);
    vi.setSystemTime(100_000_000); await client().start(); expect(register).toHaveBeenCalledTimes(4);
    expect(await client().ensureShell()).toBe(false); expect(register).toHaveBeenCalledTimes(5);
  });
  it('reuses a compatible registration and readback detects evicted bytes without any network check', async () => {
    let ready = true;
    const messages: string[] = [];
    const worker = Object.assign(new EventTarget(), { state: 'activated', scriptURL: new URL('worker.js', base).href,
      postMessage(message: { type: string }, ports: MessagePort[]) { messages.push(message.type); ports[0].postMessage({ protocol: 1, cacheName: 'owned', ready, buildId: build, bytes: 123 }); ports[0].close(); } });
    const update = vi.fn().mockResolvedValue(undefined);
    getRegistration.mockResolvedValue(Object.assign(new EventTarget(), { scope: base.href, active: worker, waiting: null, installing: null, update }));
    const pwa = client(); await pwa.start(); expect(pwa.status.shellReady).toBe(true);
    expect(register).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
    ready = false; await pwa.inspectShell(); expect(pwa.status.shellReady).toBe(false); expect(pwa.status.phase).toBe('failed');
    expect(update).not.toHaveBeenCalled(); expect(messages.every(type => type === 'TOADOKU_SHELL_VERIFY')).toBe(true);
  });
  it('does not adopt another application at the same scope', async () => {
    const worker = { state: 'activated', scriptURL: 'https://example.test/foreign.js' };
    getRegistration.mockResolvedValue(Object.assign(new EventTarget(), { scope: base.href, active: worker }));
    const pwa = client(); await pwa.start(); expect(pwa.status.phase).toBe('failed'); expect(register).not.toHaveBeenCalled();
  });
  it('keeps the first preparation pending across installed-to-active registration transitions', async () => {
    const worker = Object.assign(new EventTarget(), { state: 'installing', scriptURL: new URL('worker.js', base).href,
      postMessage(message: { type: string }, ports: MessagePort[]) { ports[0].postMessage({ protocol: 1, cacheName: 'owned', ready: true, buildId: build, bytes: 123 }); ports[0].close(); } });
    const listen = vi.spyOn(worker, 'addEventListener');
    const reg = Object.assign(new EventTarget(), { scope: base.href, active: null as typeof worker | null, waiting: null as typeof worker | null, installing: worker as typeof worker | null, update: vi.fn().mockResolvedValue(undefined) });
    register.mockResolvedValue(reg);
    const pwa = client(); let finished = false;
    const prepared = pwa.ensureShell().then(value => { finished = true; return value; });
    await vi.waitFor(() => expect(listen.mock.calls.filter(call => call[0] === 'statechange').length).toBeGreaterThanOrEqual(2));
    worker.state = 'installed'; reg.installing = null; reg.waiting = worker; worker.dispatchEvent(new Event('statechange'));
    await Promise.resolve(); expect(finished).toBe(false);
    worker.state = 'activating'; reg.waiting = null; reg.active = worker; worker.dispatchEvent(new Event('statechange'));
    worker.state = 'activated'; worker.dispatchEvent(new Event('statechange'));
    expect(await prepared).toBe(true); expect(pwa.status.shellReady).toBe(true);
  });

  it('announces an activated newer build while an old uncontrolled document stays open', async () => {
    const newer = 'b'.repeat(64);
    const worker = Object.assign(new EventTarget(), { state: 'activated', scriptURL: new URL('worker.js', base).href,
      postMessage(message: { type: string }, ports: MessagePort[]) { ports[0].postMessage({ protocol: 1, cacheName: 'owned', ready: true, buildId: newer, bytes: 123 }); ports[0].close(); } });
    getRegistration.mockResolvedValue(Object.assign(new EventTarget(), { scope: base.href, active: worker, waiting: null, installing: null, update: vi.fn().mockResolvedValue(undefined) }));
    const pwa = client(); await pwa.start();
    expect(pwa.status).toMatchObject({ shellReady: false, phase: 'waiting', runningBuild: build, availableBuild: newer });
    expect(register).not.toHaveBeenCalled();
  });

});
