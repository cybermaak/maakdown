<script lang="ts">
  import { Minus, Square, X } from '@lucide/svelte';
  import { quitApp, windowMinimise, windowToggleMaximise } from '@ipc';
</script>

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
