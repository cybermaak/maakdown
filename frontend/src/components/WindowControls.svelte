<script lang="ts">
  import { Minus, Plus, Square, X } from '@lucide/svelte';
  import { quitApp, windowMinimise, windowToggleMaximise } from '@ipc';

  let { mac = false }: { mac?: boolean } = $props();
</script>

{#if mac}
  <!-- macOS traffic lights: close / minimise / zoom, glyphs revealed on hover. -->
  <div class="window-controls mac" role="group" aria-label="Window controls">
    <button type="button" class="traffic close" aria-label="Close window" onclick={() => void quitApp()}>
      <X size={8} strokeWidth={2.5} aria-hidden="true" />
    </button>
    <button type="button" class="traffic minimise" aria-label="Minimise window" onclick={() => void windowMinimise()}>
      <Minus size={8} strokeWidth={2.5} aria-hidden="true" />
    </button>
    <button type="button" class="traffic maximise" aria-label="Maximise window" onclick={() => void windowToggleMaximise()}>
      <Plus size={8} strokeWidth={2.5} aria-hidden="true" />
    </button>
  </div>
{:else}
  <div class="window-controls" role="group" aria-label="Window controls">
    <button type="button" class="window-control" aria-label="Minimise window" onclick={() => void windowMinimise()}>
      <Minus size={15} aria-hidden="true" />
    </button>
    <button type="button" class="window-control" aria-label="Maximise window" onclick={() => void windowToggleMaximise()}>
      <Square size={12} aria-hidden="true" />
    </button>
    <button type="button" class="window-control close" aria-label="Close window" onclick={() => void quitApp()}>
      <X size={15} aria-hidden="true" />
    </button>
  </div>
{/if}
