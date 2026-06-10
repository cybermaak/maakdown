<script lang="ts">
  import { onMount } from 'svelte';
  import type { DocumentTab, RecentDocument } from '../core/workspace/workspace';

  interface CommandItem { id: string; label: string; hint?: string; }
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
    { id: 'open', label: 'Open document', hint: 'Cmd O' },
    { id: 'find', label: 'Find in document', hint: 'Cmd F' },
    { id: 'reload', label: 'Reload document', hint: 'Cmd R' },
    { id: 'print', label: 'Print or save as PDF', hint: 'Cmd P' },
    { id: 'focus', label: 'Toggle focus mode', hint: 'Cmd Shift F' },
    { id: 'settings', label: 'Reader appearance' },
    { id: 'about', label: 'About Maakdown' }
  ];
  let visibleCommands = $derived(commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())));
  let visibleTabs = $derived(tabs.filter((tab) => tab.title.toLowerCase().includes(query.toLowerCase())));
  let visibleHeadings = $derived(headings.filter((heading) => heading.text.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
  let items = $derived([
    ...visibleCommands.map((item) => ({ label: item.label, hint: item.hint, run: () => onCommand(item.id) })),
    ...visibleTabs.map((tab) => ({ label: `Tab: ${tab.title}`, run: () => onOpenPath(tab.path) })),
    ...visibleHeadings.map((heading) => ({ label: `Heading: ${heading.text}`, run: () => onHeading(heading.id) })),
    ...(!query ? recents.slice(0, 5).map((recent) => ({ label: `Recent: ${recent.displayName}`, run: () => onOpenPath(recent.path) })) : [])
  ]);

  $effect(() => {
    query;
    activeIndex = 0;
  });

  onMount(() => input?.focus());

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
    <input bind:this={input} aria-label="Search commands, tabs, and headings" placeholder="Search commands, tabs, and headings" bind:value={query} />
    <div class="palette-results">
      {#each items as item, index}
        <button
          class:active={index === activeIndex}
          aria-current={index === activeIndex ? 'true' : undefined}
          onmouseenter={() => (activeIndex = index)}
          onclick={() => { item.run(); onClose(); }}
        ><span>{item.label}</span><kbd>{'hint' in item ? item.hint ?? '' : ''}</kbd></button>
      {/each}
    </div>
  </div>
</div>
