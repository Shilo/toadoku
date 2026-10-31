<script lang="ts">
  import { onMount, tick } from 'svelte';
  import Scene from './lib/scene/Scene.svelte';
  import Leaf from './lib/leaves/Leaf.svelte';
  import { createMotionClock } from './lib/motion/clock';
  import { floatOffset } from './lib/motion/float';
  import { createLayout, rectStyle, LARGE } from './lib/layout';
  import { createNavigation, type Navigation, type Route } from './lib/navigation';
  import { dictionaries, resolveLocale, type Locale } from './lib/i18n';
  import { example, exampleNotes, noteCell, moveCell } from './lib/fixture';
  import { pond, themeStyle } from './lib/theme/pond';
  import menuSketch from './assets/menu-sketch.png';

  let { locale = resolveLocale(new URLSearchParams(location.search).get('lang') ?? navigator.language) }: { locale?: Locale } = $props();
  const copy = $derived(dictionaries[locale]);
  let route = $state<Route>('menu');
  let width = $state(window.innerWidth - 2 * LARGE), height = $state(window.innerHeight - 2 * LARGE), time = $state(0);
  let selected = $state(0), keyboard = $state(false), focusedCell = $state<number | null>(null);
  let moreButton = $state<HTMLButtonElement>();
  let menuElement = $state<HTMLElement>();
  let boardElement = $state<HTMLElement>();
  let nav: Navigation;
  const layout = $derived(createLayout(width, height));
  const inGame = $derived(route === 'board' || route === 'more');
  const titleFloat = $derived(floatOffset(701, time, 'identity'));
  const artFloat = $derived(floatOffset(702, time, 'identity'));
  const buttonHeight = $derived(layout.keySize);
  const actionHeight = $derived(layout.menuActionHeight);

  async function renderRoute(next: Route) {
    const previous = route;
    route = next;
    await tick();
    if (route !== next) return;
    if (next === 'board' && previous === 'more') moreButton?.focus();
    else if (next === 'board' && previous !== 'board') boardElement?.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus();
    else if (!inGame) menuElement?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  onMount(() => {
    nav = createNavigation(window, next => { void renderRoute(next); });
    const stop = createMotionClock(value => time = value);
    return () => { nav.destroy(); stop(); };
  });

  function handleKey(event: KeyboardEvent) {
    keyboard = true;
    if (event.key !== 'Escape' || route === 'more') return;
    if (route === 'quick' || route === 'progression') { event.preventDefault(); nav.go('menu'); }
    else if (route === 'board') { event.preventDefault(); nav.quit(); }
  }
  function cellKey(event: KeyboardEvent, id: number) {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)) return;
    event.preventDefault();
    selected = moveCell(id, event.key);
    boardElement?.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus();
  }
  function modal(element: HTMLDialogElement) {
    element.showModal();
    element.querySelector<HTMLButtonElement>('button')?.focus();
    return () => element.close();
  }
  function singleActivation(element: HTMLElement) {
    // A second click after a screen/modal closes must not activate a newly
    // exposed control at the same coordinates. Keyboard clicks have detail 0.
    const guard = (event: MouseEvent) => {
      if (event.detail > 1) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    element.addEventListener('mousedown', guard, true);
    element.addEventListener('click', guard, true);
    return () => {
      element.removeEventListener('mousedown', guard, true);
      element.removeEventListener('click', guard, true);
    };
  }
  function modalKey(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const buttons = (event.currentTarget as HTMLDialogElement).querySelectorAll<HTMLButtonElement>('button');
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
</script>

<svelte:window onkeydown={handleKey} onpointerdown={() => keyboard = false} />
<svelte:head><title>Toadodu</title><meta name="theme-color" content={pond.water.deep} /></svelte:head>

<main class="world" lang={locale} style={themeStyle()} {@attach singleActivation}>
  <div class="scene" bind:clientWidth={width} bind:clientHeight={height}>
    <Scene {layout} screen={inGame ? 'game' : 'menu'} {time} />
    {#if inGame}
      <section class="board" aria-label={copy.example} bind:this={boardElement} style={rectStyle(layout.board)}>
        {#each layout.cells as cell (cell.id)}
          <button class="cell" data-cell={cell.id} aria-pressed={selected === cell.id}
            aria-label={`${copy.cell(cell.row + 1, cell.column + 1)}: ${cell.id === noteCell ? `${copy.notes} 1 2 3 4 5 6 7 8 9` : example[cell.id] || copy.empty}`}
            tabindex={selected === cell.id ? 0 : -1} style={rectStyle(cell.rect)}
            onclick={() => selected = cell.id} onfocus={() => { selected = cell.id; focusedCell = cell.id; }} onblur={() => focusedCell = null} onkeydown={event => cellKey(event, cell.id)}>
            <span class="anchor" style={rectStyle({ ...cell.anchor, x: cell.anchor.x - cell.rect.x, y: cell.anchor.y - cell.rect.y })}>
              <Leaf id={cell.id} selected={selected === cell.id} focused={keyboard && focusedCell === cell.id} value={example[cell.id] || undefined} notes={cell.id === noteCell ? exampleNotes : undefined} {time} diameter={cell.anchor.width} />
            </span>
          </button>
        {/each}
      </section>
      <nav class={['dock', { landscape: layout.landscape }]} aria-label={copy.example} style={`${rectStyle(layout.dock)};--key:${buttonHeight}px`}>
        {#each [1,2,3,4,5,6,7,8,9] as number (number)}
          <button class="cream numeric" disabled aria-label={`${number}: ${copy.unavailable}`}>{number}</button>
        {/each}
        <button class="cream more" bind:this={moreButton} aria-label={copy.more} aria-haspopup="dialog" onclick={() => nav.openMore()}>•••</button>
      </nav>
    {:else}
      <section class="identity" aria-label="Toadodu">
        <h1 style={`${rectStyle(layout.menuTitle)};font-size:${layout.titleFontSize}px;transform:translate(${titleFloat.x}px,${titleFloat.y}px)`}>Toadodu</h1>
        <div class="art-slot" style={`${rectStyle(layout.menuArt)};transform:translate(${artFloat.x}px,${artFloat.y}px)`}>
          <img class="menu-art" src={menuSketch} alt={copy.art} width="1254" height="1254" draggable="false" decoding="async" />
        </div>
      </section>
      <nav class="menu-panel" aria-label={route === 'quick' ? copy.quick : route === 'progression' ? copy.progression : 'Toadodu'} bind:this={menuElement}
        style={`${rectStyle(layout.menuPanel)};--action:${actionHeight}px`}>
        {#if route === 'menu'}
          <button class="cream" onclick={() => nav.go('quick')}>{copy.quick}</button>
          <button class="cream" onclick={() => nav.go('progression')}>{copy.progression}</button>
        {:else if route === 'quick'}
          <h2>{copy.quick}</h2>
          <div class="difficulty">
            <button class="cream" onclick={() => nav.go('board')}>{copy.easy}</button>
            <button class="cream" onclick={() => nav.go('board')}>{copy.medium}</button>
            <button class="cream" onclick={() => nav.go('board')}>{copy.hard}</button>
          </div>
          <button class="cream" onclick={() => nav.go('menu')}>{copy.back}</button>
        {:else}
          <h2>{copy.progression}</h2>
          <button class="cream" onclick={() => nav.go('board')}>{copy.newGame}</button>
          <button class="cream" disabled>{copy.continueGame}</button>
          <button class="cream" onclick={() => nav.go('menu')}>{copy.back}</button>
        {/if}
      </nav>
      <button class="cream menu-more" disabled aria-label={copy.more} style={`right:0;bottom:0;width:${layout.keySize}px;height:${layout.keySize}px`}>•••</button>
    {/if}
  </div>
  {#if route === 'more'}
    <dialog aria-labelledby="more-title" aria-describedby="example-description" {@attach modal}
      onkeydown={modalKey}
      onpointerdown={event => { if (event.target === event.currentTarget) event.preventDefault(); }}
      oncancel={event => { event.preventDefault(); nav.closeMore(); }}>
      <h2 id="more-title">{copy.paused}</h2>
      <p id="example-description">{copy.example}</p>
      <button class="cream" onclick={() => nav.closeMore()}>{copy.resume}</button>
      <button class="cream" onclick={() => nav.quit()}>{copy.mainMenu}</button>
    </dialog>
  {/if}
</main>
