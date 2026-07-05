<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    children: Snippet;
    help?: string;
  }

  let { label, children, help }: Props = $props();
</script>

<div class="ds-setting-row">
  <span class="ds-setting-copy">
    <span>{label}</span>
    {#if help}<small>{help}</small>{/if}
  </span>
  {@render children()}
</div>
