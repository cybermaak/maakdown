<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import {
    Command,
    Eye,
    FileText,
    FolderOpen,
    History,
    Info,
    List,
    Moon,
    PanelLeft,
    PanelRight,
    Printer,
    RotateCw,
    Search,
    Settings,
    X
  } from '@lucide/svelte';
  import type { DocumentTab, RecentDocument } from '../core/workspace/workspace';

  interface CommandItem {
    id: string;
    label: string;
    subtitle: string;
    hint?: string;
    icon: Component;
  }

  interface PaletteItem {
    label: string;
    subtitle: string;
    section: string;
    hint?: string;
    path?: string;
    icon: Component;
    run: () => void;
  }

  interface PaletteGroup {
    section: string;
    items: Array<PaletteItem & { index: number }>;
  }

  interface Props {
    tabs: DocumentTab[];
    recents: RecentDocument[];
    headings: Array<{ id: string; text: string }>;
    onCommand: (id: string) => void;
    onOpenPath: (path: string) => void;
    onHeading: (id: string) => void;
    onClose: () => void;
  }
  let { tabs, recents, headings, onCommand, onOpenPath, onHeading, onClose }: Props = $props();
  let query = $state('');
  let input = $state<HTMLInputElement | undefined>();
  let palette = $state<HTMLElement | undefined>();
  let activeIndex = $state(0);
  const commands: CommandItem[] = [
    { id: 'open', label: 'Open document', subtitle: 'Command', hint: 'Cmd O', icon: FolderOpen },
    { id: 'close-tab', label: 'Close tab', subtitle: 'Command', hint: 'Cmd W', icon: X },
    { id: 'reopen-tab', label: 'Reopen closed tab', subtitle: 'Command', hint: 'Cmd Shift T', icon: History },
    { id: 'find', label: 'Find in document', subtitle: 'Command', hint: 'Cmd F', icon: Search },
    { id: 'reload', label: 'Reload document', subtitle: 'Command', hint: 'Cmd R', icon: RotateCw },
    { id: 'print', label: 'Print or save as PDF', subtitle: 'Command', hint: 'Cmd P', icon: Printer },
    { id: 'theme', label: 'Toggle theme', subtitle: 'Setting', icon: Moon },
    { id: 'settings', label: 'Reading display...', subtitle: 'Setting', icon: Settings },
    { id: 'line-numbers', label: 'Toggle document line numbers', subtitle: 'Setting', icon: List },
    { id: 'toggle-outline', label: 'Toggle outline', subtitle: 'Setting', icon: PanelLeft },
    { id: 'toggle-metadata', label: 'Toggle metadata', subtitle: 'Setting', icon: PanelRight },
    { id: 'about', label: 'About Maakdown', subtitle: 'Command', icon: Info }
  ];
  let groups = $derived(buildGroups(query));
  let items = $derived(groups.flatMap((group) => group.items));

  $effect(() => {
    query;
    activeIndex = 0;
  });

  onMount(() => input?.focus());

  function buildGroups(rawQuery: string): PaletteGroup[] {
    const normalized = rawQuery.trim().toLocaleLowerCase();
    const matches = (values: Array<string | undefined>) => !normalized || values.some((value) => value?.toLocaleLowerCase().includes(normalized));
    const rawGroups: Array<{ section: string; items: PaletteItem[] }> = [
      {
        section: 'Commands',
        items: commands
          .filter((item) => matches([item.label, item.subtitle]))
          .map((item) => ({
            label: item.label,
            subtitle: item.subtitle,
            section: 'Commands',
            hint: item.hint,
            icon: item.icon,
            run: () => onCommand(item.id)
          }))
      },
      {
        section: 'Open tabs',
        items: tabs
          .filter((tab) => matches([tab.title, tab.path]))
          .map((tab) => ({
            label: tab.title,
            subtitle: 'Open tab',
            section: 'Open tabs',
            path: compactPath(tab.path),
            icon: FileText,
            run: () => onOpenPath(tab.path)
          }))
      },
      {
        section: 'Recent files',
        items: recents
          .filter((recent) => matches([recent.displayName, recent.path]))
          .slice(0, normalized ? 8 : 5)
          .map((recent) => ({
            label: recent.displayName,
            subtitle: recent.pinned ? 'Pinned recent' : 'Recent file',
            section: 'Recent files',
            path: compactPath(recent.path),
            icon: recent.pinned ? Eye : History,
            run: () => onOpenPath(recent.path)
          }))
      },
      {
        section: 'Headings',
        items: headings
          .filter((heading) => matches([heading.text]))
          .slice(0, 8)
          .map((heading) => ({
            label: heading.text,
            subtitle: 'Heading',
            section: 'Headings',
            icon: Command,
            run: () => onHeading(heading.id)
          }))
      }
    ];
    let index = 0;
    return rawGroups
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        section: group.section,
        items: group.items.map((item) => ({ ...item, index: index++ }))
      }));
  }

  function compactPath(path: string): string {
    const normalized = path.replaceAll('\\', '/');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length <= 3) return normalized;
    return `~/${parts.slice(-3).join('/')}`;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      activeIndex = items.length ? (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length : 0;
      return;
    }
    if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault();
      items[activeIndex].run();
      onClose();
      return;
    }
    if (event.key === 'Tab' && palette) {
      const focusable = Array.from(palette.querySelectorAll<HTMLElement>('input, button:not([disabled])'));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
</script>

<div class="palette-scrim" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onClose(); }} onkeydown={handleKeydown}>
  <div bind:this={palette} class="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
    <input bind:this={input} aria-label="Search commands, tabs, recents, and headings" placeholder="Search commands, tabs, recents, headings..." bind:value={query} />
    <div class="palette-results">
      {#each groups as group}
        <div class="palette-section" role="group" aria-label={group.section}>
          <div class="palette-section-title">{group.section}</div>
          {#each group.items as item}
            {@const Icon = item.icon}
            <button
              class:active={item.index === activeIndex}
              aria-current={item.index === activeIndex ? 'true' : undefined}
              onmouseenter={() => (activeIndex = item.index)}
              onclick={() => { item.run(); onClose(); }}
            >
              <Icon size={15} aria-hidden="true" />
              <span class="palette-item-copy">
                <span class="palette-item-title">{item.label}</span>
                <small>{item.subtitle}</small>
              </span>
              {#if item.path}<span class="palette-path">{item.path}</span>{/if}
              {#if item.hint}<kbd>{item.hint}</kbd>{/if}
            </button>
          {/each}
        </div>
      {:else}
        <div class="palette-empty">No commands, tabs, recents, or headings match.</div>
      {/each}
    </div>
  </div>
</div>
