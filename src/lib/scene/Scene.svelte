<script lang="ts">
  import type { Layout } from '../layout';
  import type { BubbleRenderer, LiquidRenderer, VesselRenderer } from './types';

  let { layout, screen, time = 0, liquid, bubbles, vessel }: {
    layout: Layout; screen: 'menu' | 'game'; time?: number;
    liquid?: LiquidRenderer; bubbles?: BubbleRenderer; vessel?: VesselRenderer;
  } = $props();
  const water = $derived(liquid?.(layout, screen, time));
  const ground = $derived(vessel?.(layout, screen));
  const simmer = $derived(bubbles?.(layout, screen, time) ?? []);
  const colors = ['var(--water-deep)', 'var(--water-middle)', 'var(--water-shallow)'];
</script>

<svg class="scene" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true" focusable="false" preserveAspectRatio="none" data-scene={screen}>
  {#each water?.layers ?? [] as layer (layer.color)}
    <path d={layer.d} fill={colors[layer.color]} fill-rule="nonzero" />
  {/each}
  {#each simmer as bubble (bubble.id)}
    <g class="simmer-bubble" data-bubble={bubble.id}>
      <circle cx={bubble.x} cy={bubble.y} r={(bubble.radius + bubble.innerRadius) / 2} fill="none"
        stroke="var(--bubble-color)" stroke-width={bubble.radius - bubble.innerRadius} />
      <circle cx={bubble.x} cy={bubble.y} r={(bubble.radius + bubble.innerRadius) / 2} fill="none"
        stroke="var(--bubble-edge)" stroke-width={(bubble.radius - bubble.innerRadius) / 3} />
    </g>
  {/each}
  {#if ground}
    <g transform={ground.transpose ? 'matrix(0 1 1 0 0 0)' : undefined}>
      <path d={ground.wet} fill="var(--ground-wet)" />
      <path d={ground.dry} fill="var(--ground-dry)" />
      {#if ground.rim}<path d={ground.rim} fill="var(--ground-rim)" />{/if}
    </g>
  {/if}
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
