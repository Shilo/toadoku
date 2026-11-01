<script lang="ts">
  import { floatOffset } from '../motion/float';
  import { digitGeometry, focusGeometry, noteGeometry } from './shape';

  interface Props {
    id: number;
    diameter: number;
    selected: boolean;
    focused?: boolean;
    value?: number;
    notes?: readonly number[];
    time: number;
    facePath: (id: number) => string;
    faceDetail?: (id: number) => string;
  }
  let { id, diameter, selected, focused = false, value, notes = [], time, facePath, faceDetail }: Props = $props();
  const path = $derived(facePath(id));
  const detail = $derived(faceDetail?.(id));
  const offset = $derived(floatOffset(id, time, 'leaf'));
  const candidates = $derived(noteGeometry(diameter));
  const digitBox = $derived(digitGeometry(diameter));
  const focusBeads = $derived(focusGeometry(diameter));
</script>

<span class={['leaf', { selected }]} aria-hidden="true" style:--diameter={`${diameter}px`}>
  <span class="floating" style:transform={`translate(${offset.x}px, ${offset.y}px)`}>
    <svg class="lip" viewBox="0 0 100 100" focusable="false"><path d={path} /></svg>
    <span class="front">
      <svg class="face" viewBox="0 0 100 100" focusable="false">
        <path d={path} />
        {#if detail}<path class="rind" d={detail} />{/if}
        {#if selected}<circle class="selection-dew" cx="15" cy="51" r="2.7" />{/if}
      </svg>
      {#if focused}
        {#each focusBeads as bead (bead.id)}
          <span class="focus-dew" style:transform={`translate(${bead.x}px, ${bead.y}px)`}></span>
        {/each}
      {/if}
      {#if value !== undefined}
        <span class="digit" style:width={`${digitBox.width}px`} style:height={`${digitBox.height}px`}>{value}</span>
      {:else if notes.length}
        <span class="notes">
          {#each candidates as note (note.digit)}
            {#if notes.includes(note.digit)}
              <span class="note" style:font-size={`${note.size}px`} style:width={`${note.size}px`}
                style:height={`${note.size}px`} style:transform={`translate(${note.x}px, ${note.y}px)`}>{note.digit}</span>
            {/if}
          {/each}
        </span>
      {/if}
    </span>
  </span>
</span>

<style>
  .leaf, .floating, .front, svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  .leaf { display: block; pointer-events: none; color: var(--leaf-ink); font-family: var(--font-ui); }
  svg { overflow: visible; }
  .lip { fill: var(--leaf-lip); transform: translateY(var(--leaf-default-lip-depth)); }
  .face { fill: var(--leaf-face); }
  .selected .front { transform: translateY(calc(-1 * var(--leaf-selected-lift))); }
  .selected .lip { fill: var(--leaf-selected-lip); transform: translateY(var(--leaf-lip-depth)); }
  .selected .face { fill: var(--leaf-selected-face); }
  .rind { fill: var(--leaf-rind); }
  .selection-dew { fill: var(--leaf-selected-dew); }
  .focus-dew { position: absolute; top: 50%; left: 50%; translate: -50% -50%; width: var(--focus-bead-size); height: var(--focus-bead-size); box-sizing: border-box; border: calc(var(--focus-width) / 4) solid var(--focus-edge); border-radius: 50%; background: var(--leaf-focus); }
  .notes { position: absolute; inset: 0; display: grid; place-items: center; }
  .digit { position: absolute; top: 50%; left: 50%; translate: -50% -50%; overflow: clip; display: flex; align-items: center; justify-content: center; font-size: clamp(var(--type-digit-min), calc(var(--diameter) * .64), var(--type-digit-max)); font-weight: var(--weight-digit); line-height: var(--line-number); }
  .note { position: absolute; top: 50%; left: 50%; display: grid; place-items: center; font-weight: var(--weight-note); line-height: var(--line-number); translate: -50% -50%; }
</style>

