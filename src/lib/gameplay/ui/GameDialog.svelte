<script lang="ts">
  import { tick } from 'svelte';
  import X from '@lucide/svelte/icons/x';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Pencil from '@lucide/svelte/icons/pencil';
  import Undo2 from '@lucide/svelte/icons/undo-2';
  import Eraser from '@lucide/svelte/icons/eraser';
  import Lightbulb from '@lucide/svelte/icons/lightbulb';
  import Expand from '@lucide/svelte/icons/expand';
  import Pause from '@lucide/svelte/icons/pause';
  import Settings from '@lucide/svelte/icons/settings';
  import House from '@lucide/svelte/icons/house';
  import Download from '@lucide/svelte/icons/download';
  import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
  import Droplet from '@lucide/svelte/icons/droplet';
  import Footprints from '@lucide/svelte/icons/footprints';
  import Sprout from '@lucide/svelte/icons/sprout';
  import { appCopy } from '../app-copy';
  import { themeCopy } from '../../theme/copy';
  import { THEME_CHOICES as themeChoices, APPEARANCE_CHOICES as appearanceChoices } from '../../theme/policy';
  import { uiCopy, describeHint, formatElapsed } from './copy';
  import { bandForPool, poolForLeap } from '../../modes';
  import type { CloseReason, DialogView, GameDialogProps } from './types';
  import type { SessionCommand } from '../../session';
  let { view, locale, attempt, replayAttempt, profile, preferences, preferencesAvailable = true, themeError = false, activeThemeId, automaticThemeInfo, onThemeRetry, onThemeReload, receipt, continueBand, hint, hintProblem, busy = false, closingBlocked = false, saveState = 'saved', restorePreview, restoreError = false, exportError = false, recoveryProblem, recoveryBusy = false, anchor,
    onCommand, onNavigate, onClose, onPreference, onHint, onContinue, onReplay, onRestart, onReplace, onExport, onRecovery, onResumeSaved, onRestore, onRestoreInput, onRetry }: GameDialogProps = $props();
  const c = $derived(uiCopy[locale]);
  const themeText = $derived(themeCopy[locale]);
  let viewportWidth = $state(window.innerWidth), viewportHeight = $state(window.innerHeight);
  let selectedLeap = $state(1), confirmReplay = $state(false), restoreText = $state(''), previewedText = $state(''), fileError = $state(false), fileName = $state('');
  let fileReadId = 0, hintRequestId = 0;
  const frozen = $derived(!attempt || attempt.status !== 'playing');
  const selected = $derived(attempt?.selection ?? 0);
  const clue = $derived(attempt ? Number(attempt.definition.givens[selected]) : 0);
  const value = $derived(clue || attempt?.entries[selected] || 0);
  const notes = $derived(attempt?.notes[selected] ?? 0);
  const canErase = $derived(!frozen && !clue && !!(value || notes));
  const canRecover = $derived(!!onRecovery && (exportError || ['unsaved', 'conflict', 'unavailable'].includes(saveState)));
  const title = $derived(view === 'more' ? c.game : view === 'settings' ? c.settings : view === 'notes' ? c.cell(Math.floor(selected / 9) + 1, selected % 9 + 1) : view === 'result' ? c.completed : view === 'pause' ? c.paused : view === 'replay' ? c.replay : view === 'backup' ? c.backup : view === 'restart' ? c.restartTitle : view === 'replace' ? c.replaceTitle : view === 'recover' ? c.recoverTitle : c.hint);
  const hintDescription = $derived(hint ? describeHint(hint, locale) : undefined);
  const popoverStyle = $derived.by(() => {
    if (view !== 'more' || !anchor) return '';
    const right = Math.max(8, anchor.landscape ? viewportWidth - anchor.left + 8 : viewportWidth - anchor.left - anchor.width);
    const bottom = Math.max(8, anchor.landscape ? viewportHeight - anchor.top - anchor.height : viewportHeight - anchor.top + 8);
    const safeBottom = bottom > viewportHeight - 180 ? 8 : bottom;
    // CSS clamps these desired coordinates against its current viewport and actual popup width.
    return `--anchor-right:${right}px;--anchor-bottom:${safeBottom}px`;
  });
  function mountDialog(node: HTMLDialogElement) {
    node.showModal();
    $effect(() => {
      const pane = view;
      void tick().then(() => { if (node.isConnected && view === pane) { node.scrollTop = 0; node.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true }); } });
    });
    return () => { fileReadId++; hintRequestId++; node.close(); };
  }
  function keyboard(event: KeyboardEvent) {
    event.stopPropagation();
    if (event.repeat && ['Enter', ' '].includes(event.key) && (event.target as HTMLElement).tagName === 'BUTTON') { event.preventDefault(); return; }
    if (event.key !== 'Tab') return;
    const node = event.currentTarget as HTMLDialogElement;
    const controls = [...node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(el => el.getClientRects().length > 0);
    if (!controls.length) { event.preventDefault(); return; }
    const first = controls[0], last = controls.at(-1)!;
    if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) { event.preventDefault(); first.focus(); }
  }
  function outside(event: MouseEvent) {
    if (event.target !== event.currentTarget) return;
    const rect = (event.currentTarget as HTMLDialogElement).getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) { event.preventDefault(); event.stopPropagation(); if (!closingBlocked) void onClose('dismiss'); }
  }
  async function tool(command: SessionCommand, reason: CloseReason = 'tool') { await onCommand(command); await onClose(reason); }
  function navigate(next: DialogView) { return onNavigate(next); }
  async function readBackup(event: Event) {
    onRestoreInput?.();
    const id = ++fileReadId, file = (event.currentTarget as HTMLInputElement).files?.[0];
    restoreText = ''; previewedText = ''; fileError = false;
    fileName = file?.name ?? '';
    if (!file) return;
    if (file.size > 128 * 1024 * 1024) { fileError = true; return; }
    try { const text = await file.text(); if (id === fileReadId) restoreText = text; } catch { if (id === fileReadId) fileError = true; }
  }
  async function previewBackup(event: MouseEvent) {
    const trigger = event.currentTarget as HTMLButtonElement, text = restoreText, readId = fileReadId;
    previewedText = text; await onRestore(text, false); await tick();
    if (!trigger.isConnected || view !== 'backup' || fileReadId !== readId || restoreText !== text || previewedText !== text) return;
    const active = document.activeElement;
    if (active !== document.body && active !== trigger) return;
    const heading = trigger.closest('dialog')?.querySelector<HTMLElement>('#backup-preview-title');
    if (heading) heading.focus(); else if (active === document.body) trigger.focus();
  }
  async function requestHint(event:MouseEvent,choice:'logical'|'reveal') {
    if(!attempt)return;const request=++hintRequestId,trigger=event.currentTarget as HTMLButtonElement,id=attempt.id,revision=attempt.logicalRevision,target=attempt.selection;
    await onHint(choice);await tick();
    if(request!==hintRequestId||!trigger.isConnected||view!=='hint'||attempt?.id!==id||attempt.logicalRevision!==revision||attempt.selection!==target)return;
    const active=document.activeElement;if(active!==document.body&&active!==trigger)return;
    const heading=!hintProblem&&hintDescription?trigger.closest('dialog')?.querySelector<HTMLElement>('#hint-result-title'):undefined;
    if(heading)heading.focus();else if(active===document.body)trigger.focus();
  }
  async function exportWithFocus(event: MouseEvent, action: () => void | Promise<void>) {
    const trigger=event.currentTarget as HTMLButtonElement,pane=view,readId=fileReadId,attemptId=attempt?.id;
    await action();await tick();
    if(!trigger.isConnected||trigger.disabled||view!==pane||fileReadId!==readId||attempt?.id!==attemptId)return;
    if(document.activeElement===document.body||document.activeElement===trigger)trigger.focus();
  }
  async function editorCommand(event:MouseEvent,command:SessionCommand){
    const trigger=event.currentTarget as HTMLButtonElement,dialog=trigger.closest('dialog'),id=attempt?.id,generation=attempt?.generation;
    await onCommand(command);await tick();
    if(!dialog?.isConnected||!trigger.isConnected||view!=='notes'||!attempt||attempt.id!==id||attempt.generation!==generation)return;
    if(document.activeElement!==document.body&&document.activeElement!==trigger)return;
    if(!trigger.disabled)trigger.focus();else dialog.querySelector<HTMLElement>('#game-dialog-title')?.focus();
  }
  function backTarget(): DialogView { return view === 'backup' || view === 'restart' ? 'settings' : 'more'; }
</script>

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<dialog class={['game-dialog', view === 'more' ? 'popover' : 'sheet']} style={popoverStyle} lang={locale} aria-labelledby="game-dialog-title"
  {@attach mountDialog} onkeydown={keyboard} onclick={outside} oncancel={event => { event.preventDefault(); event.stopPropagation(); if (!closingBlocked) void onClose('dismiss'); }}>
  <header>
    {#if !['more', 'result', 'pause', 'replace', 'replay', 'recover'].includes(view)}<button class="icon-button back" disabled={closingBlocked} aria-label={c.back} onclick={() => navigate(backTarget())}><ArrowLeft size={22} /></button>{/if}
    <h2 id="game-dialog-title" tabindex="-1">{title}</h2>
    <button class="icon-button close" disabled={closingBlocked} aria-label={c.close} onclick={() => onClose('dismiss')}><X size={22} /></button>
  </header>
  {#if view === 'more' && attempt?.scored === false || view === 'result' && receipt?.scored === false}<p class="eligibility">{c.unscoredIdentity}</p>{/if}

  {#if view === 'more'}
    <div class="more-groups">
      <section aria-labelledby="tools-heading"><h3 id="tools-heading">{c.tools}</h3>
        {#if attempt?.status === 'completed'}
        <button class="tool-row" disabled={busy || !receipt} onclick={() => navigate('result')}><ArrowRight size={20} /><span>{c.viewResult}</span></button>
        {:else}
        <button class="tool-row" aria-pressed={attempt?.notesMode ?? false} disabled={busy || frozen} onclick={() => tool({ type: 'toggle-notes' })}><Pencil size={20} /><span>{c.notes}</span><span class="toggle" aria-hidden="true">{attempt?.notesMode ? '✓' : ''}</span></button>
        <button class="tool-row" disabled={busy || frozen || !attempt?.undo.length} onclick={() => tool({ type: 'undo' }, 'undo')}><Undo2 size={20} /><span>{c.undo}</span></button>
        <button class="tool-row" disabled={busy || !canErase} onclick={() => tool({ type: 'erase' })}><Eraser size={20} /><span>{c.erase}</span></button>
        <button class="tool-row" disabled={busy || frozen} onclick={() => navigate('hint')}><Lightbulb size={20} /><span>{c.hint}</span></button>
        {/if}
        <button class="tool-row" disabled={busy || !attempt} onclick={() => navigate('notes')}><Expand size={20} /><span>{c.largerCell}</span></button>
      </section>
      <section aria-labelledby="menu-heading"><h3 id="menu-heading">{c.menu}</h3>
        {#if attempt?.status !== 'completed'}<button class="tool-row" disabled={busy || frozen} onclick={() => navigate('pause')}><Pause size={20} /><span>{c.pause}</span></button>{/if}
        <button class="tool-row" disabled={busy} onclick={() => navigate('settings')}><Settings size={20} /><span>{c.settings}</span></button>
        <button class="tool-row" disabled={busy} onclick={() => onClose('menu')}><House size={20} /><span>{c.mainMenu}</span></button>
      </section>
    </div>
  {:else if view === 'settings'}
    <div class="pane settings-pane">
      {#if themeError}
        <p role="status">{themeText.failed}</p>
        <button class="secondary" onclick={onThemeRetry}>{themeText.retry}</button>
        {#if attempt && saveState !== 'saved'}<p>{appCopy[locale].reloadWarning}</p><button class="secondary" disabled={recoveryBusy || !onRecovery} onclick={event => exportWithFocus(event,() => onRecovery?.())}>{c.emergencyExport}</button>{/if}
        <button class="secondary" onclick={onThemeReload}>{appCopy[locale].reload}</button>
      {/if}
      <label>{themeText.theme}<select aria-describedby={preferences.theme === 'auto' && automaticThemeInfo && (automaticThemeInfo.transition || automaticThemeInfo.remaining) ? 'automatic-theme-description' : undefined} value={preferences.theme} disabled={busy || !preferencesAvailable} onchange={event => onPreference({ ...preferences, theme: event.currentTarget.value })}>
        {#if !themeChoices.includes(preferences.theme as typeof themeChoices[number])}<option value={preferences.theme} disabled>{themeText.unknown}</option>{/if}
        {#each themeChoices as choice (choice)}<option value={choice}>{themeText[choice]}{#if choice === 'auto' && activeThemeId}&nbsp;·&nbsp;{themeText[activeThemeId]}{/if}</option>{/each}
      </select></label>
      {#if preferences.theme === 'auto' && automaticThemeInfo && (automaticThemeInfo.transition || automaticThemeInfo.remaining)}
        <p id="automatic-theme-description" class="theme-summary">
          {#if automaticThemeInfo.transition && !themeError}<span>{automaticThemeInfo.transition}</span>{/if}
          {#if automaticThemeInfo.remaining}<span>{automaticThemeInfo.remaining}</span>{/if}
        </p>
      {/if}
      <label>{themeText.appearance}<select value={preferences.appearance} disabled={busy || !preferencesAvailable} onchange={event => onPreference({ ...preferences, appearance: event.currentTarget.value })}>
        {#if !appearanceChoices.includes(preferences.appearance as typeof appearanceChoices[number])}<option value={preferences.appearance} disabled>{themeText.unknown}</option>{/if}
        {#each appearanceChoices as choice (choice)}<option value={choice}>{themeText[choice]}</option>{/each}
      </select></label>
      <label>{c.language}<select value={preferences.language} disabled={busy || !preferencesAvailable} onchange={event => onPreference({ ...preferences, language: event.currentTarget.value as 'en' | 'de' | 'es' })}><option value="en">English</option><option value="de">Deutsch</option><option value="es">Español</option></select></label>
      <label>{c.motion}<select value={preferences.motion} disabled={busy || !preferencesAvailable} onchange={event => onPreference({ ...preferences, motion: event.currentTarget.value as 'system' | 'reduced' | 'full' })}><option value="system">{c.system}</option><option value="reduced">{c.reduced}</option><option value="full">{c.full}</option></select></label>
      <label>{c.boardShape}<select value={preferences.boardShape} disabled={busy || !preferencesAvailable} onchange={event => onPreference({ ...preferences, boardShape: event.currentTarget.value as 'fill' | 'square' })}><option value="fill">{c.fill}</option><option value="square">{c.square}</option></select></label>
      <details class="session-info"><summary>{c.session}</summary><dl>
        {#if attempt}<div><dt>{c[attempt.role]}</dt><dd>{c[attempt.policy.band]}</dd></div><div><dt>{c.elapsed}</dt><dd>{formatElapsed(attempt.elapsedMs)}</dd></div>{/if}
        {#if profile}<div><dt class="metric-label"><Sprout size={18} aria-hidden="true" /><span>{c.metamorphosis}</span></dt><dd>{profile.frontier.metamorphosis}</dd></div><div><dt class="metric-label"><Footprints size={18} aria-hidden="true" /><span>{c.leap}</span></dt><dd>{profile.frontier.leap}</dd></div><div><dt class="metric-label"><Droplet size={18} aria-hidden="true" /><span>{c.wallet}</span></dt><dd>{profile.wallet}</dd></div>{/if}
      </dl><p>{c.rewardHelp}</p></details>
      <button class="secondary" disabled={busy} onclick={() => navigate('backup')}><Download size={20} />{c.backup}</button>
      {#if attempt}<button class="secondary" disabled={busy || frozen} onclick={() => navigate('restart')}><RotateCcw size={20} />{c.restart}</button>{/if}
      {#if attempt}<button class="secondary" disabled={busy || frozen} onclick={() => navigate('replace')}><ArrowRight size={20} /><span>{c.newPuzzle}</span></button>{/if}
    </div>
  {:else if view === 'notes' && attempt}
    <div class="pane notes-pane"><p>{clue ? c.clue : c.editable}</p>
      <div class="large-cell" aria-label={`${c.value}: ${value || c.empty}`}>
        {#if value}<strong>{value}</strong>{:else}<div class="note-specimen" aria-label={c.notes}>{#each [1,2,3,4,5,6,7,8,9] as digit (digit)}<span>{notes & (1 << (digit - 1)) ? digit : ''}</span>{/each}</div>{/if}
      </div>
      <button class="secondary" aria-pressed={attempt.notesMode} disabled={busy || frozen} onclick={() => onCommand({ type: 'toggle-notes' })}><Pencil size={20} />{c.notes}<span class="toggle" aria-hidden="true">{attempt.notesMode ? '✓' : ''}</span></button>
      <p>{attempt.notesMode ? value ? c.filledNotes : c.noteHelp : c.entryHelp}</p>
      <div class="large-keys" aria-label={attempt.notesMode ? c.notes : c.value}>{#each [1,2,3,4,5,6,7,8,9] as digit (digit)}<button aria-label={attempt.notesMode ? c.note(digit) : String(digit)} aria-pressed={attempt.notesMode ? !!(notes & (1 << (digit - 1))) : undefined} disabled={busy || frozen || !!clue || attempt.notesMode && !!value} onclick={() => onCommand({ type: 'enter', digit })}>{digit}</button>{/each}</div>
      <div class="inline-actions"><button class="secondary" disabled={busy || frozen || !attempt.undo.length} onclick={event => editorCommand(event,{ type: 'undo' })}><Undo2 size={20} /><span>{c.undo}</span></button><button class="secondary" disabled={busy || !canErase} onclick={event => editorCommand(event,{ type: 'erase' })}><Eraser size={20} /><span>{c.erase}</span></button></div>
    </div>
  {:else if view === 'hint'}
    <div class="pane hint-pane">
      {#if !busy && hintProblem}<p role="status">{hintProblem==='no-step'?!frozen&&!clue&&!value?c.noStep:c.noTarget:hintProblem==='no-target'?c.noTarget:c.hintUnavailable}</p>{:else if !busy && hintDescription}<p role="status">{c.hintReady}</p>{/if}
      {#if hintDescription}<h3 id="hint-result-title" tabindex="-1">{hintDescription.title}</h3><p>{hintDescription.reason}</p>{#if hintDescription.placements.length}<h4>{c.placements}</h4><ul>{#each hintDescription.placements as placement (placement)}<li>{placement}</li>{/each}</ul>{/if}{#if hintDescription.eliminations.length}<h4>{c.eliminations}</h4><ul>{#each hintDescription.eliminations as elimination (elimination)}<li>{elimination}</li>{/each}</ul>{/if}{:else}<p>{c.noHint}</p>{/if}
      <p class="quiet">{c.hintHelp}</p><button class="primary" disabled={busy || frozen} onclick={event => requestHint(event,'logical')}><Lightbulb size={20} />{c.logicalHint}</button>
      <button class="secondary" disabled={busy || frozen || !!clue || !!value} onclick={event => requestHint(event,'reveal')}>{c.reveal}</button>{#if (clue || value) && hintProblem!=='no-target' && hintProblem!=='no-step'}<p>{c.noTarget}</p>{/if}
    </div>
  {:else if view === 'pause'}
    <div class="pane"><p>{c.pauseHelp}</p><button class="primary" disabled={busy} onclick={() => onClose('dismiss')}>{c.resume}<ArrowRight size={20} /></button></div>
  {:else if view === 'result' && receipt}
    <div class="pane result-pane"><p class="reward-total"><span class="reward-amount"><Droplet size={36} aria-hidden="true" /><strong>{receipt.result.dewdrops}</strong></span><span>{c.earned}</span></p><dl>
      <div><dt>{c.base}</dt><dd>{receipt.result.base}</dd></div><div><dt>{c.credit}</dt><dd>{receipt.result.blanks - receipt.result.exposed}/{receipt.result.blanks}</dd></div><div><dt>{c.bonus}</dt><dd>{receipt.result.bonusBasisPoints / 100}%</dd></div>
    </dl><button class="primary" disabled={busy} onclick={onContinue}>{continueBand ? c.continue+' · '+c[continueBand] : c.continue}<ArrowRight size={20} /></button></div>
  {:else if view === 'replay'}
    <div class="pane"><p>{c.replayHelp}</p><label>{c.chooseLeap}<select bind:value={selectedLeap} disabled={busy || !profile?.highestCompletedLeap}>{#each Array.from({ length: profile?.highestCompletedLeap ?? 0 }, (_, i) => i + 1) as leap (leap)}<option value={leap}>{c.leap} {leap} · {c[bandForPool(poolForLeap(leap))]}</option>{/each}</select></label>
      {#if replayAttempt}<button class="secondary" disabled={busy} onclick={() => onReplay(replayAttempt?.binding?.leap ?? 1, false)}>{c.resumeReplay}</button>{/if}
      {#if replayAttempt?.status === 'completed'}<button class="primary" disabled={busy || !profile?.highestCompletedLeap} onclick={() => onReplay(selectedLeap, true)}>{c.continueLeap(selectedLeap)}<ArrowRight size={20} /></button>
      {:else if confirmReplay}<p>{c.replaceHelp}</p><button class="primary" disabled={busy || replayAttempt?.status !== 'playing'} onclick={() => onReplay(selectedLeap, true)}>{c.replaceReplay}</button><button class="secondary" disabled={busy} onclick={() => confirmReplay = false}>{c.cancel}</button>{:else}<button class="primary" disabled={busy || !profile?.highestCompletedLeap || replayAttempt?.status === 'pending-completion'} onclick={() => replayAttempt && replayAttempt.status === 'playing' ? confirmReplay = true : onReplay(selectedLeap, false)}>{c.startReplay}<ArrowRight size={20} /></button>{/if}
    </div>
  {:else if view === 'backup'}
    {#if exportError}<p role="alert">{c.exportFailed}</p>{/if}
    {#if canRecover}<div class="pane"><p>{c.emergencyHelp}</p><button class="secondary" disabled={closingBlocked || recoveryBusy} onclick={event => exportWithFocus(event,() => onRecovery?.())}><Download size={20} /><span>{c.emergencyExport}</span></button></div>{/if}
    <div class="pane"><p>{c.backupHelp}</p><button class="secondary" disabled={busy} onclick={event => exportWithFocus(event,onExport)}><Download size={20} /><span>{c.export}</span></button><label class="file-label" data-disabled={busy} for="game-backup-file" onpointerdown={event => { if (busy) event.preventDefault(); }}>{c.chooseFile}<input class="file-input" id="game-backup-file" type="file" accept="application/json,.json" disabled={busy} onchange={readBackup} /></label>{#if fileName}<p class="file-name">{fileName}</p>{/if}<button class="secondary" disabled={busy || !restoreText} onclick={previewBackup}>{c.preview}</button>
      {#if restoreError || fileError}<p role="alert">{c.restoreInvalid}</p>{/if}
      {#if restoreText && restorePreview && previewedText === restoreText}<section aria-labelledby="backup-preview-title"><h3 id="backup-preview-title" tabindex="-1">{c.reviewBackup}</h3><p role="status">{c.previewReady}</p><dl><div><dt>{c.currentWallet}</dt><dd>{restorePreview.replaceWallet}</dd></div><div><dt>{c.importedWallet}</dt><dd>{restorePreview.importedWallet}</dd></div><div><dt>{c.activeAttempts}</dt><dd>{restorePreview.activeAttempts}</dd></div><div><dt>{c.receipts}</dt><dd>{restorePreview.receipts}</dd></div><div><dt>{c.issued}</dt><dd>{restorePreview.issued}</dd></div></dl><button class="primary" disabled={busy} onclick={() => onRestore(restoreText, true)}>{c.confirmRestore}</button><button class="secondary" disabled={busy} onclick={() => { restoreText = ''; previewedText = ''; }}>{c.cancel}</button></section>{/if}
    </div>
  {:else if view === 'restart' || view === 'replace'}
    <div class="pane"><p>{view === 'restart' ? c.restartHelp : c.replaceHelp}</p><button class="secondary" disabled={busy} onclick={() => view === 'restart' ? navigate('settings') : onReplace?.(false)}>{c.cancel}</button><button class="primary" disabled={busy || view === 'replace' && !onReplace} onclick={() => view === 'restart' ? onRestart(true) : onReplace?.(true)}>{view === 'restart' ? c.restart : c.replace}</button></div>
  {:else if view === 'recover'}
    <div class="pane"><p>{c.recoverHelp}</p><button class="secondary" disabled={closingBlocked || recoveryBusy || !onRecovery} onclick={event => exportWithFocus(event,() => onRecovery?.())}><Download size={20} /><span>{c.emergencyExport}</span></button><button class="primary" disabled={busy || !onResumeSaved} onclick={() => onResumeSaved?.(true)}>{c.resumeSaved}<ArrowRight size={20} /></button><button class="secondary" disabled={closingBlocked} onclick={() => onClose('dismiss')}>{c.cancel}</button></div>
  {/if}
  {#if recoveryProblem}<p role="status">{recoveryProblem==='partial'?c.recoveryPartial:c.recoveryUnavailable}</p>{/if}
  {#if saveState !== 'saved'}<footer><p role="status">{c[saveState]}</p>{#if onRetry && ['unsaved', 'unavailable'].includes(saveState)}<button class="secondary" disabled={busy} onclick={onRetry}>{c.retry}</button>{/if}{#if canRecover && view !== 'backup' && view !== 'recover'}<p>{c.emergencyHelp}</p><button class="secondary" disabled={closingBlocked || recoveryBusy} onclick={event => exportWithFocus(event,() => onRecovery?.())}><Download size={20} /><span>{c.emergencyExport}</span></button>{/if}</footer>{/if}
</dialog>

<style>
  .game-dialog { position: fixed; box-sizing: border-box; padding: 8px; border: 1px solid var(--dialog-edge); border-radius: var(--dialog-radius); background: var(--dialog-surface); color: var(--dialog-ink); font: 500 1rem/1.3 var(--font-ui); width: min(448px, calc(100vw - 16px)); max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px); overflow: auto; overflow-wrap: anywhere; overscroll-behavior: contain; }
  .game-dialog::backdrop { background: var(--dialog-backdrop); }
  .popover { --popover-width: min(384px, calc(100vw - 16px)); --popover-right: clamp(8px, var(--anchor-right, 8px), calc(100vw - var(--popover-width) - 8px)); --popover-bottom: clamp(8px, var(--anchor-bottom, 8px), max(8px, calc(100dvh - 180px))); margin: 0; width: var(--popover-width); inset: auto var(--popover-right) var(--popover-bottom) auto; max-height: max(0px, calc(100dvh - var(--popover-bottom) - 8px)); }
  .sheet { margin: auto; }
  header { display: flex; align-items: center; gap: 4px; min-height: 44px; }
  h2 { flex: 1; margin: 0; font-size: 1.35rem; line-height: 1.2; overflow-wrap: anywhere; }
  h2:focus { outline: none; }
  h3 { font-size: 1rem; margin: 8px 0 4px; }
  h4 { margin: 8px 0 4px; }
  p { margin: 8px 0; }
  button, select, input { box-sizing: border-box; color: inherit; font: inherit; }
  button { cursor: pointer; border: 0; border-radius: var(--button-radius); min-height: 44px; padding: 8px; display: inline-flex; justify-content: center; align-items: center; gap: 8px; white-space: normal; overflow-wrap: anywhere; }
  button:disabled { cursor: default; opacity: .48; }
  button:focus-visible, select:focus-visible, input:focus-visible { outline: 2px solid var(--control-focus); outline-offset: 2px; }
  button :global(svg) { flex-shrink: 0; }
  button > span { min-width: 0; overflow-wrap: anywhere; }
  .icon-button { width: 44px; min-width: 44px; height: 44px; background: transparent; }
  .more-groups { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
  .more-groups section { min-width: 0; }
  .more-groups section + section { border-left: 1px solid var(--control-lip); padding-left: 8px; }
  .tool-row { width: 100%; justify-content: flex-start; text-align: left; padding: 8px 4px; gap: 4px; background: transparent; }
  .tool-row:hover:not(:disabled), .tool-row[aria-pressed="true"] { background: var(--leaf-face); color: var(--leaf-ink); }
  .tool-row span:not(.toggle) { flex: 1; min-width: 0; }
  .toggle { display: inline-grid; place-items: center; border: 1px solid currentColor; border-radius: 12px; height: 20px; min-width: 24px; font-size: .85rem; }
  [aria-pressed="true"] .toggle { background: var(--control-selected-face); color: var(--control-selected-ink); }
  .pane { display: flex; flex-direction: column; gap: 8px; }
  .pane p { margin: 0; }
  .pane > :first-child { margin-top: 8px; }
  .primary, .secondary, .large-keys button, select, input:not(.file-input), .file-label { box-shadow: inset 0 0 0 var(--control-edge-width) var(--control-edge); }
  .primary { background: var(--control-selected-face); color: var(--control-selected-ink); width: 100%; box-shadow: inset 0 0 0 var(--control-edge-width) var(--control-selected-edge); }
  .secondary { background: var(--control-lip); width: 100%; }
  label { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .file-label { position: relative; min-height: 44px; box-sizing: border-box; justify-content: center; padding: 8px; border-radius: 12px; background: var(--control-lip); cursor: pointer; overflow-wrap: anywhere; }
  .file-label:focus-within { outline: 2px solid var(--control-focus); outline-offset: 2px; }
  .file-label[data-disabled="true"] { opacity: .48; cursor: default; }
  .file-input { position: absolute; width: 1px; height: 1px; min-height: 0; padding: 0; border: 0; clip-path: inset(50%); overflow: hidden; }
  .file-name { overflow-wrap: anywhere; }
  select, input { min-width: 0; width: 100%; min-height: 44px; padding: 8px; border: 1px solid var(--dialog-edge); border-radius: 8px; background: var(--control-face); color: var(--control-ink); }
  .theme-summary { font-size: .9rem; line-height: 1.4; }
  .theme-summary span { display: block; }
  .session-info { border-top: 1px solid var(--control-lip); }
  summary { min-height: 44px; box-sizing: border-box; padding: 8px; cursor: pointer; }
  summary:focus-visible { outline: 2px solid var(--control-focus); outline-offset: -2px; border-radius: 8px; }
  dl { margin: 8px 0; }
  dl > div { display: flex; gap: 8px; justify-content: space-between; padding: 4px 0; }
  dt { min-width: 0; overflow-wrap: anywhere; }
  .metric-label { display: inline-flex; align-items: center; gap: 4px; }
  .metric-label :global(svg), .reward-amount :global(svg) { flex-shrink: 0; }
  dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
  .large-cell { color: var(--leaf-ink); background: var(--leaf-face); border-radius: 32px; width: 160px; height: 160px; align-self: center; display: grid; place-items: center; }
  .large-cell strong { font-size: 64px; }
  .note-specimen { width: 120px; height: 120px; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); font-size: 24px; text-align: center; }
  .note-specimen span { display: grid; place-items: center; }
  .large-keys { display: grid; grid-template-columns: repeat(3, minmax(44px, 1fr)); gap: 4px; }
  .large-keys button { background: var(--control-lip); font-size: 1.5rem; min-height: 48px; }
  .large-keys button[aria-pressed="true"] { background: var(--control-selected-face); color: var(--control-selected-ink); box-shadow: inset 0 0 0 var(--control-edge-width) var(--control-selected-edge); }
  .inline-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; }
  .reward-total { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .reward-amount { display: inline-flex; align-items: center; gap: 8px; }
  .reward-total strong { font-size: 3rem; font-variant-numeric: tabular-nums; }
  footer { border-top: 1px solid var(--control-lip); margin-top: 8px; }
  ul { margin: 0; padding-left: 1.5em; }
  @media (max-width: 600px) { .sheet { margin: 0; inset: auto 8px max(8px, env(safe-area-inset-bottom)); width: calc(100vw - 16px); } }
  @media (max-width: 280px) { .tool-row { flex-wrap: wrap; } .toggle { min-width: 20px; } }
  @media (prefers-reduced-motion: reduce) { .game-dialog { scroll-behavior: auto; } }
</style>
