<script lang="ts">
  import { Badge, Tag } from '../design-system';
  import { formatMetadata, metadataTone } from '../core/format/format';
  interface Props {
    frontmatter: Record<string, unknown>;
  }

  let { frontmatter }: Props = $props();
  const entries = $derived(Object.entries(frontmatter));
</script>

<section class="metadata-panel" aria-label="Frontmatter metadata">
  <h2>Metadata</h2>
  {#if entries.length === 0}
    <p class="muted">No frontmatter</p>
  {:else}
    <dl>
      {#each entries as [key, value]}
        <dt>{key}</dt>
        <dd>
          {#if key.toLowerCase() === 'status'}
            <Badge tone={metadataTone(key, value)}>{formatMetadata(value)}</Badge>
          {:else if key.toLowerCase() === 'tags' && Array.isArray(value)}
            <span class="metadata-tags">{#each value as tag}<Tag value={String(tag)} />{/each}</span>
          {:else}
            {formatMetadata(value)}
          {/if}
        </dd>
      {/each}
    </dl>
  {/if}
</section>
