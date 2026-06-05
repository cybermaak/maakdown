<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import DocumentView from './components/DocumentView.svelte';
  import MetadataPanel from './components/MetadataPanel.svelte';
  import TocSidebar from './components/TocSidebar.svelte';
  import { parseDocument } from './core/pipeline/parseDocument';
  import { onFileChanged, openDocument, readDocument, startWatch } from './ipc';
  import { appConfig } from './stores/configStore';
  import { documentStore, setDocument } from './stores/documentStore';
  import { uiStore } from './stores/uiStore';

  let documentView: DocumentView | undefined;
  let removeFileChangedListener: (() => void) | null = null;

  async function handleOpen() {
    documentStore.update((state) => ({ ...state, loading: true, error: null }));
    try {
      const opened = await openDocument();
      const model = await parseDocument({
        source: opened.contents,
        path: opened.path
      });
      setDocument(opened.path, model);
      await startWatch(opened.path);
      uiStore.update((state) => ({
        ...state,
        activeHeadingId: model.headings[0]?.id ?? null
      }));
    } catch (error) {
      documentStore.update((state) => ({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  function navigate(anchorId: string) {
    documentView?.scrollToAnchor(anchorId);
  }

  async function reloadDocument(path: string) {
    const currentAnchorId = $uiStore.activeHeadingId ?? undefined;
    try {
      const document = await readDocument(path);
      const model = await parseDocument({
        source: document.contents,
        path: document.path
      });
      setDocument(document.path, model);
      const nextAnchor = currentAnchorId && model.anchors[currentAnchorId] ? currentAnchorId : model.headings[0]?.id ?? null;
      uiStore.update((state) => ({ ...state, activeHeadingId: nextAnchor }));
      if (nextAnchor) {
        queueMicrotask(() => documentView?.scrollToAnchor(nextAnchor));
      }
    } catch (error) {
      documentStore.update((state) => ({
        ...state,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  onMount(() => {
    removeFileChangedListener = onFileChanged((path) => {
      void reloadDocument(path);
    });
  });

  onDestroy(() => {
    removeFileChangedListener?.();
  });
</script>

<main class="app-shell">
  <aside class="sidebar" aria-label="Table of contents">
    <div class="brand">Maakdown</div>
    {#if $documentStore.model}
      <TocSidebar
        headings={$documentStore.model.headings}
        activeHeadingId={$uiStore.activeHeadingId}
        onNavigate={navigate}
      />
    {:else}
      <p class="muted">No document open</p>
    {/if}
  </aside>

  <section class="reader" aria-label="Markdown document">
    <header class="toolbar">
      <button type="button" onclick={handleOpen} disabled={$documentStore.loading}>
        {$documentStore.loading ? 'Opening...' : 'Open'}
      </button>
      <span class="status">{$appConfig.highlighterEngine}</span>
    </header>

    {#if $documentStore.error}
      <article class="document-surface error">
        <h1>Could not open document</h1>
        <p>{$documentStore.error}</p>
      </article>
    {:else if $documentStore.model}
      <div class="reader-grid">
        <DocumentView bind:this={documentView} model={$documentStore.model} documentPath={$documentStore.path ?? ''} />
        {#if $appConfig.frontmatterDisplay === 'panel' && $uiStore.metadataPanelOpen}
          <MetadataPanel frontmatter={$documentStore.model.frontmatter} />
        {/if}
      </div>
    {:else}
      <article class="document-surface">
        <h1>Maakdown</h1>
        <p>Open a Markdown file to start reading.</p>
      </article>
    {/if}
  </section>
</main>
