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
  it('negotiates compatible activation, pins this document and revalidates rapid replacements', async () => {
    let activeBuild = 'b'.repeat(64);
    const messages: Array<{ type: string; protocol: number; buildId?: string; documentId?: string; persisted?: boolean }> = [];
    const worker = Object.assign(new EventTarget(), { state: 'activated', scriptURL: new URL('worker.js', base).href,
      postMessage(message: typeof messages[number], ports?: MessagePort[]) {
        messages.push(message);
        if (!ports?.length) return;
        ports[0].postMessage(message.protocol === 1 ? { protocol: 1, ready: true, buildId: activeBuild, updateProtocol: 2 } :
          { protocol: 2, ready: true, pinned: true, buildId: build, activeBuild, activeReady: true, bytes: 123 }); ports[0].close();
      } });
    const sw = Object.assign(new EventTarget(), { register, getRegistration, controller: worker });
    Object.assign(navigator, { serviceWorker: sw });
    getRegistration.mockResolvedValue(Object.assign(new EventTarget(), { scope: base.href, active: worker, waiting: null, installing: null, update: vi.fn().mockResolvedValue(undefined) }));
    const pwa = client(); await pwa.start();
    expect(pwa.status).toMatchObject({ shellReady: true, canReload: true, availableBuild: activeBuild });
    expect(messages.map(message => message.type)).toEqual(['TOADOKU_SHELL_VERIFY', 'TOADOKU_PAGE_CONNECT']);
    const token = messages[1].documentId;
    expect(token).toMatch(/^[a-f0-9-]{36}$/);
    expect(await pwa.confirmUpdate(activeBuild)).toBe(true);
    const previous = activeBuild; activeBuild = 'c'.repeat(64);
    expect(await pwa.confirmUpdate(previous)).toBe(false);
    expect(pwa.status.availableBuild).toBe(activeBuild);
    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
    expect(messages.at(-1)).toMatchObject({ type: 'TOADOKU_PAGE_RELEASE', protocol: 2, documentId: token, persisted: true });
    window.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: false }));
    expect(messages.at(-1)).toMatchObject({ persisted: false, documentId: token });
    activeBuild = build; sw.dispatchEvent(new Event('controllerchange'));
    await vi.waitFor(() => expect(pwa.status).toMatchObject({ canReload: false, shellReady: true }));
  });

  it('withholds reload permission if the candidate closure is not verified', async () => {
    const worker = Object.assign(new EventTarget(), { state: 'activated', scriptURL: new URL('worker.js', base).href,
      postMessage(message: { protocol: number }, ports: MessagePort[]) {
        ports[0].postMessage(message.protocol === 1 ? { protocol: 1, ready: true, buildId: build, updateProtocol: 2 } :
          { protocol: 2, ready: true, pinned: true, buildId: build, activeBuild: 'b'.repeat(64), activeReady: false }); ports[0].close();
      } });
    getRegistration.mockResolvedValue(Object.assign(new EventTarget(), { scope: base.href, active: worker, waiting: null, installing: null, update: vi.fn().mockResolvedValue(undefined) }));
    const pwa = client(); await pwa.start();
    expect(pwa.status.canReload).toBe(false); expect(await pwa.confirmUpdate('b'.repeat(64))).toBe(false);
  });

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

  it('retries an explicitly requested failed initial registration after cooldown, while respecting visibility and online state', async () => {
    register.mockRejectedValue(new Error('network failure'));
    const pwa = client(); await pwa.start(); expect(register).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(295_000); expect(register).toHaveBeenCalledTimes(1);
    Object.assign(document, { hidden: true }); await vi.advanceTimersByTimeAsync(10_000); expect(register).toHaveBeenCalledTimes(1);
    Object.assign(document, { hidden: false }); Object.assign(navigator, { onLine: false });
    await vi.advanceTimersByTimeAsync(5000); expect(register).toHaveBeenCalledTimes(1);
    Object.assign(navigator, { onLine: true }); await vi.advanceTimersByTimeAsync(5000); expect(register).toHaveBeenCalledTimes(2);
  });
  it('does not register a menu-only first visitor from the condition timer', async () => {
    const pwa = client(); await pwa.connectExisting(); await vi.advanceTimersByTimeAsync(300_000);
    expect(register).not.toHaveBeenCalled();
  });

  it('re-registers a failed empty owned registration after cooldown and keeps its updatefound listener', async () => {
    const failedWorker = Object.assign(new EventTarget(), { state: 'installing', scriptURL: new URL('worker.js', base).href });
    const replacement = Object.assign(new EventTarget(), { state: 'installing', scriptURL: failedWorker.scriptURL });
    const listening = vi.spyOn(replacement, 'addEventListener');
    const update = vi.fn().mockRejectedValue(new Error('InvalidStateError'));
    const reg = Object.assign(new EventTarget(), { scope: base.href, active: null, waiting: null, installing: failedWorker as typeof failedWorker | null, update });
    register.mockResolvedValueOnce(reg).mockImplementationOnce(async () => { reg.installing = replacement; reg.dispatchEvent(new Event('updatefound')); return reg; });
    const pwa = client(); await pwa.start();
    failedWorker.state = 'redundant'; reg.installing = null; failedWorker.dispatchEvent(new Event('statechange'));
    await vi.advanceTimersByTimeAsync(295_000); expect(register).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5000); expect(register).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled(); expect(listening).toHaveBeenCalledWith('statechange', expect.any(Function));
  });

  it('coalesces manual checks and retains a failed check through healthy local readback until network retry succeeds', async () => {
    const worker = Object.assign(new EventTarget(), { state: 'activated', scriptURL: new URL('worker.js', base).href,
      postMessage(message: { type: string }, ports: MessagePort[]) { ports[0].postMessage({ protocol: 1, cacheName: 'owned', ready: true, buildId: build, bytes: 123 }); ports[0].close(); } });
    let release!: () => void;
    const update = vi.fn().mockImplementationOnce(() => new Promise<void>(done => { release = done; }));
    const reg = Object.assign(new EventTarget(), { scope: base.href, active: worker, waiting: null, installing: null, update });
    getRegistration.mockResolvedValue(reg);
    const pwa = client(); await pwa.start();
    const first = pwa.check(), second = pwa.check();
    expect(update).toHaveBeenCalledTimes(1); expect(pwa.status.phase).toBe('checking');
    release(); await Promise.all([first, second]); expect(pwa.status.phase).toBe('ready');
    update.mockRejectedValueOnce(new Error('network failed'));
    await pwa.check(); expect(pwa.status.phase).toBe('failed');
    const key = 'toadoku:pwa:checks:1:' + base.pathname;
    expect(JSON.parse(values.get(key)!)).toMatchObject({ failures: 1 });
    await pwa.inspectShell(); expect(JSON.parse(values.get(key)!)).toMatchObject({ failures: 1 });
    update.mockResolvedValue(undefined);
    await vi.advanceTimersByTimeAsync(295_000); expect(update).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(5000); await vi.waitFor(() => expect(pwa.status.phase).toBe('ready'));
    expect(update).toHaveBeenCalledTimes(3); expect(values.has(key)).toBe(false);
  });
  it.each([true, false])('manual repair requires a successful matching-build acknowledgement (%s)', async acknowledged => {
    let ready = false; const messages: Array<{ type: string; buildId?: string }> = [];
    const worker = Object.assign(new EventTarget(), { state: 'activated', scriptURL: new URL('worker.js', base).href,
      postMessage(message: { type: string; buildId?: string }, ports: MessagePort[]) {
        messages.push(message); if (message.type === 'TOADOKU_SHELL_REPAIR') ready = acknowledged;
        ports[0].postMessage({ protocol: 1, cacheName: 'owned', ready, buildId: build, bytes: 123 }); ports[0].close();
      } });
    getRegistration.mockResolvedValue(Object.assign(new EventTarget(), { scope: base.href, active: worker, waiting: null, installing: null, update: vi.fn().mockResolvedValue(undefined) }));
    const pwa = client(); await pwa.start(); expect(pwa.status.shellReady).toBe(false);
    expect(await pwa.ensureShell()).toBe(acknowledged);
    expect(messages.filter(message => message.type === 'TOADOKU_SHELL_REPAIR')).toEqual([{ type: 'TOADOKU_SHELL_REPAIR', protocol: 1, buildId: build }]);
    await pwa.inspectShell(); expect(messages.filter(message => message.type === 'TOADOKU_SHELL_REPAIR')).toHaveLength(1);
    expect(pwa.status.shellReady).toBe(acknowledged);
  });

});
