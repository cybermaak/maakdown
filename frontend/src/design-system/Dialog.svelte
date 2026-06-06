<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    open: boolean;
    title: string;
    children: Snippet;
    onclose: () => void;
  }

  let { open, title, children, onclose }: Props = $props();
</script>

{#if open}
  <div class="ds-dialog-backdrop" role="presentation" onclick={onclose}>
    <div
      class="ds-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabindex="-1"
      onclick={(event) => event.stopPropagation()}
      onkeydown={(event) => event.stopPropagation()}
    >
      <header>
        <strong>{title}</strong>
        <IconButton icon={X} label="Close" size="sm" onclick={onclose} />
      </header>
      <div class="ds-dialog-body">{@render children()}</div>
    </div>
  </div>
{/if}
