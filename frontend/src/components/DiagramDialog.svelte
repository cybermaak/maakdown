<script lang="ts">
  import { onMount } from 'svelte';
  import { Minus, Plus, RotateCcw, X } from '@lucide/svelte';
  import { IconButton } from '../design-system';

  interface Props {
    open: boolean;
    html: string;
    title: string;
    onClose: () => void;
  }
  let { open, html, title, onClose }: Props = $props();
  let zoom = $state(1);
  let dialog = $state<HTMLElement | undefined>();
  onMount(() => dialog?.focus());
</script>

{#if open}
  <div class="diagram-backdrop" role="presentation" onclick={onClose}>
    <div bind:this={dialog} class="diagram-dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={(event) => {
      if (event.key === 'Escape') onClose();
    }}>
      <header>
        <strong>{title}</strong>
        <div class="diagram-tools" role="toolbar" aria-label="Diagram zoom">
          <IconButton icon={Minus} label="Zoom out" onclick={() => (zoom = Math.max(0.5, zoom - 0.25))} />
          <IconButton icon={Plus} label="Zoom in" onclick={() => (zoom = Math.min(3, zoom + 0.25))} />
          <IconButton icon={RotateCcw} label="Reset zoom" onclick={() => (zoom = 1)} />
          <IconButton icon={X} label="Close diagram" onclick={onClose} />
        </div>
      </header>
      <div class="diagram-canvas">
        <div class="diagram-zoom" style={`transform: scale(${zoom})`}>{@html html}</div>
      </div>
    </div>
  </div>
{/if}
