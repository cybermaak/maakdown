<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    label: string;
    children: Snippet;
  }

  let { open, label, children }: Props = $props();
</script>

{#if open}
  <div class="ds-popover" role="dialog" aria-label={label}>
    {@render children()}
  </div>
{/if}
