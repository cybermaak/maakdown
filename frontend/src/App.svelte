<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import DesignSystemGallery from './design-system/DesignSystemGallery.svelte';
  import DocumentView from './components/DocumentView.svelte';
  import MetadataPanel from './components/MetadataPanel.svelte';
  import TabStrip from './components/TabStrip.svelte';
  import TocSidebar from './components/TocSidebar.svelte';
  import WorkspaceEmptyState from './components/WorkspaceEmptyState.svelte';
  import WorkspaceToolbar from './components/WorkspaceToolbar.svelte';
  import { disposeParserWorker, parseInWorker } from './core/workers/parserClient';
  import {
    activateOrAddTab,
    addRecent,
    canonicalIdentity,
    closeTab,
    createWorkspace,
    serializeSession,
    updateTab,
    type DocumentTab,
    type ReaderPosition
  } from './core/workspace/workspace';
  import {
    getConfig,
    getSession,
    getVaultIndex,
    onAppCommand,
    onFileChanged,
    onFilesDropped,
    openDocument,
    openDocumentAt,
    readDocument,
    quitApp,
    setConfig,
    setSession,
    setWindowTitle,
    unwatchDocument,
    watchDocument
  } from './ipc';
  import { appConfig } from './stores/configStore';
  import { applyTheme } from './core/theme/theme';

  const query = new URLSearchParams(window.location.search);
  const showDesignSystem = import.meta.env.DEV && query.has('design-system');
  const fixture = import.meta.env.DEV ? query.get('fixture') : null;
  let workspace = $state(createWorkspace());
  let documentView = $state<DocumentView | undefined>();
  let removeListeners: Array<() => void> = [];
  let persistTimer = 0;
  let dragActive = $state(false);
  let activeHeadingId = $state<string | null>(null);
  const livePositions = new Map<string, ReaderPosition>();
  let activeTab = $derived(workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? null);

  function sessionSnapshot() {
    return serializeSession({
      ...workspace,
      tabs: workspace.tabs.map((tab) => ({ ...tab, position: livePositions.get(tab.id) ?? tab.position }))
    });
  }

  function schedulePersist() {
    if (fixture || showDesignSystem) return;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => void setSession(sessionSnapshot()), 100);
  }

  function commit(next: typeof workspace, persist = true) {
    workspace = next;
    if (persist) schedulePersist();
  }

  async function parseOpened(tabId: string, opened: Awaited<ReturnType<typeof openDocumentAt>>) {
    const vaultIndex = await getVaultIndex(opened.trustedRoot);
    const model = await parseInWorker({
      source: opened.contents,
      path: opened.path,
      vaultIndexVersion: vaultIndex.version,
      vaultIndex
    });
    commit(
      updateTab(workspace, tabId, {
        path: opened.path,
        title: opened.path.replaceAll('\\', '/').split('/').at(-1) || opened.path,
        model,
        loading: false,
        error: null,
        trustedRoot: opened.trustedRoot,
        watching: true,
        changed: false
      })
    );
    await watchDocument(opened.path);
  }

  async function openPath(path: string, position?: ReaderPosition) {
    const existing = workspace.tabs.find((tab) => canonicalIdentity(tab.path) === canonicalIdentity(path));
    commit(activateOrAddTab(workspace, path, position));
    const tab = workspace.tabs.find((item) => canonicalIdentity(item.path) === canonicalIdentity(path));
    if (!tab || existing?.model) return;
    try {
      const opened = await openDocumentAt(path);
      await parseOpened(tab.id, opened);
      commit({ ...workspace, recents: addRecent(workspace.recents, opened.path) });
    } catch (error) {
      commit(updateTab(workspace, tab.id, {
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        watching: false
      }));
    }
  }

  async function handleOpen() {
    try {
      const opened = await openDocument();
      const existing = workspace.tabs.find((tab) => canonicalIdentity(tab.path) === canonicalIdentity(opened.path));
      commit(activateOrAddTab(workspace, opened.path));
      const tab = workspace.tabs.find((item) => canonicalIdentity(item.path) === canonicalIdentity(opened.path));
      if (tab && !existing?.model) await parseOpened(tab.id, opened);
      commit({ ...workspace, recents: addRecent(workspace.recents, opened.path) });
    } catch (error) {
      if (!String(error).toLowerCase().includes('cancel')) console.error(error);
    }
  }

  async function reloadDocument(path: string) {
    const tab = workspace.tabs.find((item) => canonicalIdentity(item.path) === canonicalIdentity(path));
    if (!tab) return;
    commit(updateTab(workspace, tab.id, { changed: true }));
    try {
      const opened = await readDocument(tab.path);
      const vaultIndex = await getVaultIndex(tab.trustedRoot);
      const model = await parseInWorker({
        source: opened.contents,
        path: opened.path,
        vaultIndexVersion: vaultIndex.version,
        vaultIndex
      });
      commit(updateTab(workspace, tab.id, { model, error: null, changed: false }));
    } catch (error) {
      commit(updateTab(workspace, tab.id, {
        error: error instanceof Error ? error.message : String(error),
        changed: false
      }));
    }
  }

  function activateTab(id: string) {
    commit({ ...workspace, activeTabId: id });
    const tab = workspace.tabs.find((item) => item.id === id);
    activeHeadingId = livePositions.get(id)?.activeHeadingId ?? tab?.position.activeHeadingId ?? null;
  }

  function handleClose(id: string) {
    const tab = workspace.tabs.find((item) => item.id === id);
    if (tab) void unwatchDocument(tab.path);
    commit(closeTab(workspace, id));
  }

  function reopenClosed() {
    const [tab, ...closedTabs] = workspace.closedTabs;
    if (!tab) return;
    commit({ ...workspace, closedTabs });
    void openPath(tab.path, tab.position);
  }

  function cycleTab(offset: number) {
    if (workspace.tabs.length < 2) return;
    const current = workspace.tabs.findIndex((tab) => tab.id === workspace.activeTabId);
    const index = (current + offset + workspace.tabs.length) % workspace.tabs.length;
    activateTab(workspace.tabs[index].id);
  }

  function navigate(anchorId: string) {
    documentView?.scrollToAnchor(anchorId);
  }

  function updatePosition(scrollTop: number, headingId: string | null) {
    if (!activeTab) return;
    livePositions.set(activeTab.id, { scrollTop, activeHeadingId: headingId });
    activeHeadingId = headingId;
    schedulePersist();
  }

  function cycleTheme() {
    const order = ['system', 'light', 'dark'] as const;
    const next = { ...$appConfig, theme: order[(order.indexOf($appConfig.theme) + 1) % order.length] };
    appConfig.set(next);
    if (!fixture) void setConfig(next);
  }

  function toggleMetadata() {
    const next = {
      ...$appConfig,
      frontmatterDisplay: $appConfig.frontmatterDisplay === 'panel' ? 'hidden' as const : 'panel' as const
    };
    appConfig.set(next);
    if (!fixture) void setConfig(next);
  }

  function toggleHighlighter() {
    const next = {
      ...$appConfig,
      highlighterEngine: $appConfig.highlighterEngine === 'highlightjs'
        ? 'shiki-js-regex' as const
        : 'highlightjs' as const
    };
    appConfig.set(next);
    if (!fixture) void setConfig(next);
  }

  function handleCommand(command: string) {
    if (command === 'open') void handleOpen();
    if (command === 'close-tab' && workspace.activeTabId) handleClose(workspace.activeTabId);
    if (command === 'reopen-tab') reopenClosed();
    if (command === 'next-tab') cycleTab(1);
    if (command === 'previous-tab') cycleTab(-1);
    if (command === 'reload' && activeTab) void reloadDocument(activeTab.path);
    if (command === 'quit') void quitApp();
  }

  function handleKeydown(event: KeyboardEvent) {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    let command = '';
    if (event.key.toLowerCase() === 'o') command = 'open';
    if (event.key.toLowerCase() === 'w') command = 'close-tab';
    if (event.key.toLowerCase() === 'r') command = 'reload';
    if (event.key === 'Tab') command = event.shiftKey ? 'previous-tab' : 'next-tab';
    if (event.shiftKey && event.key.toLowerCase() === 't') command = 'reopen-tab';
    if (event.key.toLowerCase() === 'q') command = 'quit';
    if (command) {
      event.preventDefault();
      handleCommand(command);
    }
  }

  async function loadFixture(name: string) {
    const response = await fetch(`/__maakdown_fixture/${encodeURI(name)}`);
    if (!response.ok) throw new Error(`Fixture load failed: ${response.status}`);
    const path = `fixtures/${name}`;
    const model = await parseInWorker({ source: await response.text(), path });
    commit(activateOrAddTab(workspace, path), false);
    const tab = workspace.tabs[0];
    commit(updateTab(workspace, tab.id, { model, loading: false, watching: false }), false);
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('dragenter', () => (dragActive = true));
    window.addEventListener('dragleave', () => (dragActive = false));
    window.addEventListener('drop', () => (dragActive = false));
    if (fixture) {
      void loadFixture(fixture);
      return;
    }
    if (showDesignSystem) return;
    void getConfig().then((config) => appConfig.set(config));
    void getSession().then(async (session) => {
      workspace = { ...workspace, recents: session.recents ?? [], restoring: true };
      for (const saved of session.tabs ?? []) {
        await openPath(saved.path, {
          scrollTop: saved.position.scrollTop,
          activeHeadingId: saved.position.activeHeadingId ?? null
        });
      }
      const active = workspace.tabs.find((tab) => canonicalIdentity(tab.path) === canonicalIdentity(session.activePath ?? ''));
      commit({ ...workspace, activeTabId: active?.id ?? workspace.activeTabId, restoring: false });
      activeHeadingId = active?.position.activeHeadingId ?? null;
    });
    removeListeners = [
      onFileChanged((path) => void reloadDocument(path)),
      onFilesDropped((paths) => paths.filter((path) => /\.md(?:own|arkdown)?$/i.test(path)).forEach((path) => void openPath(path))),
      onAppCommand(handleCommand)
    ];
  });

  $effect(() => {
    applyTheme($appConfig.theme);
  });

  $effect(() => {
    if (!fixture && !showDesignSystem) void setWindowTitle(activeTab?.path ?? '');
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
    removeListeners.forEach((remove) => remove());
    window.clearTimeout(persistTimer);
    disposeParserWorker();
  });
</script>

{#if showDesignSystem}
  <DesignSystemGallery />
{:else}
  <main class="workspace-shell" class:drop-active={dragActive}>
    <aside class="sidebar" aria-label="Table of contents">
      <div class="sidebar-brand"><span class="brand-mark" aria-hidden="true">M</span><strong>Maakdown</strong></div>
      {#if activeTab?.model}
        <TocSidebar headings={activeTab.model.headings} {activeHeadingId} onNavigate={navigate} />
      {:else}
        <p class="muted">No document outline</p>
      {/if}
    </aside>

    <section class="workspace-main">
      <WorkspaceToolbar
        title={activeTab?.title ?? ''}
        watching={activeTab?.watching ?? false}
        config={$appConfig}
        onOpen={handleOpen}
        onTheme={cycleTheme}
        onMetadata={toggleMetadata}
        onHighlighter={toggleHighlighter}
      />
      <TabStrip tabs={workspace.tabs} activeTabId={workspace.activeTabId} onActivate={activateTab} onClose={handleClose} onAdd={handleOpen} />

      {#if activeTab?.error}
        <article class="document-surface error"><h1>Could not open document</h1><p>{activeTab.error}</p></article>
      {:else if activeTab?.model}
        <div class="reader-grid">
          <DocumentView
            bind:this={documentView}
            model={activeTab.model}
            documentPath={activeTab.path}
            initialScrollTop={livePositions.get(activeTab.id)?.scrollTop ?? activeTab.position.scrollTop}
            onPositionChange={updatePosition}
            onOpenDocument={openPath}
          />
          {#if $appConfig.frontmatterDisplay === 'panel'}
            <MetadataPanel frontmatter={activeTab.model.frontmatter} />
          {/if}
        </div>
      {:else if activeTab?.loading || workspace.restoring}
        <div class="workspace-loading" role="status">Opening document...</div>
      {:else}
        <WorkspaceEmptyState recents={workspace.recents} onOpen={handleOpen} onOpenRecent={openPath} />
      {/if}
      {#if dragActive}<div class="drop-overlay">Drop Markdown files to open</div>{/if}
    </section>
  </main>
{/if}
