<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Locale } from '../i18n';
  import type { PwaClient, PwaStatus } from './client';
  import type { InstallSupport, InstallState } from './install';
  import type { OfflineSupport, OfflineState, OfflineEstimate } from '../offline/reserve';
  import { pwaCopy, formatBytes } from './copy';
  let { locale, client, install, offline, unavailable = false }: {
    locale: Locale; client?: PwaClient; install?: InstallSupport; offline?: OfflineSupport; unavailable?: boolean;
  } = $props();
  const c = $derived(pwaCopy[locale]);
  let delivery = $state.raw<PwaStatus>(), installation = $state.raw<InstallState>(), reserve = $state.raw<OfflineState>();
  let small = $state.raw<OfflineEstimate>(), travel = $state.raw<OfflineEstimate>();
  let preparingShell = $state(false), failed = $state(false), retained = $state<boolean>(), retentionAsked = $state(false);
  let operation = 0, refreshSequence = 0, live = true;
  let refreshing = $state(false);
  const supportsPersistence = typeof navigator.storage?.persist === 'function';
  const working = $derived(preparingShell || reserve?.phase === 'preparing');
  const checking = $derived(refreshing || reserve?.phase === 'checking');
  $effect(() => client?.subscribe(value => delivery = value));
  $effect(() => install?.subscribe(value => installation = value));
  $effect(() => {
    if (!offline) return;
    const stop = offline.subscribe(value => reserve = value);
    untrack(() => { void refresh(offline); });
    return () => { refreshSequence++; refreshing = false; stop(); };
  });
  onMount(() => {
    void navigator.storage?.persisted?.().then(value => { if (live) retained = value; }).catch(() => undefined);
    const timer = setInterval(() => { if (!document.hidden && !working && !checking && offline) void offline.inspect().catch(() => failed = true); }, 5000);
    return () => { live = false; operation++; refreshSequence++; clearInterval(timer); };
  });
  async function refresh(support = offline) {
    if (!support || working) return;
    const request = ++refreshSequence; refreshing = true; failed = false;
    const current = () => live && request === refreshSequence && support === offline;
    try {
      await client?.inspectShell();
      await support.inspect();
      const nextSmall = await support.estimate('default'), nextTravel = await support.estimate('travel');
      if (current()) { small = nextSmall; travel = nextTravel; }
    } catch { if (current()) failed = true; }
    finally { if (current()) refreshing = false; }
  }
  async function prepare(kind: 'default' | 'travel') {
    if (!client || !offline || working) return;
    const id = ++operation, support = offline;
    failed = false; preparingShell = true;
    try {
      const ready = await client.ensureShell();
      if (id !== operation) return;
      preparingShell = false;
      if (!ready) { failed = true; return; }
      await support.prepare(kind);
      if (id === operation) await refresh(support);
    } catch { if (id === operation) failed = true; }
    finally { if (id === operation) preparingShell = false; }
  }
  function cancel() { operation++; refreshSequence++; refreshing = false; preparingShell = false; offline?.cancel(); }
  async function clear() {
    if (!offline || working) return;
    failed = false;
    try { await offline.clear(); await refresh(); } catch { failed = true; }
  }
  async function persist() {
    retentionAsked = true;
    try { retained = await navigator.storage?.persist?.() ?? false; } catch { retained = false; }
  }
  const count = (pool: keyof NonNullable<OfflineState['counts']>) => reserve?.counts[pool] ?? 0;
  const updateText = $derived(!delivery ? c.loading : delivery.phase === 'waiting' ? c.updateReady :
    delivery.phase === 'downloading' ? c.downloading : delivery.phase === 'checking' ? c.checking :
    delivery.phase === 'failed' ? c.updateFailed : delivery.phase === 'unavailable' ? c.unavailable :
    delivery.shellReady ? c.current : c.idle);
</script>

<div class="pwa-pane">
  <section aria-labelledby="pwa-install-title">
    <h3 id="pwa-install-title">{c.install}</h3>
    <p role="status">{installation ? c[installation.phase] : c.loading}</p>
    {#if installation?.phase === 'available'}<button class="primary" onclick={() => install?.prompt()}>{c.installButton}</button>{/if}
    {#if installation && !['standalone', 'installed', 'prompting'].includes(installation.phase)}
      <p>{installation.context !== 'browser' ? c[installation.context] : c[installation.platform]}</p>
      <p>{c.fallback}</p>
    {/if}
  </section>
  <section aria-labelledby="pwa-offline-title">
    <h3 id="pwa-offline-title">{c.offline}</h3>
    <p role="status">{delivery?.shellReady ? c.shellReady : c.shellMissing}</p>
    <p>{reserve?.savedGame ? c.saved : c.noSaved}</p>
    {#if reserve}
      <h4>{c.coverage}</h4>
      <dl><div><dt>{c.easy}</dt><dd>{count('easy')}</dd></div><div><dt>{c.medium}</dt><dd>{Math.min(count('medium-low'), count('medium-high'))}</dd></div><div><dt>{c.hard}</dt><dd>{Math.min(count('hard-low'), count('hard-high'))}</dd></div></dl>
      <p>{c.horizon}</p>
      <p>{c.noAuto}</p><p>{c.background}</p>
      <details><summary>{c.travel}</summary><p>{c.guarantee}</p><p>{c.travelHelp}</p><p>{c.files}</p></details>
      <p>{c.defaultHelp}</p>
      {#if small}<p>{c.estimate}: {formatBytes(small.bytes, locale)}</p>{/if}
      <button class="primary" disabled={working || checking || !client || delivery?.phase === 'unavailable'} onclick={() => prepare('default')}>{c.prepare}</button>
      {#if travel}<p>{c.travel}: {formatBytes(travel.bytes, locale)}. {c.travelHelp}</p>{/if}
      <button class="secondary" disabled={working || checking || !travel || !client || delivery?.phase === 'unavailable'} onclick={() => prepare('travel')}>{c.travel}</button>
      {#if working}
        <p role="status">{preparingShell ? c.waiting : c.preparing}</p>
        {#if !preparingShell}<progress value={reserve.completed} max={Math.max(1,reserve.total)} aria-label={c.progress}></progress><p>{reserve.completed} / {reserve.total} · {c.bytes}: {formatBytes(reserve.downloadedBytes,locale)}</p>{/if}
        <button class="secondary" onclick={cancel}>{c.cancel}</button><p>{c.cancelHelp}</p>
      {:else if checking}<p role="status">{c.checking}</p>
      {:else if reserve.phase === 'ready'}<p role="status">{c.ready}</p>
      {:else if reserve.phase === 'cancelled'}<p role="status">{c.cancelled}</p>
      {:else if reserve.phase === 'partial'}<p role="status">{c.partial}</p>{/if}
      <p>{c.stored}: {formatBytes(reserve.storedBytes,locale)}</p>
      <button class="secondary" disabled={working || checking} onclick={() => refresh()}>{c.inspect}</button>
      <button class="secondary" disabled={working || checking || !reserve.storedBytes} onclick={clear}>{c.remove}</button>
      <p>{c.storeHelp}</p>
    {:else}<p role="status">{unavailable ? c.error : c.loading}</p>{/if}
    {#if failed || reserve?.phase === 'failed'}<p role="alert">{c.error}</p>{/if}
    <p>{c.eviction}</p>
    {#if retained}<p>{c.persisted}</p>
    {:else if supportsPersistence}<button class="secondary" onclick={persist}>{c.persist}</button>{#if retentionAsked}<p role="status">{c.denied}</p>{/if}{/if}
  </section>
  <section aria-labelledby="pwa-update-title">
    <h3 id="pwa-update-title">{c.update}</h3>
    <p role="status">{updateText}</p>
    <p>{c.updateHelp}</p>
    <dl><div><dt>{c.build}</dt><dd>{delivery?.runningBuild ?? '…'}</dd></div><div><dt>{c.lastCheck}</dt><dd>{delivery?.lastCheck ? new Date(delivery.lastCheck).toLocaleTimeString(locale) : c.never}</dd></div></dl>
    <button class="secondary" disabled={!client || delivery?.phase === 'checking' || delivery?.phase === 'unavailable'} onclick={() => client?.check()}>{c.check}</button>
  </section>
</div>

<style>
  .pwa-pane { display:flex; flex-direction:column; gap:8px; }
  section { display:flex; flex-direction:column; gap:8px; }
  section + section { border-top:1px solid var(--control-lip); padding-top:8px; }
  h3, h4, p { margin:0; }
  h3 { font-size:1.1rem; }
  h4 { font-size:1rem; }
  dl { margin:0; }
  dl div { display:flex; gap:8px; justify-content:space-between; }
  dd { margin:0; overflow-wrap:anywhere; text-align:right; }
  button { box-sizing:border-box; font:inherit; border:0; border-radius:12px; min-height:44px; padding:8px; cursor:pointer; overflow-wrap:anywhere; }
  button:disabled { cursor:default; opacity:.48; }
  button:focus-visible, summary:focus-visible { outline:2px solid var(--control-focus); outline-offset:2px; }
  .primary { background:var(--leaf-ink); color:var(--control-face); }
  .secondary { background:var(--control-lip); color:var(--control-ink); }
  progress { width:100%; accent-color:var(--leaf-ink); }
  details p { margin-top:8px; }
</style>
