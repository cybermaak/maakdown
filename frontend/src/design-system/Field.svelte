<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    children: Snippet;
    help?: string;
    value?: string;
  }

  let { label, children, help, value }: Props = $props();
</script>

<div class="ds-field">
  <span class="ds-field-label">
    <span>{label}</span>
    {#if value}<span>{value}</span>{/if}
  </span>
  {@render children()}
  {#if help}<p class="ds-field-help">{help}</p>{/if}
</div>
