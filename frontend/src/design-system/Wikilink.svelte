<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    resolved?: boolean;
    onopen?: () => void;
  }

  let { children, resolved = true, onopen }: Props = $props();
</script>

{#if resolved}
  <button class="ds-wikilink wikilink" type="button" onclick={onopen}>
    {@render children()}
  </button>
{:else}
  <span class="wikilink wikilink-unresolved" aria-label="Unresolved note">
    {@render children()}
  </span>
{/if}
