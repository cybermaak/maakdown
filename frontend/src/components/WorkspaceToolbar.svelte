<script lang="ts">
  import { ArrowLeft, ArrowRight, Eye, FolderOpen, Focus, Moon, PanelLeft, PanelRight, Plus, RefreshCw, Search, Settings2, Sun } from '@lucide/svelte';
  import { IconButton, StatusIndicator } from '../design-system';
  import type { AppConfig } from '../stores/configStore';

  interface Props {
    title: string;
    watching: boolean;
    changed: boolean;
    reloading: boolean;
    canBack: boolean;
    canForward: boolean;
    config: AppConfig;
    onOpen: () => void;
    onTheme: () => void;
    onMetadata: () => void;
    onSearch: () => void;
    onSettings: () => void;
    onFocus: () => void;
    onReload: () => void;
    onBack: () => void;
    onForward: () => void;
    onOutline: () => void;
  }

  let { title, watching, changed, reloading, canBack, canForward, config, onOpen, onTheme, onMetadata, onSearch, onSettings, onFocus, onReload, onBack, onForward, onOutline }: Props = $props();
</script>

<header class="workspace-toolbar">
  <div class="toolbar-leading">
    <span class="brand-mark" aria-hidden="true">M</span>
    <strong>{title || 'Maakdown'}</strong>
    {#if reloading}<StatusIndicator label="Reloading" tone="neutral" />
    {:else if changed}<StatusIndicator label="Changed" tone="warning" />
    {:else if watching}<StatusIndicator label="Watching" tone="success" />{/if}
  </div>
  <div class="toolbar-actions" role="toolbar" aria-label="Document actions">
    <IconButton icon={FolderOpen} label="Open document" onclick={onOpen} />
    <IconButton icon={Plus} label="New tab" onclick={onOpen} />
    <IconButton icon={ArrowLeft} label="Back" disabled={!canBack} onclick={onBack} />
    <IconButton icon={ArrowRight} label="Forward" disabled={!canForward} onclick={onForward} />
    <IconButton icon={RefreshCw} label="Reload document" disabled={reloading} onclick={onReload} />
    <IconButton icon={Search} label="Find in document" onclick={onSearch} />
    <IconButton icon={Eye} label="Reader appearance" onclick={onSettings} />
    <IconButton icon={PanelLeft} label="Toggle outline" active={config.outlineVisible} onclick={onOutline} />
    <IconButton icon={PanelRight} label="Toggle metadata" active={config.frontmatterDisplay === 'panel'} onclick={onMetadata} />
    <IconButton icon={Focus} label="Focus mode" active={config.focusMode} onclick={onFocus} />
    <IconButton icon={Settings2} label="Command palette" onclick={() => window.dispatchEvent(new CustomEvent('maakdown:palette'))} />
    <IconButton icon={config.theme === 'dark' ? Sun : Moon} label={`Theme: ${config.theme}`} onclick={onTheme} />
  </div>
</header>
