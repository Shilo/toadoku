<script lang="ts">
  import type { Layout } from '../layout';
  import { boardWater, menuWater, shore } from './geometry';

  let { layout, screen, time = 0, theme = 'pond', vessel }: {
    layout: Layout; screen: 'menu' | 'game'; time?: number; theme?: 'pond' | 'cauldron';
    vessel?: (layout: Layout, screen: 'menu' | 'game') => { wet: string; dry: string; transpose: boolean };
  } = $props();
  const liquidTime = $derived(theme === 'cauldron' ? 0 : time);
  const water = $derived(screen === 'game' ? boardWater(layout, liquidTime).layers : menuWater(layout, liquidTime));
  const ground = $derived(vessel?.(layout, screen) ?? shore(layout, screen));
  const colors = ['var(--water-deep)', 'var(--water-middle)', 'var(--water-shallow)'];
</script>

<svg class="scene" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false" preserveAspectRatio="none" data-scene={screen}>
  {#each water as layer (layer.color)}
    <path d={layer.d} fill={colors[layer.color]} fill-rule="nonzero" />
  {/each}
  <g transform={ground.transpose ? 'matrix(0 1 1 0 0 0)' : undefined}>
    <path d={ground.wet} fill="var(--ground-wet)" />
    <path d={ground.dry} fill="var(--ground-dry)" />
  </g>
</svg>

<style>
  .scene {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    z-index: var(--layer-water);
    overflow: visible;
    pointer-events: none;
    user-select: none;
  }
</style>

