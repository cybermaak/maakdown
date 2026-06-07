<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    children: Snippet;
    class?: string;
  }

  let { label, children, class: className = '' }: Props = $props();
</script>

<div class={`ds-toolbar ${className}`} role="toolbar" aria-label={label}>
  {@render children()}
</div>
