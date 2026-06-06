<script lang="ts">
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
  const commands: CommandItem[] = [
    { id: 'open', label: 'Open document', hint: 'Cmd O' },
    { id: 'find', label: 'Find in document', hint: 'Cmd F' },
    { id: 'reload', label: 'Reload document', hint: 'Cmd R' },
    { id: 'print', label: 'Print or save as PDF', hint: 'Cmd P' },
    { id: 'focus', label: 'Toggle focus mode', hint: 'Cmd Shift F' },
    { id: 'settings', label: 'Reader appearance' }
  ];
  let visibleCommands = $derived(commands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())));
  let visibleTabs = $derived(tabs.filter((tab) => tab.title.toLowerCase().includes(query.toLowerCase())));
  let visibleHeadings = $derived(headings.filter((heading) => heading.text.toLowerCase().includes(query.toLowerCase())).slice(0, 8));
</script>

<div class="palette-scrim" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
  <div class="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
    <input aria-label="Search commands, tabs, and headings" placeholder="Search commands, tabs, and headings" bind:value={query} />
    <div class="palette-results">
      {#each visibleCommands as command}
        <button onclick={() => { onCommand(command.id); onClose(); }}><span>{command.label}</span><kbd>{command.hint ?? ''}</kbd></button>
      {/each}
      {#each visibleTabs as tab}
        <button onclick={() => { onOpenPath(tab.path); onClose(); }}><span>Tab: {tab.title}</span></button>
      {/each}
      {#each visibleHeadings as heading}
        <button onclick={() => { onHeading(heading.id); onClose(); }}><span>Heading: {heading.text}</span></button>
      {/each}
      {#if !query}
        {#each recents.slice(0, 5) as recent}
          <button onclick={() => { onOpenPath(recent.path); onClose(); }}><span>Recent: {recent.displayName}</span></button>
        {/each}
      {/if}
    </div>
  </div>
</div>
