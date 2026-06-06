<script lang="ts">
  import { FileText, Plus, X } from '@lucide/svelte';
  import { IconButton } from '../design-system';
  import type { DocumentTab } from '../core/workspace/workspace';

  interface Props {
    tabs: DocumentTab[];
    activeTabId: string | null;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
    onAdd: () => void;
  }

  let { tabs, activeTabId, onActivate, onClose, onAdd }: Props = $props();
</script>

<div class="tab-strip" role="tablist" aria-label="Open documents">
  {#each tabs as tab}
    <div class:active={tab.id === activeTabId} class="document-tab" role="presentation">
      <button
        class="tab-main"
        type="button"
        role="tab"
        aria-selected={tab.id === activeTabId}
        onclick={() => onActivate(tab.id)}
      >
        <FileText size={14} aria-hidden="true" />
        <span>{tab.title}</span>
        {#if tab.changed}<i aria-label="Changed"></i>{/if}
      </button>
      <IconButton icon={X} label={`Close ${tab.title}`} size="sm" onclick={() => onClose(tab.id)} />
    </div>
  {/each}
  <IconButton icon={Plus} label="Open another document" size="sm" onclick={onAdd} />
</div>
