/** Browser capability events are transient; installation and offline readiness are separate. */
export type InstallPhase = 'browser' | 'available' | 'prompting' | 'accepted' | 'dismissed' | 'installed' | 'standalone' | 'failed';
export interface InstallState {
  phase: InstallPhase;
  platform: 'android' | 'ios' | 'desktop';
  context: 'browser' | 'embedded' | 'insecure';
}
interface PromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function createInstallSupport(host: Window = window) {
  const media = host.matchMedia('(display-mode: standalone)');
  const nav = host.navigator as Navigator & { standalone?: boolean };
  let embedded = false;
  try { embedded = host.top !== host.self; } catch { embedded = true; }
  const state: InstallState = {
    phase: media.matches || nav.standalone === true ? 'standalone' : 'browser',
    platform: /iPhone|iPad|iPod/.test(nav.userAgent) ? 'ios' : /Android/.test(nav.userAgent) ? 'android' : 'desktop',
    context: !host.isSecureContext ? 'insecure' : embedded ? 'embedded' : 'browser',
  };
  let deferred: PromptEvent | undefined, disposed = false;
  const listeners = new Set<(state: InstallState) => void>();
  const publish = () => { for (const listener of listeners) listener({ ...state }); };
  const before = (event: Event) => {
    if (state.phase === 'standalone' || state.context !== 'browser') return;
    const candidate = event as PromptEvent;
    if (typeof candidate.prompt !== 'function' || !candidate.userChoice) return;
    event.preventDefault(); deferred = candidate; state.phase = 'available'; publish();
  };
  const installed = () => { deferred = undefined; state.phase = media.matches || nav.standalone === true ? 'standalone' : 'installed'; publish(); };
  const display = () => {
    if (media.matches || nav.standalone === true) { deferred = undefined; state.phase = 'standalone'; }
    else if (state.phase === 'standalone') state.phase = 'browser';
    publish();
  };
  host.addEventListener('beforeinstallprompt', before);
  host.addEventListener('appinstalled', installed);
  media.addEventListener('change', display);
  return {
    get state(): InstallState { return { ...state }; },
    subscribe(listener: (state: InstallState) => void) { listeners.add(listener); listener({ ...state }); return () => { listeners.delete(listener); }; },
    async prompt(): Promise<void> {
      if (!deferred || state.phase !== 'available' || disposed) return;
      const event = deferred; deferred = undefined; state.phase = 'prompting'; publish();
      try {
        // Called directly by the Install button, before awaiting anything else.
        await event.prompt();
        const choice = await event.userChoice;
        if (!disposed && state.phase === 'prompting') { state.phase = choice.outcome === 'accepted' ? 'accepted' : 'dismissed'; publish(); }
      } catch { if (!disposed && state.phase === 'prompting') { state.phase = 'failed'; publish(); } }
    },
    dispose() { disposed = true; deferred = undefined; listeners.clear(); host.removeEventListener('beforeinstallprompt', before); host.removeEventListener('appinstalled', installed); media.removeEventListener('change', display); },
  };
}
export type InstallSupport = ReturnType<typeof createInstallSupport>;
