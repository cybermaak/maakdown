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

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onActivate(tabs[next].id);
    queueMicrotask(() => document.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus());
  }
</script>

<div class="tab-strip">
  <div class="tab-list" role="tablist" aria-label="Open documents">
    {#each tabs as tab, index}
      <button
        class:active={tab.id === activeTabId}
        class="document-tab tab-main"
        type="button"
        role="tab"
        aria-selected={tab.id === activeTabId}
        tabindex={tab.id === activeTabId ? 0 : -1}
        onclick={() => onActivate(tab.id)}
        onkeydown={(event) => handleKeydown(event, index)}
      >
        <FileText size={14} aria-hidden="true" />
        <span>{tab.title}</span>
        {#if tab.changed}<i aria-label="Changed"></i>{/if}
      </button>
    {/each}
  </div>
  <div class="tab-actions" role="toolbar" aria-label="Tab actions">
    {#if activeTabId}
      {@const activeTab = tabs.find((tab) => tab.id === activeTabId)}
      {#if activeTab}<IconButton icon={X} label={`Close ${activeTab.title}`} size="sm" onclick={() => onClose(activeTab.id)} />{/if}
    {/if}
    <IconButton icon={Plus} label="Open another document" size="sm" onclick={onAdd} />
  </div>
</div>
