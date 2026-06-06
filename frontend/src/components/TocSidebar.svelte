<script lang="ts">
  import { tick } from 'svelte';
  import type { Heading } from '../core/model/types';

  interface Props {
    headings: Heading[];
    activeHeadingId: string | null;
    onNavigate: (anchorId: string) => void;
  }

  let { headings, activeHeadingId, onNavigate }: Props = $props();

  $effect(() => {
    activeHeadingId;
    void tick().then(() => {
      document.querySelector<HTMLElement>('.toc button.active')?.scrollIntoView({ block: 'nearest' });
    });
  });
</script>

<nav class="toc" aria-label="Table of contents">
  {#if headings.length === 0}
    <p class="muted">No headings</p>
  {:else}
    {#each headings as heading}
      <button
        type="button"
        class:active={heading.id === activeHeadingId}
        aria-current={heading.id === activeHeadingId ? 'location' : undefined}
        style={`--depth: ${heading.depth}`}
        onclick={() => onNavigate(heading.id)}
      >
        {heading.text}
      </button>
    {/each}
  {/if}
</nav>
