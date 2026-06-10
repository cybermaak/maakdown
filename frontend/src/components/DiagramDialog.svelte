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
  let returnFocus: HTMLElement | null = null;
  onMount(() => {
    returnFocus = document.activeElement as HTMLElement | null;
    dialog?.focus();
    return () => returnFocus?.focus();
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      queueMicrotask(() => returnFocus?.focus());
      return;
    }
    if (event.key !== 'Tab' || !dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
</script>

{#if open}
  <div class="diagram-backdrop" role="presentation" onclick={onClose}>
    <div bind:this={dialog} class="diagram-dialog" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={handleKeydown} onclick={(e) => e.stopPropagation()}>
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
