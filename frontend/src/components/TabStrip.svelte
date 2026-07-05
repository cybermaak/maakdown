<script lang="ts">
  import { ListOrdered } from '@lucide/svelte';
  import type { DocumentTab } from '../core/workspace/workspace';
  import { IconButton, SegmentedControl, Tab } from '../design-system';
  import type { AppConfig } from '../stores/configStore';

  interface Props {
    tabs: DocumentTab[];
    activeTabId: string | null;
    config: AppConfig;
    onActivate: (id: string) => void;
    onClose: (id: string) => void;
    onConfigChange: (config: AppConfig) => void;
  }

  let { tabs, activeTabId, config, onActivate, onClose, onConfigChange }: Props = $props();
  let tabList: HTMLDivElement | undefined;

  const measureOptions: Array<{ value: AppConfig['readerMeasure']; label: string }> = [
    { value: 'narrow', label: 'Narrow' },
    { value: 'standard', label: 'Standard' },
    { value: 'wide', label: 'Wide' }
  ];

  function updateConfig(patch: Partial<AppConfig>) {
    onConfigChange({ ...config, ...patch });
  }

  function focusTab(index: number) {
    const tab = tabList?.querySelectorAll<HTMLElement>('[role="tab"]')[index];
    tab?.focus();
    tab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

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
    queueMicrotask(() => focusTab(next));
  }

</script>

<div class="tab-strip">
  <div class="tab-list" role="tablist" aria-label="Open documents" bind:this={tabList}>
    {#each tabs as tab, index}
      <Tab
        id={tab.id}
        label={tab.title}
        active={tab.id === activeTabId}
        changed={tab.changed}
        watching={tab.watching}
        tabindex={tab.id === activeTabId ? 0 : -1}
        onactivate={() => onActivate(tab.id)}
        onclose={() => onClose(tab.id)}
        onkeydown={(event) => handleKeydown(event, index)}
      />
    {/each}
  </div>
  <div class="reading-dock" aria-label="Reading controls">
    <SegmentedControl
      label="Measure"
      options={measureOptions}
      value={config.readerMeasure}
      onchange={(value: AppConfig['readerMeasure']) => updateConfig({ readerMeasure: value })}
    />
    <IconButton
      icon={ListOrdered}
      label={config.documentLineNumbers ? 'Hide document line numbers' : 'Show document line numbers'}
      active={config.documentLineNumbers}
      size="sm"
      onclick={() => updateConfig({ documentLineNumbers: !config.documentLineNumbers })}
    />
  </div>
</div>
