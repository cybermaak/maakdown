<script lang="ts">
  import { TocItem } from '../design-system';
  import type { Heading } from '../core/model/types';

  interface Props {
    headings: Heading[];
    activeHeadingId: string | null;
    onNavigate: (anchorId: string) => void;
  }

  let { headings, activeHeadingId, onNavigate }: Props = $props();
  let open = $state(false);
  let timer = 0;

  // The collapsed rail is a fixed decorative glyph, not a per-heading map: a
  // real one-tick-per-heading rail overflows into the title bar on long
  // documents and reads as noise. The functional, scrollable outline lives in
  // the hover-revealed panel below. Each entry is [width, indent] in px.
  const GLYPH_TICKS: Array<[number, number]> = [
    [22, 0], [13, 7], [13, 7], [18, 0], [11, 14], [11, 14], [16, 7], [22, 0], [13, 7]
  ];

  function enter() {
    window.clearTimeout(timer);
    open = true;
  }
  function leave() {
    timer = window.setTimeout(() => (open = false), 130);
  }
</script>

{#if headings.length}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="minimap" onmouseenter={enter} onmouseleave={leave}>
    <!-- Fixed-size decorative rail; hover reveals the real outline. -->
    <div class="minimap-ticks" class:hidden={open} aria-hidden="true">
      {#each GLYPH_TICKS as [width, indent]}
        <span class="minimap-tick" style={`width: ${width}px; margin-left: ${indent}px`}></span>
      {/each}
    </div>
    <!-- Hover-revealed floating outline. Items render only while open so a long
         outline never sits in the DOM during normal reading. -->
    <nav class="minimap-panel" class:open aria-label="Document outline" inert={!open}>
      <div class="minimap-title">Outline</div>
      {#if open}
        {#each headings as heading}
          <TocItem id={heading.id} label={heading.text} depth={heading.depth} active={heading.id === activeHeadingId} onclick={() => onNavigate(heading.id)} />
        {/each}
      {/if}
    </nav>
  </div>
{/if}
