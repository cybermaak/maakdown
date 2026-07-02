<script lang="ts">
  import { ArrowLeft, ArrowRight, Command, Eye, FolderOpen, Moon, RefreshCw, Search, Settings2, Sun } from '@lucide/svelte';
  import { IconButton, Toolbar } from '../design-system';
  import WindowControls from './WindowControls.svelte';
  import { isDesktopRuntime, isMacPlatform } from '@ipc';
  import type { AppConfig } from '../stores/configStore';
  import appIconLight from '../assets/app-icon-light.png';
  import appIconDark from '../assets/app-icon-dark.png';

  const desktop = isDesktopRuntime();
  const mac = desktop && isMacPlatform();

  interface Props {
    reloading: boolean;
    canBack: boolean;
    canForward: boolean;
    config: AppConfig;
    onOpen: () => void;
    onTheme: () => void;
    onSearch: () => void;
    onSettings: () => void;
    onReload: () => void;
    onBack: () => void;
    onForward: () => void;
  }

  let { reloading, canBack, canForward, config, onOpen, onTheme, onSearch, onSettings, onReload, onBack, onForward }: Props = $props();
</script>

<header class="workspace-toolbar">
  {#if mac}<WindowControls mac />{/if}
  <!-- App brand (icon + wordmark) only. Document identity (file icon + title +
       watch state) lives in the tab strip, like VS Code and browsers; the
       toolbar never re-states the active tab's title. -->
  <div class="toolbar-leading">
    <img src={config.theme === 'dark' ? appIconDark : appIconLight} class="brand-mark" alt="Maakdown" />
    <strong class="brand-wordmark">Maakdown</strong>
  </div>
  <!-- Structural and navigation controls sit at the leading edge (HIG/Fluent/GNOME). -->
  <Toolbar class="toolbar-nav" label="Navigation">
    <IconButton icon={FolderOpen} label="Open document" onclick={onOpen} />
    <IconButton icon={ArrowLeft} label="Back" disabled={!canBack} onclick={onBack} />
    <IconButton icon={ArrowRight} label="Forward" disabled={!canForward} onclick={onForward} />
    <IconButton icon={RefreshCw} label="Reload document" disabled={reloading} onclick={onReload} />
  </Toolbar>
  <!-- View and meta controls sit at the trailing edge. -->
  <Toolbar class="toolbar-actions" label="View and tools">
    <IconButton icon={Search} label="Find in document" onclick={onSearch} />
    <IconButton icon={Settings2} label="Settings" onclick={onSettings} />
    <IconButton icon={Command} label="Command palette" onclick={() => window.dispatchEvent(new CustomEvent('maakdown:palette'))} />
    <IconButton icon={config.theme === 'dark' ? Sun : Moon} label={`Theme: ${config.theme}`} onclick={onTheme} />
  </Toolbar>
  {#if desktop && !mac}<WindowControls />{/if}
</header>
