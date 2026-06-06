<script lang="ts">
  import { Eye, FolderOpen, Focus, Moon, PanelRight, Plus, Search, Settings2, Sun } from '@lucide/svelte';
  import { IconButton, StatusIndicator } from '../design-system';
  import type { AppConfig } from '../stores/configStore';

  interface Props {
    title: string;
    watching: boolean;
    config: AppConfig;
    onOpen: () => void;
    onTheme: () => void;
    onMetadata: () => void;
    onSearch: () => void;
    onSettings: () => void;
    onFocus: () => void;
  }

  let { title, watching, config, onOpen, onTheme, onMetadata, onSearch, onSettings, onFocus }: Props = $props();
</script>

<header class="workspace-toolbar">
  <div class="toolbar-leading">
    <span class="brand-mark" aria-hidden="true">M</span>
    <strong>{title || 'Maakdown'}</strong>
    {#if watching}<StatusIndicator label="Watching" tone="success" />{/if}
  </div>
  <div class="toolbar-actions" role="toolbar" aria-label="Document actions">
    <IconButton icon={FolderOpen} label="Open document" onclick={onOpen} />
    <IconButton icon={Plus} label="New tab" onclick={onOpen} />
    <IconButton icon={Search} label="Find in document" onclick={onSearch} />
    <IconButton icon={Eye} label="Reader appearance" onclick={onSettings} />
    <IconButton icon={PanelRight} label="Toggle metadata" active={config.frontmatterDisplay === 'panel'} onclick={onMetadata} />
    <IconButton icon={Focus} label="Focus mode" active={config.focusMode} onclick={onFocus} />
    <IconButton icon={Settings2} label="Command palette" onclick={() => window.dispatchEvent(new CustomEvent('maakdown:palette'))} />
    <IconButton icon={config.theme === 'dark' ? Sun : Moon} label={`Theme: ${config.theme}`} onclick={onTheme} />
  </div>
</header>
