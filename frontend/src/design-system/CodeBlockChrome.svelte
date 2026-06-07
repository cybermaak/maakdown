<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Copy } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    language?: string | null;
    children: Snippet;
    copyable?: boolean;
    oncopy?: () => void;
  }

  let { language = 'text', children, copyable = true, oncopy }: Props = $props();
</script>

<div class="ds-code-block">
  <div class="block-tools">
    <span>{language || 'text'}</span>
    {#if copyable && oncopy}
      <IconButton icon={Copy} label="Copy code" size="sm" onclick={oncopy} />
    {/if}
  </div>
  {@render children()}
</div>
