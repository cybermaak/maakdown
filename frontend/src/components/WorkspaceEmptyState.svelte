<script lang="ts">
  import { FileText, FolderOpen } from '@lucide/svelte';
  import { Button } from '../design-system';
  import type { RecentDocument } from '../core/workspace/workspace';

  interface Props {
    recents: RecentDocument[];
    onOpen: () => void;
    onOpenRecent: (path: string) => void;
  }
  let { recents, onOpen, onOpenRecent }: Props = $props();
</script>

<section class="empty-state">
  <div class="empty-symbol"><FileText size={28} /></div>
  <h1>Open a Markdown document</h1>
  <p>Drop a file anywhere in this window, or choose one from disk.</p>
  <Button variant="primary" onclick={onOpen}><FolderOpen size={16} /> Open document</Button>
  {#if recents.length > 0}
    <div class="recent-list">
      <h2>Recent documents</h2>
      {#each recents.slice(0, 6) as recent}
        <button type="button" onclick={() => onOpenRecent(recent.path)}>
          <span>{recent.displayName}</span>
          <small>{recent.path}</small>
        </button>
      {/each}
    </div>
  {/if}
</section>
