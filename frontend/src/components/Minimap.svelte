<script lang="ts">
  import { TocItem } from '../design-system';
  import type { Heading } from '../core/model/types';
  import type { MinimapMark, MinimapViewport } from '../core/minimap/minimap';

  interface Props {
    headings: Heading[];
    activeHeadingId: string | null;
    marks?: MinimapMark[];
    viewport?: MinimapViewport;
    activeSearchBlockId?: string | null;
    onNavigate: (anchorId: string) => void;
  }

  let { headings, activeHeadingId, marks = [], viewport = { start: 0, end: 0 }, activeSearchBlockId = null, onNavigate }: Props = $props();
  let open = $state(false);
  let timer = 0;
  let viewportTop = $derived(`${Math.max(0, Math.min(1, viewport.start)) * 100}%`);
  let viewportHeight = $derived(`${Math.max(2, Math.min(100, (viewport.end - viewport.start) * 100))}%`);

  function enter() {
    window.clearTimeout(timer);
    open = true;
  }
  function leave() {
    timer = window.setTimeout(() => (open = false), 130);
  }
</script>

{#if headings.length || marks.length}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="minimap" onmouseenter={enter} onmouseleave={leave}>
    <!-- Model-driven rail; hover reveals the full outline. -->
    <div class="minimap-ticks" class:hidden={open} aria-hidden="true">
      <span class="minimap-viewport" style={`top: ${viewportTop}; height: ${viewportHeight}`}></span>
      {#each marks as mark (mark.id)}
        <span
          class={`minimap-tick mark-${mark.kind}`}
          class:active={mark.blockId === activeSearchBlockId}
          style={`top: ${mark.position * 100}%; --mark-depth: ${mark.depth ?? 1}`}
        ></span>
      {/each}
    </div>
    <!-- Hover-revealed floating outline. Items render only while open so a long
         outline never sits in the DOM during normal reading. -->
    <nav class="minimap-panel" class:open aria-label="Document outline" inert={!open}>
      <div class="minimap-title">Outline</div>
      <div class="minimap-legend" aria-label="Minimap legend">
        <span><i class="legend-viewport"></i>Viewport</span>
        <span><i class="legend-heading"></i>Headings</span>
        <span><i class="legend-structure"></i>Code, diagrams, tables</span>
        <span><i class="legend-search"></i>Search hits</span>
      </div>
      {#if open}
        {#each headings as heading}
          <TocItem id={heading.id} label={heading.text} depth={heading.depth} active={heading.id === activeHeadingId} onclick={() => onNavigate(heading.id)} />
        {/each}
      {/if}
    </nav>
  </div>
{/if}
