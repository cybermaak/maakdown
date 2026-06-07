<script lang="ts">
  import { tick } from 'svelte';
  import type { Heading } from '../core/model/types';
  import { TocItem } from '../design-system';

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
      <TocItem
        id={heading.id}
        label={heading.text}
        depth={heading.depth}
        active={heading.id === activeHeadingId}
        onclick={() => onNavigate(heading.id)}
      />
    {/each}
  {/if}
</nav>
