<script lang="ts">
  import { FolderOpen, RefreshCw, X } from '@lucide/svelte';
  import { Button } from '../design-system';
  import { presentReaderError } from '../core/errors/readerErrors';
  interface Props { error: string; onRetry: () => void; onClose: () => void; onRelocate?: () => void; }
  let { error, onRetry, onClose, onRelocate }: Props = $props();
  let presentation = $derived(presentReaderError(error));
</script>

<article class="document-surface reader-error" role="alert">
  <small>{presentation.kind}</small>
  <h1>{presentation.title}</h1>
  <p>{presentation.message}</p>
  <div class="error-actions">
    {#if presentation.kind === 'missing' && onRelocate}<Button onclick={onRelocate}><FolderOpen size={15} /> Locate file</Button>{/if}
    {#if presentation.retryable}<Button onclick={onRetry}><RefreshCw size={15} /> Retry</Button>{/if}
    <Button variant="secondary" onclick={onClose}><X size={15} /> Close tab</Button>
  </div>
</article>
