<script lang="ts">
  import { Code2, FolderOpen, Moon, PanelRight, Plus, Sun } from '@lucide/svelte';
  import { IconButton, StatusIndicator } from '../design-system';
  import type { AppConfig } from '../stores/configStore';

  interface Props {
    title: string;
    watching: boolean;
    config: AppConfig;
    onOpen: () => void;
    onTheme: () => void;
    onMetadata: () => void;
    onHighlighter: () => void;
  }

  let { title, watching, config, onOpen, onTheme, onMetadata, onHighlighter }: Props = $props();
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
    <IconButton icon={Code2} label={config.highlighterEngine} onclick={onHighlighter} />
    <IconButton icon={PanelRight} label="Toggle metadata" active={config.frontmatterDisplay === 'panel'} onclick={onMetadata} />
    <IconButton icon={config.theme === 'dark' ? Sun : Moon} label={`Theme: ${config.theme}`} onclick={onTheme} />
  </div>
</header>
