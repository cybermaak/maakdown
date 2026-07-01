<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Copy, WrapText } from '@lucide/svelte';
  import IconButton from './IconButton.svelte';

  interface Props {
    language?: string | null;
    children: Snippet;
    copyable?: boolean;
    oncopy?: () => void;
    wrappable?: boolean;
    wrapped?: boolean;
    onwrap?: () => void;
  }

  let { language = 'text', children, copyable = true, oncopy, wrappable = false, wrapped = true, onwrap }: Props = $props();
</script>

<div class="ds-code-block">
  <div class="block-tools">
    <span>{language || 'text'}</span>
    <div class="block-tool-actions">
      {#if wrappable && onwrap}
        <IconButton icon={WrapText} label={wrapped ? 'Disable code wrap' : 'Enable code wrap'} size="sm" active={wrapped} onclick={onwrap} />
      {/if}
      {#if copyable && oncopy}
        <IconButton icon={Copy} label="Copy code" size="sm" onclick={oncopy} />
      {/if}
    </div>
  </div>
  {@render children()}
</div>
