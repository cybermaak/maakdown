<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
    dot?: boolean;
  }

  let { children, tone = 'neutral', dot = false }: Props = $props();
</script>

<span class={`ds-badge ${tone}`}>
  {#if dot}<span class="ds-badge-dot" aria-hidden="true"></span>{/if}
  {@render children()}
</span>
