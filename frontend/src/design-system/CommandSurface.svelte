<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    label: string;
    children: Snippet;
    onclose: () => void;
    onkeydown?: (event: KeyboardEvent) => void;
    element?: HTMLElement;
  }

  let { label, children, onclose, onkeydown, element = $bindable() }: Props = $props();
</script>

<div class="ds-command-scrim" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onclose(); }} {onkeydown}>
  <div bind:this={element} class="ds-command-palette" role="dialog" aria-modal="true" aria-label={label}>
    {@render children()}
  </div>
</div>
