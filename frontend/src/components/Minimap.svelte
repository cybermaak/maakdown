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
    <!-- Collapsed tick rail: one tick per heading, indented by depth. -->
    <div class="minimap-ticks" class:hidden={open} aria-hidden="true">
      {#each headings as heading}
        <span
          class="minimap-tick"
          class:active={heading.id === activeHeadingId}
          style={`width: ${22 - (heading.depth - 1) * 5}px; margin-left: ${(heading.depth - 1) * 7}px`}
          title={heading.text}
        ></span>
      {/each}
    </div>
    <!-- Hover-revealed floating outline. -->
    <nav class="minimap-panel" class:open aria-label="Document outline" inert={!open}>
      <div class="minimap-title">Outline</div>
      {#each headings as heading}
        <TocItem id={heading.id} label={heading.text} depth={heading.depth} active={heading.id === activeHeadingId} onclick={() => onNavigate(heading.id)} />
      {/each}
    </nav>
  </div>
{/if}
