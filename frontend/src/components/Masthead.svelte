<script lang="ts">
  import { FileText } from '@lucide/svelte';
  import { Badge, Tag } from '../design-system';
  import { formatMetadata, metadataTone } from '../core/format/format';

  interface Props {
    frontmatter: Record<string, unknown>;
    path: string;
  }

  let { frontmatter, path }: Props = $props();

  const SKIP = new Set(['title', 'tags', 'status']);
  let status = $derived(frontmatter.status);
  let tags = $derived(Array.isArray(frontmatter.tags) ? frontmatter.tags : []);
  let entries = $derived(
    Object.entries(frontmatter).filter(([key, value]) => !SKIP.has(key.toLowerCase()) && value != null && value !== '')
  );
</script>

<!--
  Masthead: a quiet frontmatter band at the top of the reading column. Frontmatter
  is read on open, not continuously, so it lives inline with the document rather
  than in a permanent side rail.
-->
<header class="reader-masthead" role="region" aria-label="Frontmatter metadata">
  <div class="masthead-top">
    <span class="masthead-path">
      <FileText size={14} aria-hidden="true" />
      <span class="masthead-path-text">{path}</span>
    </span>
    {#if status}<Badge tone={metadataTone('status', status)} dot>{formatMetadata(status)}</Badge>{/if}
  </div>
  {#if tags.length || entries.length}
    <div class="masthead-bottom">
      {#if tags.length}
        <div class="masthead-tags">{#each tags as tag}<Tag value={String(tag)} />{/each}</div>
      {/if}
      {#if entries.length}
        <dl class="masthead-meta">
          {#each entries as [key, value]}
            <div class="masthead-meta-item"><dt>{key}</dt> <dd>{formatMetadata(value)}</dd></div>
          {/each}
        </dl>
      {/if}
    </div>
  {/if}
</header>
