<script lang="ts">
  import { FileText, X } from '@lucide/svelte';
  import type { DocumentTab } from '../core/workspace/workspace';

  interface Props {
    tabs: DocumentTab[];
    activeTabId: string | null;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
  }

  let { tabs, activeTabId, onActivate, onClose }: Props = $props();

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      onClose(tabs[index].id);
      return;
    }
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

  function closeFromGlyph(event: MouseEvent, id: string) {
    // The close glyph is a non-focusable affordance inside the tab button, so
    // nested interactive content never triggers an accessibility violation.
    event.stopPropagation();
    onClose(id);
  }
</script>

<div class="tab-strip">
  <div class="tab-list" role="tablist" aria-label="Open documents">
    {#each tabs as tab, index}
      <button
        class="document-tab"
        class:active={tab.id === activeTabId}
        type="button"
        role="tab"
        aria-selected={tab.id === activeTabId}
        aria-keyshortcuts="Delete"
        tabindex={tab.id === activeTabId ? 0 : -1}
        onclick={() => onActivate(tab.id)}
        onkeydown={(event) => handleKeydown(event, index)}
      >
        <FileText size={14} aria-hidden="true" />
        <span class="tab-title">{tab.title}</span>
        {#if tab.changed}<i aria-label="Changed"></i>{/if}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span
          class="tab-close"
          aria-hidden="true"
          title={`Close ${tab.title}`}
          onclick={(event) => closeFromGlyph(event, tab.id)}
        >
          <X size={13} aria-hidden="true" />
        </span>
      </button>
    {/each}
  </div>
</div>
