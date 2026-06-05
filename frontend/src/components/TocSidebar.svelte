<script lang="ts">
  import type { Heading } from '../core/model/types';

  interface Props {
    headings: Heading[];
    activeHeadingId: string | null;
    onNavigate: (anchorId: string) => void;
  }

  let { headings, activeHeadingId, onNavigate }: Props = $props();
</script>

<nav class="toc" aria-label="Table of contents">
  {#if headings.length === 0}
    <p class="muted">No headings</p>
  {:else}
    {#each headings as heading}
      <button
        type="button"
        class:active={heading.id === activeHeadingId}
        style={`--depth: ${heading.depth}`}
        onclick={() => onNavigate(heading.id)}
      >
        {heading.text}
      </button>
    {/each}
  {/if}
</nav>
