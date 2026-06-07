<script lang="ts">
  import type { DocumentTab } from '../core/workspace/workspace';
  import { Tab } from '../design-system';

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

</script>

<div class="tab-strip">
  <div class="tab-list" role="tablist" aria-label="Open documents">
    {#each tabs as tab, index}
      <Tab
        id={tab.id}
        label={tab.title}
        active={tab.id === activeTabId}
        changed={tab.changed}
        tabindex={tab.id === activeTabId ? 0 : -1}
        onactivate={() => onActivate(tab.id)}
        onclose={() => onClose(tab.id)}
        onkeydown={(event) => handleKeydown(event, index)}
      />
    {/each}
  </div>
</div>
