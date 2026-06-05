<script lang="ts">
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
        <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
      {/each}
    </dl>
  {/if}
</section>
