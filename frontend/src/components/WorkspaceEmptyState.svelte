<script lang="ts">
  import { FileText, FolderOpen, Pin, PinOff, Trash2 } from '@lucide/svelte';
  import { Button } from '../design-system';
  import type { RecentDocument } from '../core/workspace/workspace';

  interface Props {
    recents: RecentDocument[];
    onOpen: () => void;
    onOpenRecent: (path: string) => void;
    onPinRecent?: (path: string, pinned: boolean) => void;
    onClearMissing?: () => void;
    onClearUnpinned?: () => void;
  }
  let { recents, onOpen, onOpenRecent, onPinRecent, onClearMissing, onClearUnpinned }: Props = $props();
  let hasMissing = $derived(recents.some((recent) => recent.missingAt));
  let hasUnpinned = $derived(recents.some((recent) => !recent.pinned));
</script>

<section class="empty-state">
  <div class="empty-symbol"><FileText size={28} /></div>
  <h1>Open a Markdown document</h1>
  <p>Drop a file anywhere in this window, or choose one from disk.</p>
  <Button variant="primary" onclick={onOpen}><FolderOpen size={16} /> Open document</Button>
  {#if recents.length > 0}
    <div class="recent-list">
      <div class="recent-list-heading">
        <h2>Recent documents</h2>
        <div class="recent-list-actions">
          {#if hasMissing && onClearMissing}
            <button type="button" class="recent-action" onclick={onClearMissing}><Trash2 size={13} /> Missing</button>
          {/if}
          {#if hasUnpinned && onClearUnpinned}
            <button type="button" class="recent-action" onclick={onClearUnpinned}><Trash2 size={13} /> Unpinned</button>
          {/if}
        </div>
      </div>
      {#each recents.slice(0, 6) as recent}
        <div class="recent-row" class:missing={Boolean(recent.missingAt)}>
          <button type="button" class="recent-open" onclick={() => onOpenRecent(recent.path)}>
            <span>{recent.displayName}</span>
            <small>{recent.missingAt ? 'Missing - locate or clear' : recent.path}</small>
          </button>
          {#if onPinRecent}
            <button
              type="button"
              class="recent-pin"
              aria-label={recent.pinned ? `Unpin ${recent.displayName}` : `Pin ${recent.displayName}`}
              onclick={() => onPinRecent(recent.path, !recent.pinned)}
            >
              {#if recent.pinned}<PinOff size={14} />{:else}<Pin size={14} />{/if}
            </button>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>
