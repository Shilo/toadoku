/// <reference types="vite/client" />
import { automaticCheckAllowed, restoredBackoff } from './policy';
export type PwaPhase = 'unavailable' | 'idle' | 'checking' | 'downloading' | 'waiting' | 'ready' | 'failed';
export interface PwaStatus {
  phase: PwaPhase; runningBuild: string; availableBuild?: string; lastCheck?: number;
  shellReady: boolean; shellBytes?: number; problem?: string;
  /** Only a verified, compatible active router can offer a page-local reload. */
  canReload?: boolean; capacityDeferred?: boolean;
}
export interface PwaClient {
  readonly status: PwaStatus;
  subscribe(listener: (status: PwaStatus) => void): () => void;
  connectExisting(): Promise<void>;
  start(): Promise<void>;
  check(): Promise<void>;
  ensureShell(): Promise<boolean>;
  inspectShell(): Promise<void>;
  confirmUpdate(buildId: string): Promise<boolean>;
  dispose(): void;
}
interface ShellReply { protocol: 1 | 2; cacheName: string; ready: boolean; buildId?: string; bytes?: number;
  updateProtocol?: number; activeBuild?: string; activeReady?: boolean; pinned?: boolean; capacityDeferred?: boolean }
export function createPwaClient(base: URL): PwaClient {
  const supported = 'serviceWorker' in navigator && window.isSecureContext && !import.meta.env.DEV;
  const build = document.querySelector<HTMLMetaElement>('meta[name="toadoku-build"]')?.content ?? 'development';
  const script = new URL('worker.js', base).href;
  let status: PwaStatus = { phase: supported ? 'idle' : 'unavailable', runningBuild: build, shellReady: false };
  let registration: ServiceWorkerRegistration | undefined, starting: Promise<void> | undefined, checking: Promise<void> | undefined, refreshing: Promise<void> | undefined;
  let setupRequested = false;
  let refreshAgain = false;
  let disposed = false, failures = 0, nextCheck = 0, lastAttempt = 0;
  const documentId = crypto.randomUUID(), compatible = new WeakSet<ServiceWorker>();
  const listeners = new Set<(status: PwaStatus) => void>(), cleanups: Array<() => void> = [];
  const backoffKey = `toadoku:pwa:checks:1:${base.pathname}`;
  try { const text = localStorage.getItem(backoffKey) ?? 'null'; const saved = text.length <= 256 ? restoredBackoff(JSON.parse(text), Date.now()) : undefined; if (saved) { failures = saved.failures; nextCheck = saved.nextCheck; } } catch { /* Optional check throttling is best effort. */ }
  function publish(patch: Partial<PwaStatus>) {
    if (disposed) return;
    status = { ...status, ...patch };
    for (const listener of listeners) listener(status);
  }
  function resetFailures() { failures = 0; nextCheck = 0; try { localStorage.removeItem(backoffKey); } catch { /* Optional. */ } }
  function failure(problem: unknown) {
    failures = Math.min(3, failures + 1); nextCheck = Date.now() + (failures === 1 ? 300_000 : failures === 2 ? 1_800_000 : 86_400_000);
    try { localStorage.setItem(backoffKey, JSON.stringify({ failures, nextCheck })); } catch { /* No gameplay dependency. */ }
    publish({ phase: 'failed', problem: String(problem) });
  }
  function ours(reg: ServiceWorkerRegistration): boolean {
    return reg.scope === base.href && [reg.active, reg.waiting, reg.installing].filter(Boolean).every(worker => worker!.scriptURL === script);
  }
  async function verify(worker: ServiceWorker, repair = false): Promise<ShellReply> {
    const known = compatible.has(worker);
    const reply = await request(worker, known ? 2 : 1, repair);
    if (!known && reply.updateProtocol === 2) {
      compatible.add(worker);
      return request(worker, 2, repair);
    }
    return reply;
  }
  function request(worker: ServiceWorker, protocol: 1 | 2, repair = false): Promise<ShellReply> {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(new Error('Offline verification timed out')); }, repair ? 180_000 : 15_000);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); const reply = event.data as ShellReply; if (reply?.protocol === protocol && typeof reply.ready === 'boolean') resolve(reply); else reject(new Error('Unsupported worker protocol')); };
      worker.postMessage({ type: repair ? 'TOADOKU_SHELL_REPAIR' : protocol === 2 ? 'TOADOKU_PAGE_CONNECT' : 'TOADOKU_SHELL_VERIFY', protocol, buildId: build, ...(protocol === 2 ? { documentId } : {}) }, [channel.port2]);
    });
  }
  function refresh(): Promise<void> {
    if (refreshing) { refreshAgain = true; return refreshing; }
    refreshing = (async () => { do { refreshAgain = false; await refreshNow(); } while (refreshAgain && !disposed); })().finally(() => { refreshing = undefined; });
    return refreshing;
  }
  async function refreshNow(): Promise<void> {
    if (!registration || disposed) return;
    const active = registration.active, waiting = registration.waiting, installing = registration.installing;
    let activeReply: ShellReply | undefined, waitingReply: ShellReply | undefined, verificationProblem: string | undefined;
    try { if (active) activeReply = await verify(active); if (waiting) waitingReply = await verify(waiting); }
    catch (error) { verificationProblem = String(error); }
    if (disposed) return;
    if (active !== registration.active || waiting !== registration.waiting) { refreshAgain = true; return; }
    const shellReady = activeReply?.ready === true && activeReply.buildId === build;
    const activeBuild = activeReply?.protocol === 2 ? activeReply.activeBuild : activeReply?.buildId;
    const activeReady = /^[a-f0-9]{64}$/.test(activeBuild ?? '') && (activeReply?.protocol === 2 ? activeReply.activeReady === true : activeReply?.ready === true);
    const newerActive = activeReady && activeBuild !== build;
    if (activeReply?.capacityDeferred) resetFailures();
    if (waiting && waitingReply?.ready !== true) verificationProblem ??= 'Downloaded application is incomplete. Check again while online.';
    if (active && !shellReady && !newerActive) verificationProblem ??= 'Offline application is incomplete. Prepare it again while online.';
    publish({ shellReady, shellBytes: shellReady ? activeReply?.bytes : undefined, availableBuild: newerActive ? activeBuild : waitingReply?.ready ? waitingReply.buildId : undefined,
      canReload: activeReply?.protocol === 2 && newerActive && !installing && !waiting,
      capacityDeferred: activeReply?.capacityDeferred === true,
      problem: verificationProblem ?? status.problem,
      phase: verificationProblem ? 'failed' : installing ? 'downloading' : waiting || newerActive ? 'waiting' : shellReady ? 'ready' : status.phase === 'failed' ? 'failed' : 'idle' });
  }
  function attach(reg: ServiceWorkerRegistration) {
    if (!ours(reg)) throw new Error('Another application owns the requested worker scope');
    if (registration === reg) return;
    registration = reg;
    function watch() {
      const worker = reg.installing;
      if (!worker) return;
      publish({ phase: 'downloading', problem: undefined });
      const changed = () => {
        if (worker.state === 'redundant' && !reg.waiting) void refresh().then(() => {
          if (status.capacityDeferred) resetFailures();
          else failure('Application download failed. Existing game is unchanged.');
        });
        else if (worker.state === 'installed' || worker.state === 'activated') void verify(worker).then(reply => { if (reply.ready) resetFailures(); return refresh(); }).catch(error => failure(error));
      };
      worker.addEventListener('statechange', changed); cleanups.push(() => worker.removeEventListener('statechange', changed)); changed();
    }
    reg.addEventListener('updatefound', watch); cleanups.push(() => reg.removeEventListener('updatefound', watch)); watch();
  }
  async function requestCheck(manual: boolean) {
    if (!supported || !registration || disposed || checking) return checking;
    if (lastAttempt > Date.now()) lastAttempt = 0;
    if (!manual && !automaticCheckAllowed({ failures, nextCheck, lastAttempt, now: Date.now(), hidden: document.hidden, online: navigator.onLine })) return;
    if (manual) resetFailures();
    lastAttempt = Date.now(); publish({ ...(manual ? { phase: registration.waiting ? 'waiting' as const : 'checking' as const } : {}), lastCheck: lastAttempt, problem: undefined });
    const failuresBefore = failures;
    checking = (async () => { try { await registration!.update(); if (!registration!.installing && failures === failuresBefore) resetFailures(); await refresh(); } catch (error) { failure(error); } finally { checking = undefined; } })();
    return checking;
  }
  async function connectExisting() {
    if (!supported || disposed) return;
    try { const reg = await navigator.serviceWorker.getRegistration(base.href); if (reg && reg.scope === base.href) { attach(reg); await refresh(); await requestCheck(false); } }
    catch (error) { failure(error); }
  }
  async function start(manual = false) {
    if (!supported || disposed) return;
    setupRequested = true;
    if (starting) return starting;
    if (!manual && Date.now() < nextCheck) { publish({ phase: 'failed', problem: 'Download paused after a failure. Prepare offline or check again to retry.' }); return; }
    if (manual) resetFailures();
    starting = (async () => { try {
      const existing = registration ?? await navigator.serviceWorker.getRegistration(base.href);
      if (existing && existing.scope === base.href && (existing.active || existing.waiting || existing.installing)) { attach(existing); if (manual) await requestCheck(true); await refresh(); return; }
      const reg = await navigator.serviceWorker.register(script, { scope: base.href, updateViaCache: 'none' }); attach(reg); await refresh(); } catch (error) { failure(error); } finally { starting = undefined; } })();
    return starting;
  }
  async function ensureShell(): Promise<boolean> {
    await start(true);
    if (!registration) return false;
    const firstInstall = !registration.active || registration.active.state === 'activating';
    const candidate = registration.installing ?? (firstInstall ? registration.waiting ?? registration.active : undefined);
    if (candidate) {
      await new Promise<void>(resolve => {
        const timer = setTimeout(done, 180_000);
        function done() { clearTimeout(timer); candidate!.removeEventListener('statechange', changed); resolve(); }
        function changed() {
          if (candidate!.state === 'redundant' || candidate!.state === 'activated' || !firstInstall && candidate!.state === 'installed') done();
        }
        candidate.addEventListener('statechange', changed); changed();
      });
    }
    // Discard any coalesced readback captured before first activation became observable.
    await refreshing;
    await refresh();
    if (!status.shellReady && registration.active) {
      try {
        const reply = await verify(registration.active);
        if (reply.buildId === build && !reply.ready) { publish({ phase: 'downloading', problem: undefined }); await verify(registration.active, true); await refresh(); }
      } catch (error) { failure(error); }
    }
    return status.shellReady;
  }
  if (supported) {
    const checkVisible = () => {
      if (setupRequested && (!registration || !registration.active && !registration.waiting && !registration.installing) && !document.hidden && navigator.onLine) void start();
      else void requestCheck(false);
    };
    window.addEventListener('focus', checkVisible); window.addEventListener('online', checkVisible); document.addEventListener('visibilitychange', checkVisible);
    const timer = setInterval(checkVisible, 5000);
    const controlled = () => { void refresh(); };
    const shown = () => { void refresh(); checkVisible(); };
    const hidden = (event: PageTransitionEvent) => {
      const worker = navigator.serviceWorker.controller;
      if (worker && compatible.has(worker)) worker.postMessage({ type: 'TOADOKU_PAGE_RELEASE', protocol: 2, buildId: build, documentId, persisted: event.persisted });
    };
    navigator.serviceWorker.addEventListener?.('controllerchange', controlled);
    window.addEventListener('pageshow', shown); window.addEventListener('pagehide', hidden);
    cleanups.push(() => { navigator.serviceWorker.removeEventListener?.('controllerchange', controlled); window.removeEventListener('pageshow', shown); window.removeEventListener('pagehide', hidden); });
    cleanups.push(() => { clearInterval(timer); window.removeEventListener('focus', checkVisible); window.removeEventListener('online', checkVisible); document.removeEventListener('visibilitychange', checkVisible); });
  }
  return {
    get status() { return status; }, subscribe(listener) { listeners.add(listener); listener(status); return () => listeners.delete(listener); },
    connectExisting, start, check: async () => { if (!registration) await start(true); else await requestCheck(true); }, ensureShell, inspectShell: refresh,
    confirmUpdate: async expected => { await refreshing; await refresh(); return status.canReload === true && status.availableBuild === expected; },
    dispose() { disposed = true; cleanups.splice(0).forEach(clean => clean()); listeners.clear(); },
  };
}
