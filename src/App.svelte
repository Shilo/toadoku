<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { createPwaClient, type PwaClient } from './lib/pwa/client';
  import { createInstallSupport, type InstallSupport } from './lib/pwa/install';
  import type { OfflineSupport } from './lib/offline/reserve';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Scene from './lib/scene/Scene.svelte';
  import Leaf from './lib/leaves/Leaf.svelte';
  import type GameDialog from './lib/gameplay/ui/GameDialog.svelte';
  import { createMotionClock, type MotionEnvironment } from './lib/motion/clock';
  import { floatOffset } from './lib/motion/float';
  import { createLayout, rectStyle, LARGE } from './lib/layout';
  import { createNavigation, type Navigation, type Route, type OverlayState } from './lib/navigation';
  import { dictionaries, resolveLocale, type Locale } from './lib/i18n';
  import { pond, themeStyle } from './lib/theme/pond';
  import type { GameController, GameState, StartRequest } from './lib/gameplay/game';
  import type { Band, Preferences, Role } from './lib/gameplay/contracts';
  import type { CloseReason, DialogView } from './lib/gameplay/ui/types';
  import type { RestorePreview } from './lib/storage/repository';
  import { commandForKey, getValues, type SessionCommand } from './lib/session';
  import { findConflicts } from './lib/sudoku';
  import { uiCopy } from './lib/gameplay/ui/copy';
  import { appCopy } from './lib/gameplay/app-copy';
  import menuSketch from './assets/menu-sketch.png';

  let { locale = resolveLocale(new URLSearchParams(location.search).get('lang') ?? navigator.language) }: { locale?: Locale } = $props();
  const copy = $derived(dictionaries[locale]), c = $derived(uiCopy[locale]), a = $derived(appCopy[locale]);
  let route = $state<Route>('menu'), overlay = $state.raw<OverlayState>();
  let width = $state(window.innerWidth - 2 * LARGE), height = $state(window.innerHeight - 2 * LARGE), time = $state(0);
  let keyboard = $state(false), focusedCell = $state<number | null>(null);
  let moreButton = $state<HTMLButtonElement>(), menuElement = $state<HTMLElement>(), boardElement = $state<HTMLElement>();
  let dockElement = $state<HTMLElement>();
  let controller = $state.raw<GameController>();
  let pwa = $state.raw<PwaClient>(), install = $state.raw<InstallSupport>(), offline = $state.raw<OfflineSupport>();
  let offlineUnavailable = $state(false);
  let offlinePromise: Promise<void> | undefined, offlineSequence = 0;
  let shellTimer: ReturnType<typeof setTimeout> | undefined, shellStarted = false;
  let gameState = $state.raw<GameState>({ owned: false, canStudy: false, busy: false, hintComputing: false, saveState: 'saved', completionEvent: 0 });
  let booting = $state(true), bootError = $state(false), actionBusy = $state(false), backupBusy = $state(false), historyClosing = $state(false);
  let puzzleLoadFailed = $state(false), startSequence = 0;
  let announcement = $state(''), pendingStart = $state.raw<StartRequest>();
  let quickContinue = $state.raw<{ attemptId: string; generation: string; band: Band }>();
  let saveFailed = $state(false);
  let restorePreview = $state.raw<RestorePreview>(), restoreError = $state(false), exportError = $state(false);
  let recoveryBusy = $state(false), recoveryProblem = $state<'partial' | 'unavailable'>();
  let recoveryAbort: AbortController | undefined;
  let anchor = $state.raw<{ left: number; top: number; width: number; height: number; landscape: boolean }>();
  let documentVisible = $state(!document.hidden);
  let DialogComponent = $state.raw<typeof GameDialog>();
  let dialogLoading = $state(false), dialogError = $state(false);
  let dialogPromise: Promise<typeof GameDialog> | undefined;
  let nav: Navigation | undefined;
  let unsubscribe: (() => void) | undefined, stopMotion: (() => void) | undefined;
  let previousMotion: string | undefined, disposed = false, latestCompletion = 0, focusReason: CloseReason = 'dismiss';
  let bootSequence = 0;
  let backupSequence = 0;
  let routeRevision = 0;
  const panes = new Map<string, DialogView>();
  const preferences = $derived(gameState.save?.preferences ?? { schemaVersion: 1 as const, language: locale, motion: 'system' as const, boardShape: 'fill' as const, theme: 'pond', appearance: 'light' });
  const layout = $derived(createLayout(width, height, preferences.boardShape));
  const inGame = $derived(route === 'board' || route === 'more' && overlay?.base === 'board');
  const selected = $derived(gameState.attempt?.selection ?? 0);
  const values = $derived(gameState.attempt ? getValues(gameState.attempt) : []);
  const conflicts = $derived(new Set(values.length ? findConflicts(values).flatMap(conflict => [...conflict.cells]) : []));
  const titleFloat = $derived(floatOffset(701, time, 'identity')), artFloat = $derived(floatOffset(702, time, 'identity'));
  const blocked = $derived(booting || actionBusy || backupBusy || recoveryBusy || gameState.busy || historyClosing || dialogLoading && route === 'more');
  const closingBlocked = $derived(booting || actionBusy || gameState.busy && gameState.restorePhase !== 'staging' || historyClosing);
  const concealed = $derived(!!gameState.restorePhase || !!overlay && ['settings','pause','backup','restart','replace','replay','recover','pwa'].includes(overlay.panel));
  const saveState = $derived(bootError ? 'unavailable' : gameState.problem?.startsWith('conflict') ? 'conflict' : gameState.saveState === 'pending' ? 'saving' : gameState.saveState);
  const hintProblem = $derived.by(() => {
    if (!gameState.problem?.startsWith('hint-unavailable:')) return undefined;
    const reason = gameState.problem.slice('hint-unavailable:'.length);
    return reason === 'reveal-choice' ? 'no-step' : reason === 'no-target' ? 'no-target' : 'unavailable';
  });
  const saveBadge = $derived(gameState.durability === 'ephemeral' || gameState.attempt?.scored === false ? a.unscoredShort : saveFailed ? a.unsavedShort : '');
  const continueBand = $derived(gameState.attempt?.role === 'quick' && gameState.attempt.status === 'completed' &&
    quickContinue?.attemptId === gameState.attempt.id && quickContinue.generation === gameState.attempt.generation ? quickContinue.band : undefined);

  $effect(() => { controller?.setView({ board: inGame, concealed, visible: documentVisible }); });
  $effect(() => {
    width; height; layout.landscape;
    const rect = dockElement?.getBoundingClientRect();
    anchor = rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height, landscape: layout.landscape } : undefined;
  });
  function motionEnvironment(choice: Preferences['motion']): MotionEnvironment {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    return { requestFrame: cb => requestAnimationFrame(cb), cancelFrame: id => cancelAnimationFrame(id), hidden: () => document.hidden,
      reduced: () => choice === 'reduced' || choice === 'system' && media.matches,
      onVisibility(cb) { document.addEventListener('visibilitychange', cb); return () => document.removeEventListener('visibilitychange', cb); },
      onReduced(cb) { media.addEventListener('change', cb); return () => media.removeEventListener('change', cb); } };
  }
  function accept(next: GameState) {
    gameState = next;
    if (next.canStudy && next.attempt && !shellStarted && !shellTimer) {
      shellTimer = setTimeout(() => {
        shellTimer = undefined;
        if (disposed || document.hidden || !controller?.state.canStudy) return;
        shellStarted = true; void pwa?.start(); void loadOfflineSupport();
      }, 2000);
    }
    if (next.save) {
      locale = next.save.preferences.language;
      if (previousMotion !== next.save.preferences.motion) {
        previousMotion = next.save.preferences.motion; stopMotion?.();
        stopMotion = createMotionClock(value => time = value, motionEnvironment(next.save.preferences.motion));
      }
    }
    if (next.durability === 'ephemeral') saveFailed = false;
    else if (next.saveState === 'unsaved' && !saveFailed) { saveFailed = true; announcement = appCopy[locale].unsavedShort; }
    else if (next.saveState === 'saved' && saveFailed) { saveFailed = false; announcement = appCopy[locale].saved; }
    if (next.completionEvent > latestCompletion) {
      latestCompletion = next.completionEvent; announcement = next.attempt?.scored === false ? `${uiCopy[locale].completed}. ${uiCopy[locale].unscoredIdentity}` : appCopy[locale].completed;
      if (inGame) nav?.openPanel('result');
    }
  }
  async function loadOfflineSupport() {
    if (offline || offlinePromise || !controller) return offlinePromise;
    const current = controller, request = ++offlineSequence;
    offlineUnavailable = false;
    if (current.state.durability === 'ephemeral') { offlineUnavailable = true; return; }
    offlinePromise = (async () => {
      try {
        const { createOfflineSupport } = await import('./lib/offline/reserve');
        const support = await createOfflineSupport(current.repository, current.catalog);
        if (disposed || request !== offlineSequence || current !== controller) support.dispose();
        else offline = support;
      } catch { if (request === offlineSequence && !disposed) offlineUnavailable = true; }
      finally { if (request === offlineSequence) offlinePromise = undefined; }
    })();
    return offlinePromise;
  }
  function releaseOfflineSupport() { offlineSequence++; offline?.dispose(); offline = undefined; offlinePromise = undefined; }
  async function boot() {
    cancelBackupOperation();
    const request = ++bootSequence;
    booting = true; bootError = false;
    try {
      const { bootstrap } = await import('./lib/gameplay/bootstrap');
      const result = await bootstrap(new URL(import.meta.env.BASE_URL, location.href), locale);
      if (disposed || request !== bootSequence) { if (result.kind === 'committed') void result.value.dispose(); return; }
      if (result.kind === 'committed') {
        const previous = controller;
        releaseOfflineSupport(); unsubscribe?.(); controller = result.value; unsubscribe = controller.subscribe(accept); bootError = !controller.state.save; void loadOfflineSupport();
        if (previous && previous !== controller) void previous.dispose();
        if ((route === 'board' || route === 'more' && overlay?.base === 'board') && !controller.state.attempt) nav?.go('menu');
      } else bootError = true;
    } catch { if (!disposed && request === bootSequence) bootError = true; }
    finally { if (!disposed && request === bootSequence) { booting = false; void pwa?.connectExisting(); } }
  }
  async function playWithoutSaving() {
    if (blocked) return;
    const request = ++bootSequence;
    booting = true;
    const forbidden = controller?.state.save?.attempts.map(attempt => attempt.definition.id) ?? [];
    try {
      const { bootstrapEphemeral } = await import('./lib/gameplay/bootstrap');
      const next = await bootstrapEphemeral(new URL(import.meta.env.BASE_URL, location.href), locale, forbidden);
      if (disposed || request !== bootSequence) { void next.dispose(); return; }
      const previous = controller;
      releaseOfflineSupport(); unsubscribe?.(); controller = next; unsubscribe = controller.subscribe(accept); bootError = false;
      if (previous && previous !== next) void previous.dispose();
      nav?.go('quick');
    } catch { if (!disposed && request === bootSequence) bootError = true; }
    finally { if (!disposed && request === bootSequence) booting = false; }
  }
  onMount(() => {
    install = createInstallSupport();
    pwa = createPwaClient(new URL(import.meta.env.BASE_URL, location.href));
    nav = createNavigation(window, (next, pane) => { void renderRoute(next, pane); });
    stopMotion = createMotionClock(value => time = value);
    void boot();
    const timer = setInterval(() => controller?.checkpoint(), 1000);
    return () => { disposed = true; bootSequence++; if (shellTimer) clearTimeout(shellTimer); releaseOfflineSupport(); pwa?.dispose(); install?.dispose(); cancelBackupOperation(); clearInterval(timer); nav?.destroy(); stopMotion?.(); unsubscribe?.(); void controller?.dispose(); };
  });
  async function focusCell() {
    await tick(); if (route !== 'board' || !gameState.canStudy) return;
    boardElement?.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus({ preventScroll: true });
  }
  async function renderRoute(next: Route, pane?: OverlayState) {
    const previous = route;
    if (next !== route || pane?.id !== overlay?.id) {
      puzzleLoadFailed = false;
      if (recoveryBusy) cancelBackupOperation();
      routeRevision++; controller?.cancelStart();
      if (overlay?.panel === 'hint' && pane?.id !== overlay.id) controller?.cancelHint();
    }
    if (overlay?.panel === 'backup' && (pane?.id !== overlay.id || next !== 'more')) cancelBackupOperation();
    route = next; overlay = pane; historyClosing = false;
    if (pane?.panel === 'pwa') void loadOfflineSupport();
    if (next === 'menu' || next === 'quick' || next === 'progression') quickContinue = undefined;
    if (pane) panes.set(pane.id, pane.panel);
    if (pane && !DialogComponent) void loadDialog();
    await tick();
    if (route !== next || overlay?.id !== pane?.id) return;
    if (next === 'board' && previous === 'more') {
      if (focusReason === 'tool' || focusReason === 'undo') await focusCell(); else moreButton?.focus();
      focusReason = 'dismiss';
    } else if (next === 'board') await focusCell();
    else if (next !== 'more') menuElement?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  async function loadDialog() {
    if (DialogComponent || dialogLoading) return;
    dialogLoading = true; dialogError = false;
    try {
      dialogPromise ??= import('./lib/gameplay/ui/GameDialog.svelte').then(module => module.default);
      const component = await dialogPromise;
      if (!disposed) DialogComponent = component;
    } catch { dialogPromise = undefined; if (!disposed) dialogError = true; }
    finally { dialogLoading = false; }
  }
  function loadingDialog(node: HTMLDialogElement) {
    node.showModal(); node.querySelector<HTMLButtonElement>('button')?.focus();
    return () => node.close();
  }
  function navigatePanel(view: DialogView) {
    const backupBack = overlay?.panel === 'backup' && view === 'settings';
    if (nav?.isClosing || closingBlocked || blocked && !backupBack) return;
    if (backupBack) cancelBackupOperation();
    if (bootError && backupBack) { historyClosing = true; nav?.closeAll(); return; }
    if (view === 'replace' && gameState.attempt?.status === 'playing') pendingStart = { role: gameState.attempt.role, band: gameState.attempt.policy.band, leap: gameState.attempt.binding?.leap, authorization: 'replace', expectedCurrent: { generation: gameState.attempt.generation, attemptId: gameState.attempt.id } };
    if (overlay?.parentId && panes.get(overlay.parentId) === view) { historyClosing = true; nav?.closeMore(); }
    else if (view === 'more' && overlay?.base !== 'board') { historyClosing = true; nav?.closeAll(); }
    else nav?.openPanel(view);
  }
  async function closeDialog(reason: CloseReason) {
    if (closingBlocked || nav?.isClosing) return;
    if (overlay?.panel === 'backup' || recoveryBusy) cancelBackupOperation();
    const paneId = overlay?.id;
    if (concealed && inGame && controller) {
      actionBusy = true; await controller.checkAuthority(); actionBusy = false;
      if (overlay?.id !== paneId || gameState.restorePhase === 'activating') return;
    }
    focusReason = reason;
    if (overlay?.panel === 'hint') controller?.cancelHint();
    if (reason === 'menu') { controller?.cancelHint(); controller?.cancelStart(); nav?.quit(); return; }
    historyClosing = true;
    if (reason === 'tool' || reason === 'undo' || overlay?.panel === 'pause' || overlay?.panel === 'result') nav?.closeAll();
    else nav?.closeMore();
  }
  function dispatch(command: SessionCommand, focus = false) {
    if (blocked || nav?.isClosing) return;
    const result = controller?.command(command);
    if (result?.kind === 'rejected' && result.reason === 'clue') announcement = a.clueFeedback;
    if (focus && result?.kind === 'changed') void focusCell();
  }
  async function resume(role: Role, discardConflicted = false, nextBand?: Band) {
    if (blocked || !controller) return;
    const revision = routeRevision;
    const resumed = await (discardConflicted ? controller.resumeSaved(role) : controller.resume(role));
    if (resumed && revision === routeRevision && !disposed) {
      if (role === 'quick') quickContinue = nextBand && controller.state.attempt?.status === 'completed'
        ? { attemptId: controller.state.attempt.id, generation: controller.state.attempt.generation, band: nextBand } : undefined;
      nav?.go('board');
      if (controller.state.receipt) nav?.openPanel('result');
      else if (controller.state.hint) nav?.openPanel('hint');
    }
  }
  async function start(request: StartRequest) {
    if (blocked || !controller) return;
    const revision = routeRevision, current = controller, operation = ++startSequence;
    const relevant = () => !disposed && controller === current && routeRevision === revision && operation === startSequence;
    puzzleLoadFailed = false;
    await loadOfflineSupport();
    if (!relevant()) return;
    const started = await current.start(request);
    if (!relevant()) return;
    if (started) { pendingStart = undefined; nav?.go('board'); }
    else puzzleLoadFailed = true;
  }
  function chooseQuick(band: Band) {
    const existing = gameState.save?.attempts.find(attempt => attempt.role === 'quick');
    if (existing) {
      if (existing.status === 'completed') { void resume('quick', false, band); return; }
      pendingStart = { role: 'quick', band, authorization: 'replace', expectedCurrent: { generation: existing.generation, attemptId: existing.id } };
      if (existing.status === 'pending-completion') void resume('quick');
      else nav?.openPanel('replace');
    } else void start({ role: 'quick', band, authorization: 'initial' });
  }
  function continuePuzzle() {
    const attempt = gameState.attempt;
    if (!attempt || attempt.status !== 'completed') return;
    return start({ role: attempt.role, authorization: 'continue', band: continueBand ?? attempt.policy.band, leap: attempt.binding?.leap,
      expectedCurrent: { generation: attempt.generation, attemptId: attempt.id } });
  }
  async function replay(leap: number, replace: boolean) {
    const existing = gameState.save?.attempts.find(attempt => attempt.role === 'replay');
    if (existing && !replace) return resume('replay');
    return start({ role: 'replay', leap, authorization: existing ? existing.status === 'completed' ? 'continue' : 'replace' : 'initial',
      ...(existing ? { expectedCurrent: { generation: existing.generation, attemptId: existing.id } } : {}) });
  }
  async function changePreferences(next: Preferences) {
    if (blocked || !controller) return;
    const field = document.activeElement as HTMLElement | null, paneId = overlay?.id;
    actionBusy = true;
    try { await controller.preferences(next); }
    finally {
      actionBusy = false; await tick();
      if (field?.isConnected && paneId === overlay?.id && (document.activeElement === document.body || document.activeElement === field)) field.focus({preventScroll:true});
    }
  }
  function download(content: string | Blob, name: string) {
    const url = URL.createObjectURL(typeof content === 'string' ? new Blob([content], { type: 'application/json' }) : content);
    try {
      const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    } finally { setTimeout(() => URL.revokeObjectURL(url), 0); }
  }
  async function exportBackup() {
    if (blocked || !controller) return;
    const request = ++backupSequence, pane = overlay?.id;
    backupBusy = true; exportError = false;
    try {
      const result = await controller.exportBackup();
      if (request !== backupSequence || overlay?.id !== pane || disposed) return;
      exportError = result.kind !== 'committed';
      if (result.kind === 'committed') download(result.value.text, 'toadodu-backup.json');
    } catch { if (request === backupSequence && !disposed) exportError = true; }
    finally { if (request === backupSequence) backupBusy = false; }
  }
  function cancelBackupOperation() {
    if (gameState.restorePhase === 'activating') return;
    backupSequence++; controller?.cancelBackupWork(); backupBusy = false;
    recoveryAbort?.abort(); recoveryAbort = undefined; recoveryBusy = false; recoveryProblem = undefined;
    restorePreview = undefined; restoreError = false;
  }
  async function exportRecovery(event?: MouseEvent) {
    if (closingBlocked || recoveryBusy || gameState.restorePhase === 'activating') return;
    const trigger = event?.currentTarget instanceof HTMLButtonElement ? event.currentTarget : undefined, bootRevision = bootSequence;
    cancelBackupOperation();
    const request = ++backupSequence, revision = routeRevision, pane = overlay?.id;
    const abort = recoveryAbort = new AbortController();
    const current = () => !disposed && !abort.signal.aborted && request === backupSequence && revision === routeRevision && pane === overlay?.id;
    let local: string | undefined;
    recoveryBusy = true;
    try {
      if (controller && (controller.state.attempt || controller.state.save)) local = controller.exportRecovery().text;
      const needsStored = bootError || !controller || /^(corrupt|unsupported-future):/.test(gameState.problem ?? '');
      if (!needsStored && local) {
        if (current()) download(local, 'toadodu-emergency-recovery.json');
        return;
      }
      const { exportRawRecovery } = await import('./lib/storage/raw-recovery');
      if (!current()) return;
      const recovered = await exportRawRecovery(new URL(import.meta.env.BASE_URL, location.href), { signal: abort.signal });
      if (!current()) return;
      if (recovered.kind === 'committed') {
        // Blob parts avoid parsing or copying the potentially large stored JSON on the UI thread.
        const artifact = local ? new Blob([
          '{"application":"toadodu-recovery-bundle","version":1,"importableBackup":false,"local":', local,
          ',"database":', recovered.value.blob, '}',
        ], { type: 'application/json' }) : recovered.value.blob;
        if (artifact.size > recovered.value.summary.bytes + 2 * 1024 * 1024 + 256) throw new Error('Recovery bundle exceeds its bounded format');
        download(artifact, 'toadodu-stored-recovery.json');
      } else if (local) { download(local, 'toadodu-emergency-recovery.json'); recoveryProblem = 'partial'; }
      else recoveryProblem = 'unavailable';
    } catch {
      if (!current()) return;
      if (local) { download(local, 'toadodu-emergency-recovery.json'); recoveryProblem = 'partial'; }
      else recoveryProblem = 'unavailable';
    } finally {
      if (request === backupSequence) {
        recoveryBusy = false; recoveryAbort = undefined;
        await tick();
        if (current() && bootRevision === bootSequence && trigger?.isConnected && !trigger.disabled &&
          (document.activeElement === document.body || document.activeElement === trigger)) trigger.focus({ preventScroll: true });
      }
    }
  }
  async function restore(text: string, confirm: boolean) {
    if (blocked || !controller) return;
    const request = ++backupSequence, pane = overlay?.id;
    backupBusy = true; restoreError = false;
    try {
      if (!confirm) {
        const result = await controller.previewRestore(text);
        if (request !== backupSequence || overlay?.id !== pane || disposed) return;
        restorePreview = result.kind === 'committed' ? result.value : undefined; restoreError = result.kind !== 'committed';
      } else if (restorePreview) {
        const result = await controller.restore(restorePreview);
        if (request !== backupSequence || disposed) return;
        if (result) { bootError = false; restorePreview = undefined; nav?.quit(); await controller.initialize(); }
        else restoreError = true;
      }
    } finally { if (request === backupSequence) backupBusy = false; }
  }
  function handleKey(event: KeyboardEvent) {
    keyboard = true;
    if (event.repeat && ['Enter',' '].includes(event.key) && (event.target as HTMLElement).tagName === 'BUTTON') { event.preventDefault(); return; }
    if (event.key === 'Escape' && route !== 'more') {
      event.preventDefault(); controller?.cancelStart();
      if (route === 'board') nav?.quit(); else nav?.go('menu'); return;
    }
    const command = commandForKey(event, { active: inGame && gameState.canStudy && !blocked, modal: route === 'more',
      editable: !!(event.target as HTMLElement).closest('input,select,textarea,[contenteditable="true"]'),
      platform: /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'other', selection: selected });
    if (command) { event.preventDefault(); dispatch(command, true); }
  }
  function singleActivation(element: HTMLElement) {
    const guard = (event: MouseEvent) => { if (event.detail > 1) { event.preventDefault(); event.stopImmediatePropagation(); } };
    element.addEventListener('mousedown', guard, true); element.addEventListener('click', guard, true);
    return () => { element.removeEventListener('mousedown', guard, true); element.removeEventListener('click', guard, true); };
  }
  function visibility() { documentVisible = !document.hidden; if (document.hidden) offline?.cancel(); }
  async function pageShown() { if (controller?.state.attempt) await controller.checkAuthority(); documentVisible = !document.hidden; }
</script>

<svelte:window onkeydown={handleKey} onpointerdown={() => keyboard = false} onpagehide={() => documentVisible = false} onpageshow={pageShown} />
<svelte:document onvisibilitychange={visibility} />
<svelte:head><title>Toadodu</title><meta name="theme-color" content={pond.water.deep} /></svelte:head>

<main class="world" lang={locale} style={themeStyle()} {@attach singleActivation}>
  <div class="scene" bind:clientWidth={width} bind:clientHeight={height}>
    <Scene {layout} screen={inGame ? 'game' : 'menu'} {time} />
    {#if inGame}
      {#if gameState.canStudy && gameState.attempt}
        <section class="board" aria-label={a.board} bind:this={boardElement} style={rectStyle(layout.board)}>
          {#each layout.cells as cell (cell.id)}
            {@const clue = gameState.attempt.definition.givens[cell.id] !== '0'}
            {@const notes = Array.from({length:9},(_, i) => i + 1).filter(digit => gameState.attempt!.notes[cell.id] & (1 << (digit - 1)))}
            <button class="cell" data-cell={cell.id} data-clue={clue} data-conflict={conflicts.has(cell.id)} aria-pressed={selected === cell.id}
              aria-label={`${copy.cell(cell.row + 1, cell.column + 1)}, ${clue ? c.clue : a.entry}: ${values[cell.id] || (notes.length ? `${c.notes} ${notes.join(' ')}` : c.empty)}${conflicts.has(cell.id) ? `, ${a.conflict}` : ''}`}
              tabindex={selected === cell.id ? 0 : -1} style={rectStyle({...cell.rect,x:cell.rect.x-layout.board.x,y:cell.rect.y-layout.board.y})}
              onclick={() => dispatch({type:'select',cell:cell.id})} onfocus={() => { dispatch({type:'select',cell:cell.id}); focusedCell = cell.id; }} onblur={() => focusedCell = null}>
              <span class="anchor" style={rectStyle({ ...cell.anchor, x: cell.anchor.x - cell.rect.x, y: cell.anchor.y - cell.rect.y })}>
                <Leaf id={cell.id} selected={selected === cell.id} focused={keyboard && focusedCell === cell.id} value={values[cell.id] || undefined} {notes} {time} diameter={cell.anchor.width} />
                {#if conflicts.has(cell.id)}<span class="conflict-mark" aria-hidden="true" style:font-size={`${cell.anchor.width * .22}px`}>!</span>{/if}
              </span>
            </button>
          {/each}
        </section>
      {:else if !concealed}
        <section class="concealed" style={rectStyle(layout.board)} aria-label={c.paused}>
          <p>{gameState.attempt ? a.conflictView : a.choose}</p>
          {#if gameState.attempt}<button class="cream" disabled={blocked} onclick={() => gameState.conflictedChanges ? nav?.openPanel('recover') : resume(gameState.attempt!.role)}>{a.resumeHere}</button>{:else}<button class="cream" onclick={() => nav?.quit()}>{c.mainMenu}</button>{/if}
        </section>
      {/if}
      <nav class={['dock', { landscape: layout.landscape }]} aria-label={a.board} bind:this={dockElement} style={`${rectStyle(layout.dock)};--key:${layout.keySize}px`}>
        {#each [1,2,3,4,5,6,7,8,9] as number (number)}
          <button class="cream numeric" disabled={blocked || !gameState.canStudy || gameState.attempt?.status !== 'playing'} aria-label={String(number)} onclick={() => dispatch({type:'enter',digit:number},true)}>{number}</button>
        {/each}
        <button class={['cream', 'more', {'has-state': !!saveBadge}]} bind:this={moreButton} disabled={historyClosing} aria-label={`${copy.more}${gameState.attempt?.notesMode ? `, ${c.notes}` : ''}${saveBadge ? `, ${saveBadge}` : ''}`} aria-haspopup="dialog" onclick={() => nav?.openMore()}><span class="more-symbols"><Ellipsis aria-hidden="true" size={saveBadge ? 20 : 28} />{#if saveBadge && gameState.attempt?.notesMode}<Pencil aria-hidden="true" size={12} />{/if}</span>{#if saveBadge}<span class="save-label"><span>{saveBadge}</span></span>{:else if gameState.attempt?.notesMode}<span class="notes-mode"><Pencil aria-hidden="true" size={12} />{c.notes}</span>{/if}</button>
      </nav>
    {:else}
      <section class="identity" aria-label="Toadodu">
        <h1 style={`${rectStyle(layout.menuTitle)};font-size:${layout.titleFontSize}px;transform:translate(${titleFloat.x}px,${titleFloat.y}px)`}>Toadodu</h1>
        <div class="art-slot" style={`${rectStyle(layout.menuArt)};transform:translate(${artFloat.x}px,${artFloat.y}px)`}><img class="menu-art" src={menuSketch} alt={copy.art} width="1254" height="1254" draggable="false" decoding="async" /></div>
      </section>
      <nav class="menu-panel" aria-label={route === 'quick' ? copy.quick : route === 'progression' ? copy.progression : 'Toadodu'} bind:this={menuElement} style={`${rectStyle(layout.menuPanel)};--action:${layout.menuActionHeight}px`}>
        {#if route === 'menu' || route === 'more'}
          <button class="cream" disabled={blocked} onclick={() => nav?.go('quick')}>{copy.quick}</button>
          <button class="cream" disabled={blocked || gameState.durability === 'ephemeral'} onclick={() => nav?.go('progression')}>{copy.progression}</button>
        {:else if route === 'quick'}
          <h2>{copy.quick}</h2>
          <div class="difficulty">{#each ['easy','medium','hard'] as band (band)}<button class="cream" disabled={blocked || !controller} onclick={() => chooseQuick(band as Band)}>{copy[band as Band]}</button>{/each}</div>
          {#if gameState.save?.attempts.some(attempt => attempt.role === 'quick')}<button class="cream" disabled={blocked} onclick={() => resume('quick')}>{a.resume}<ArrowRight size={20} /></button>{/if}
          <button class="cream" onclick={() => {controller?.cancelStart();nav?.go('menu');}}>{copy.back}</button>
        {:else}
          <h2>{copy.progression}</h2>
          <button class="cream" disabled={blocked || !controller} onclick={() => gameState.save?.attempts.some(attempt => attempt.role === 'frontier') ? resume('frontier') : start({role:'frontier',authorization:'initial'})}>{gameState.save?.attempts.some(attempt => attempt.role === 'frontier') ? a.resume : a.start}</button>
          <button class="cream" disabled={blocked || !gameState.save?.profile.highestCompletedLeap} onclick={() => nav?.openPanel('replay')}>{a.replay}</button>
          <button class="cream" onclick={() => {controller?.cancelStart();nav?.go('menu');}}>{copy.back}</button>
        {/if}
      </nav>
      <button class="cream menu-more" aria-label={copy.more} disabled={blocked || !controller} onclick={() => nav?.openPanel('settings')} style={`right:0;bottom:0;width:${layout.keySize}px;height:${layout.keySize}px`}><Ellipsis size={28} /></button>
      {#if booting || gameState.busy}
        <p class="scene-status" role="status">{a.loading}</p>
      {:else if bootError}
        <div class="scene-status" role="alert">
          <p>{a.storageError}</p><button class="cream" onclick={boot}>{a.retry}</button>
          {#if controller}<button class="cream" disabled={blocked} onclick={() => nav?.openPanel('backup')}>{c.restore}</button>{/if}
          <button class="cream" disabled={closingBlocked || recoveryBusy} onclick={exportRecovery}>{a.recovery}</button>
          <p>{c.emergencyHelp}</p>
          {#if recoveryBusy}<p role="status">{a.loading}</p>{/if}
          {#if recoveryProblem}<p role="status">{recoveryProblem === 'partial' ? c.recoveryPartial : c.recoveryUnavailable}</p>{/if}
          <button class="cream" onclick={playWithoutSaving}>{a.unscored}</button><p>{a.unscoredHelp}</p>
        </div>
      {:else if gameState.problem}<p class="scene-status" role="status">{a.loadError}</p>{/if}
    {/if}
  </div>
  {#if route === 'more' && overlay}
    {#if DialogComponent}
    <DialogComponent view={overlay.panel} {locale} {pwa} {install} {offline} {offlineUnavailable} attempt={gameState.canStudy || ['settings','restart','result'].includes(overlay.panel) ? gameState.attempt : undefined} replayAttempt={gameState.save?.attempts.find(attempt => attempt.role === 'replay')} profile={gameState.save?.profile} {preferences} preferencesAvailable={!!gameState.save}
      puzzleProblem={puzzleLoadFailed ? a.puzzleUnavailable : undefined} receipt={gameState.receipt} {continueBand} hint={gameState.canStudy ? gameState.hint : undefined} {hintProblem} busy={blocked || gameState.hintComputing} {closingBlocked} {saveState} {anchor} restorePreview={restorePreview?.summary} {restoreError} {exportError} {recoveryBusy} {recoveryProblem}
      onCommand={command => dispatch(command)} onNavigate={navigatePanel} onClose={closeDialog} onPreference={changePreferences}
      onHint={async choice => { if (!blocked) await controller?.requestHint(choice); }} onContinue={continuePuzzle} onReplay={replay}
      onRestart={async () => { if (blocked || !controller) return; if (await controller.restart()) {focusReason='tool';historyClosing=true;nav?.closeAll();} }}
      onReplace={async confirm => { if (confirm && pendingStart) await start(pendingStart); else {pendingStart=undefined;await closeDialog('dismiss');} }}
      onExport={exportBackup} onRecovery={exportRecovery} onRestore={restore} onRestoreInput={cancelBackupOperation} onResumeSaved={async confirm => { if (confirm && gameState.attempt) await resume(gameState.attempt.role, true); }} onRetry={gameState.durability === 'ephemeral' || gameState.conflictedChanges ? undefined : async () => { await controller?.retry(); }} />
    {:else}
      <dialog aria-label={c.game} {@attach loadingDialog} oncancel={event => {event.preventDefault();void closeDialog('dismiss');}}>
        <p role="status">{dialogError ? a.featureLoadError : a.loading}</p>
        {#if dialogError}
          <button class="cream" onclick={loadDialog}>{a.retry}</button>
          {#if gameState.attempt && gameState.saveState !== 'saved'}<p>{a.reloadWarning}</p><button class="cream" onclick={exportRecovery}>{a.recovery}</button>{/if}
          <p>{a.reopenHelp}</p>
        {/if}
        <button class="cream" onclick={() => closeDialog('dismiss')}>{c.close}</button>
      </dialog>
    {/if}
  {/if}
  <div class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
</main>
