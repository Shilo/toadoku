import { describe, expect, it } from 'vitest';
import { createInstallSupport } from '../../src/lib/pwa/install';

function hostFixture(options: { standalone?: boolean; embedded?: boolean; secure?: boolean; userAgent?: string } = {}) {
  const host = new EventTarget(), media = Object.assign(new EventTarget(), { matches: options.standalone ?? false });
  Object.assign(host, { matchMedia: () => media, navigator: { userAgent: options.userAgent ?? 'Desktop' }, isSecureContext: options.secure ?? true, self: host, top: options.embedded ? {} : host });
  return { host: host as unknown as Window, media };
}
function promptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  let calls = 0, resolve!: (value: { outcome: 'accepted' | 'dismissed' }) => void;
  const userChoice = new Promise<{ outcome: 'accepted' | 'dismissed' }>(done => { resolve = done; });
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt: async () => { calls++; }, userChoice });
  return { event, calls: () => calls, settle: () => resolve({ outcome }) };
}

// Synthetic capability events test only our state machine, never browser installability.
describe('installation capability state', () => {
  it('does not infer installation or unsupported/private mode when no event arrives', async () => {
    const { host } = hostFixture(), support = createInstallSupport(host);
    expect(support.state).toEqual({ phase: 'browser', context: 'browser', platform: 'desktop' });
    await support.prompt(); expect(support.state.phase).toBe('browser'); support.dispose();
  });
  it.each(['accepted', 'dismissed'] as const)('consumes one prompt and reports %s without claiming standalone', async outcome => {
    const { host } = hostFixture(), support = createInstallSupport(host), capability = promptEvent(outcome);
    const observed: string[] = [], unsubscribe = support.subscribe(state => observed.push(state.phase));
    host.dispatchEvent(capability.event); expect(capability.event.defaultPrevented).toBe(true);
    const first = support.prompt(); await support.prompt();
    expect(capability.calls()).toBe(1); expect(support.state.phase).toBe('prompting');
    capability.settle(); await first;
    expect(support.state.phase).toBe(outcome); expect(observed).toEqual(['browser', 'available', 'prompting', outcome]);
    await support.prompt(); expect(capability.calls()).toBe(1);
    unsubscribe(); support.dispose();
  });
  it('preserves a real installation notification arriving before the prompt choice', async () => {
    const { host } = hostFixture({ userAgent: 'Android Chrome' }), support = createInstallSupport(host), capability = promptEvent();
    host.dispatchEvent(capability.event); const prompting = support.prompt();
    host.dispatchEvent(new Event('appinstalled')); capability.settle(); await prompting;
    expect(support.state).toEqual({ phase: 'installed', context: 'browser', platform: 'android' }); support.dispose();
  });
  it('cleans a failed consumed prompt and permits a new capability event', async () => {
    const { host } = hostFixture(), support = createInstallSupport(host);
    const capability = promptEvent(); capability.event.prompt = async () => { throw Error('restricted'); };
    host.dispatchEvent(capability.event); await support.prompt(); expect(support.state.phase).toBe('failed');
    host.dispatchEvent(promptEvent().event); expect(support.state.phase).toBe('available'); support.dispose();
  });
  it('reports running standalone, listens for display change, and never prompts there', async () => {
    const { host, media } = hostFixture({ standalone: true, userAgent: 'iPhone Safari' }), support = createInstallSupport(host), capability = promptEvent();
    expect(support.state.phase).toBe('standalone'); expect(support.state.platform).toBe('ios');
    host.dispatchEvent(capability.event); await support.prompt(); expect(capability.calls()).toBe(0);
    media.matches = false; media.dispatchEvent(new Event('change')); expect(support.state.phase).toBe('browser');
    media.matches = true; media.dispatchEvent(new Event('change')); expect(support.state.phase).toBe('standalone'); support.dispose();
  });
  it.each([{ embedded: true, context: 'embedded' }, { secure: false, context: 'insecure' }] as const)('uses truthful context for $context', async options => {
    const { host } = hostFixture(options), support = createInstallSupport(host), capability = promptEvent();
    expect(support.state.context).toBe(options.context); host.dispatchEvent(capability.event); await support.prompt();
    expect(capability.calls()).toBe(0); expect(support.state.phase).toBe('browser'); support.dispose();
  });
  it('ignores malformed events and prevents late prompt results after disposal', async () => {
    const { host } = hostFixture(), support = createInstallSupport(host), capability = promptEvent();
    host.dispatchEvent(new Event('beforeinstallprompt')); expect(support.state.phase).toBe('browser');
    host.dispatchEvent(capability.event); const prompting = support.prompt(), before = support.state;
    support.dispose(); capability.settle(); await prompting; host.dispatchEvent(new Event('appinstalled'));
    expect(support.state).toEqual(before);
  });
});

