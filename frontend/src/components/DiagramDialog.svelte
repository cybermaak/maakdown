<script lang="ts">
  import { Minus, Plus, RotateCcw, X } from '@lucide/svelte';
  import { Dialog, IconButton } from '../design-system';

  interface Props {
    open: boolean;
    html: string;
    title: string;
    onClose: () => void;
  }
  let { open, html, title, onClose }: Props = $props();
  let zoom = $state(1);
</script>

<Dialog open={open} {title} onclose={onClose} size="lg" panelClass="diagram-dialog" bodyClass="diagram-canvas" showClose={false}>
  {#snippet actions()}
    <div class="diagram-tools" role="toolbar" aria-label="Diagram zoom">
      <IconButton icon={Minus} label="Zoom out" onclick={() => (zoom = Math.max(0.5, zoom - 0.25))} />
      <IconButton icon={Plus} label="Zoom in" onclick={() => (zoom = Math.min(3, zoom + 0.25))} />
      <IconButton icon={RotateCcw} label="Reset zoom" onclick={() => (zoom = 1)} />
      <IconButton icon={X} label="Close diagram" onclick={onClose} />
    </div>
  {/snippet}

  <div class="diagram-zoom" style={`transform: scale(${zoom})`}>{@html html}</div>
</Dialog>
