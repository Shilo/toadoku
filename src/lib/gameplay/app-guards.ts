interface UpdatePlan {
  prepare(): Promise<boolean>;
  confirm(): Promise<boolean>;
  valid(): boolean;
  navigate(): void;
  cancel(): void;
}

/** Cancelling navigation never cancels an already requested progress write. */
export function createUpdateGuard(busy: (value: boolean) => void) {
  let active: { plan: UpdatePlan } | undefined;
  return {
    cancel() {
      const previous = active; active = undefined;
      if (previous) { previous.plan.cancel(); busy(false); }
    },
    async run(plan: UpdatePlan): Promise<'navigating' | 'cancelled' | 'failed'> {
      if (active) return 'cancelled';
      const request = { plan }; active = request; busy(true);
      try {
        const prepared = await plan.prepare();
        if (active !== request) return 'cancelled';
        if (!prepared || !plan.valid()) return 'failed';
        const confirmed = await plan.confirm();
        if (active !== request) return 'cancelled';
        if (!confirmed || !plan.valid()) return 'failed';
        plan.navigate(); active = undefined;
        return 'navigating';
      } catch { return active === request ? 'failed' : 'cancelled'; }
      finally {
        if (active === request) { active = undefined; plan.cancel(); busy(false); }
      }
    },
  };
}

interface AuthorityClient {
  state: { attempt?: { id: string; generation: string; writer: { epoch: number; token: string } } };
  setView(view: { visible: boolean }): void;
  checkAuthority(): Promise<boolean>;
}
const identity = (client: AuthorityClient | undefined) => {
  const attempt = client?.state.attempt;
  return attempt && `${attempt.generation}|${attempt.id}|${attempt.writer.epoch}|${attempt.writer.token}`;
};
/** Only the board waits for authority. Menus and explicit recovery remain reachable. */
export function createVisibilityGuard(current: () => AuthorityClient | undefined, hidden: () => boolean,
  allowed: (value: boolean) => void) {
  let sequence = 0, pending: { client: AuthorityClient | undefined; promise: Promise<void> } | undefined;
  function invalidate() { sequence++; pending = undefined; }
  return {
    invalidate,
    hide() { invalidate(); allowed(false); current()?.setView({ visible: false }); },
    show(): Promise<void> {
      if (hidden()) { this.hide(); return Promise.resolve(); }
      const client = current();
      if (pending && pending.client === client) return pending.promise;
      const request = ++sequence, before = identity(client);
      allowed(false); client?.setView({ visible: false });
      const promise = Promise.resolve().then(async () => {
        let verified = !client?.state.attempt;
        try { if (!verified && client) verified = await client.checkAuthority(); } catch { /* Explicit Resume remains available. */ }
        if (sequence !== request || hidden() || current() !== client || identity(client) !== before) return;
        pending = undefined; allowed(verified); client?.setView({ visible: verified });
      });
      pending = { client, promise };
      return promise;
    },
  };
}
