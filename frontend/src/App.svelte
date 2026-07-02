<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { LoaderCircle } from '@lucide/svelte';
  import DesignSystemGallery from './design-system/DesignSystemGallery.svelte';
  import DocumentView from './components/DocumentView.svelte';
  import TabStrip from './components/TabStrip.svelte';
  import Minimap from './components/Minimap.svelte';
  import WorkspaceEmptyState from './components/WorkspaceEmptyState.svelte';
  import WorkspaceToolbar from './components/WorkspaceToolbar.svelte';
  import SearchBar from './components/SearchBar.svelte';
  import ReaderSettings from './components/ReaderSettings.svelte';
  import CommandPalette from './components/CommandPalette.svelte';
  import ReaderError from './components/ReaderError.svelte';
  import AboutDialog from './components/AboutDialog.svelte';
  import ContextMenu from './components/ContextMenu.svelte';
  import { openContextMenu, type ContextMenuItem } from './stores/contextMenu';
  import { isInternalHref } from './core/navigation/navigation';
  import { disposeParserWorker, parseInWorker } from './core/workers/parserClient';
  import {
    activateOrAddTab,
    addRecent,
    canonicalIdentity,
    clearMissingRecents,
    clearUnpinnedRecents,
    closeTab,
    createWorkspace,
    markRecentMissing,
    pinRecent,
    relocateTab,
    serializeSession,
    updateTab,
    type DocumentTab,
    type ReaderPosition
  } from './core/workspace/workspace';
  import {
    consumePendingOpenFiles,
    getConfig,
    getSession,
    getVaultIndex,
    onAppCommand,
    onFileChanged,
    onFilesDropped,
    onOpenFile,
    isDesktopRuntime,
    openDocument,
    openDocumentAt,
    openExternal,
    readDocument,
    quitApp,
    printWindow,
    setConfig,
    setSession,
    setWindowTitle,
    unwatchDocument,
    watchDocument
  } from '@ipc';
  import { appConfig } from './stores/configStore';
  import { applyTheme } from './core/theme/theme';
  import { applyReaderTheme, resolveTheme } from './core/theme/readerTheme';
  import { searchDocument } from './core/search/search';
  import {
    buildSearchMinimapMarks,
    buildStructuralMinimapMarks,
    type MinimapViewport
  } from './core/minimap/minimap';
  import { projectDocumentStats } from './core/stats/documentStats';
  import {
    moveHistory as moveNavigationHistory,
    pushHistory,
    replaceCurrent,
    type NavigationEntry
  } from './core/navigation/history';

  const query = new URLSearchParams(window.location.search);
  const desktopRuntime = isDesktopRuntime();
  const showDesignSystem = (import.meta.env.DEV || import.meta.env.MODE === 'benchmark') && query.has('design-system');
  const fixture = (import.meta.env.DEV || import.meta.env.MODE === 'benchmark') ? query.get('fixture') : null;
  // $state.raw: workspace is only ever replaced wholesale via commit(), and the
  // deep proxy of plain $state gave tab.model a fresh proxy identity on every
  // commit — each scroll-position commit re-fired DocumentView's restore effect,
  // which rebuilt the virtualizer and oscillated the scroll position after
  // outline navigation. Raw state keeps object identities stable.
  let workspace = $state.raw(createWorkspace());
  let documentView = $state<DocumentView | undefined>();
  let removeListeners: Array<() => void> = [];
  let persistTimer = 0;
  let dragActive = $state(false);
  // dragenter/dragleave fire per child element, so a depth counter keeps the
  // drop overlay steady instead of flickering as the pointer crosses elements.
  let dragDepth = 0;
  let dragClearTimer = 0;
  let activeHeadingId = $state<string | null>(null);
  let searchOpen = $state(false);
  let searchQuery = $state('');
  let searchIndex = $state(0);
  let searchCaseSensitive = $state(false);
  let searchStatus = $state('');
  let settingsOpen = $state(false);
  let aboutOpen = $state(false);
  let paletteOpen = $state(false);
  let printing = $state(false);
  let narrowWindow = $state(false);
  let mobileOutlineOpen = $state(false);
  let mobileMetadataOpen = $state(false);
  const livePositions = new Map<string, ReaderPosition>();
  let paletteReturnFocus: HTMLElement | null = null;
  let printController: AbortController | null = null;
  let printProgress = $state(0);
  let announcement = $state('');
  let activeTab = $derived(workspace.tabs.find((tab) => tab.id === workspace.activeTabId) ?? null);
  let searchMatches = $derived(activeTab?.model ? searchDocument(activeTab.model, searchQuery, { caseSensitive: searchCaseSensitive }) : []);
  let minimapViewport = $state<MinimapViewport>({ start: 0, end: 0.05 });
  let minimapMarks = $derived.by(() => {
    if (!activeTab?.model) return [];
    return [
      ...buildStructuralMinimapMarks(activeTab.model),
      ...(searchOpen && searchQuery ? buildSearchMinimapMarks(activeTab.model, searchMatches) : [])
    ];
  });
  let activeStats = $derived(activeTab?.model ? projectDocumentStats(activeTab.model) : null);

  $effect(() => {
    searchQuery;
    searchMatches.length;
    if (!searchQuery) {
      searchStatus = '';
      searchIndex = 0;
    } else if (!searchMatches.length) {
      searchStatus = 'No results';
      searchIndex = 0;
    } else if (searchIndex >= searchMatches.length) {
      searchIndex = 0;
      searchStatus = '';
    } else if (searchStatus === 'No results') {
      searchStatus = '';
    }
  });

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
      commit({ ...workspace, recents: markRecentMissing(workspace.recents, path) });
      commit(updateTab(workspace, tab.id, {
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        watching: false
      }));
    }
  }

  function currentLocation(tab = activeTab): NavigationEntry | null {
    if (!tab) return null;
    const position = livePositions.get(tab.id) ?? tab.position;
    return { path: tab.path, scrollTop: position.scrollTop, anchorId: position.activeHeadingId };
  }

  async function openLinkedPath(path: string) {
    const source = activeTab;
    const sourceLocation = currentLocation(source);
    const sourceHistory = source && sourceLocation ? pushHistory(source.history, sourceLocation) : null;
    await openPath(path);
    const target = workspace.tabs.find((tab) => canonicalIdentity(tab.path) === canonicalIdentity(path));
    if (!target) return;
    const destination = { path: target.path, scrollTop: 0, anchorId: null };
    const history = pushHistory(sourceHistory ?? target.history, destination);
    commit(updateTab(workspace, target.id, { history }));
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
    commit(updateTab(workspace, tab.id, { changed: true, reloading: true }));
    try {
      const opened = await readDocument(tab.path);
      const vaultIndex = await getVaultIndex(tab.trustedRoot);
      const model = await parseInWorker({
        source: opened.contents,
        path: opened.path,
        vaultIndexVersion: vaultIndex.version,
        vaultIndex
      });
      commit(updateTab(workspace, tab.id, { model, error: null, changed: false, reloading: false }));
    } catch (error) {
      commit(updateTab(workspace, tab.id, {
        error: error instanceof Error ? error.message : String(error),
        changed: false,
        reloading: false
      }));
    }
  }

  function activateTab(id: string) {
    commit({ ...workspace, activeTabId: id });
    const tab = workspace.tabs.find((item) => item.id === id);
    activeHeadingId = livePositions.get(id)?.activeHeadingId ?? tab?.position.activeHeadingId ?? null;
    minimapViewport = { start: 0, end: 0.05 };
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

  function updateRecents(recents: typeof workspace.recents) {
    commit({ ...workspace, recents });
  }

  function handlePinRecent(path: string, pinned: boolean) {
    updateRecents(pinRecent(workspace.recents, path, pinned));
  }

  async function relocateMissingTab(id: string) {
    const tab = workspace.tabs.find((item) => item.id === id);
    if (!tab) return;
    try {
      const opened = await openDocument();
      const existing = workspace.tabs.find(
        (item) => item.id !== id && canonicalIdentity(item.path) === canonicalIdentity(opened.path)
      );
      if (tab.watching) await unwatchDocument(tab.path);
      commit(relocateTab(workspace, id, opened.path));
      if (existing) return;
      await parseOpened(id, opened);
      commit({ ...workspace, recents: addRecent(workspace.recents, opened.path) });
    } catch (error) {
      if (String(error).toLowerCase().includes('cancel')) return;
      commit(updateTab(workspace, id, {
        loading: false,
        error: error instanceof Error ? error.message : String(error),
        watching: false
      }));
    }
  }

  function cycleTab(offset: number) {
    if (workspace.tabs.length < 2) return;
    const current = workspace.tabs.findIndex((tab) => tab.id === workspace.activeTabId);
    const index = (current + offset + workspace.tabs.length) % workspace.tabs.length;
    activateTab(workspace.tabs[index].id);
  }

  function navigate(anchorId: string) {
    if (activeTab) {
      const current = currentLocation(activeTab);
      let history = current ? pushHistory(activeTab.history, current) : activeTab.history;
      history = pushHistory(history, { path: activeTab.path, scrollTop: current?.scrollTop ?? 0, anchorId });
      commit(updateTab(workspace, activeTab.id, { history }));
    }
    documentView?.scrollToAnchor(anchorId);
  }

  async function moveHistory(offset: number) {
    if (!activeTab) return;
    const current = currentLocation(activeTab);
    const synced = current ? replaceCurrent(activeTab.history, current) : activeTab.history;
    const history = moveNavigationHistory(synced, offset);
    if (history.index === synced.index) return;
    const entry = history.entries[history.index];
    await openPath(entry.path, { scrollTop: entry.scrollTop, activeHeadingId: entry.anchorId });
    const target = workspace.tabs.find((tab) => canonicalIdentity(tab.path) === canonicalIdentity(entry.path));
    if (!target) return;
    livePositions.set(target.id, { scrollTop: entry.scrollTop, activeHeadingId: entry.anchorId });
    commit(updateTab(workspace, target.id, { history }));
    queueMicrotask(() => entry.anchorId ? documentView?.scrollToAnchor(entry.anchorId) : documentView?.scrollToOffset(entry.scrollTop));
  }

  function updatePosition(scrollTop: number, headingId: string | null) {
    if (!activeTab) return;
    livePositions.set(activeTab.id, { scrollTop, activeHeadingId: headingId });
    if (activeTab.history.index >= 0) {
      commit(updateTab(workspace, activeTab.id, {
        history: replaceCurrent(activeTab.history, { path: activeTab.path, scrollTop, anchorId: headingId })
      }), false);
    }
    activeHeadingId = headingId;
    schedulePersist();
  }

  function cycleTheme() {
    // Toggle against the currently *resolved* mode so one click always flips the
    // visible theme. Cycling through 'system' previously produced a no-op when it
    // resolved to the same mode already showing (e.g. dark -> system on a dark OS).
    const next = { ...$appConfig, theme: resolveTheme($appConfig.theme) === 'dark' ? 'light' as const : 'dark' as const };
    appConfig.set(next);
    if (!fixture) void setConfig(next);
  }

  function toggleMetadata() {
    // The metadata masthead lives inline in the reading column, so it toggles
    // the same way at every width.
    const next = {
      ...$appConfig,
      frontmatterDisplay: $appConfig.frontmatterDisplay === 'panel' ? 'hidden' as const : 'panel' as const
    };
    appConfig.set(next);
    if (!fixture) void setConfig(next);
  }

  function toggleOutline() {
    // The outline is now an edge minimap overlaid on the reader, so it toggles
    // the same way at every width.
    updateConfig({ ...$appConfig, outlineVisible: !$appConfig.outlineVisible });
  }

  function resizePanel(kind: 'outline' | 'metadata', event: PointerEvent) {
    const start = event.clientX;
    const initial = kind === 'outline' ? $appConfig.outlineWidth : $appConfig.metadataWidth;
    const move = (next: PointerEvent) => {
      const delta = next.clientX - start;
      const width = Math.max(kind === 'outline' ? 200 : 220, Math.min(480, initial + (kind === 'outline' ? delta : -delta)));
      document.documentElement.style.setProperty(kind === 'outline' ? '--sidebar-width' : '--metadata-width', `${width}px`);
    };
    const up = (next: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const delta = next.clientX - start;
      const width = Math.max(kind === 'outline' ? 200 : 220, Math.min(480, initial + (kind === 'outline' ? delta : -delta)));
      updateConfig({ ...$appConfig, [kind === 'outline' ? 'outlineWidth' : 'metadataWidth']: width });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
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

  function updateConfig(next: typeof $appConfig) {
    appConfig.set(next);
    if (!fixture) void setConfig(next);
  }

  function toggleFocus() {
    updateConfig({ ...$appConfig, focusMode: !$appConfig.focusMode });
  }

  function showSearch() {
    searchOpen = true;
    settingsOpen = false;
  }

  function moveSearch(offset: number) {
    if (!searchMatches.length) return;
    const previous = searchIndex;
    searchIndex = (searchIndex + offset + searchMatches.length) % searchMatches.length;
    searchStatus = searchIndex < previous && offset > 0
      ? 'Wrapped to first result'
      : searchIndex > previous && offset < 0
        ? 'Wrapped to last result'
        : '';
    void documentView?.scrollToBlock(searchMatches[searchIndex].blockId);
  }

  function updateViewport(startBlockIndex: number, endBlockIndex: number) {
    const total = Math.max(1, (activeTab?.model?.blocks.length ?? 1) - 1);
    minimapViewport = {
      start: Math.max(0, Math.min(1, startBlockIndex / total)),
      end: Math.max(0.02, Math.min(1, endBlockIndex / total))
    };
  }

  async function printDocument() {
    if (!documentView || printing) return;
    printing = true;
    printProgress = 0;
    printController = new AbortController();
    announcement = 'Preparing complete document for print';
    try {
      const ready = await documentView.preparePrint(printController.signal, (value) => (printProgress = value));
      if (!ready) {
        announcement = 'Print preparation cancelled';
        return;
      }
      await printWindow();
      announcement = 'Print dialog opened';
    } finally {
      documentView.restoreAfterPrint();
      printing = false;
      printController = null;
      printProgress = 0;
    }
  }

  let activeHistory = $derived.by(() => {
    return activeTab?.history;
  });

  function openPalette() {
    paletteReturnFocus = document.activeElement as HTMLElement | null;
    paletteOpen = true;
  }

  function closePalette() {
    paletteOpen = false;
    queueMicrotask(() => paletteReturnFocus?.focus());
  }

  function handleCommand(command: string) {
    if (command === 'open') void handleOpen();
    if (command === 'close-tab' && workspace.activeTabId) handleClose(workspace.activeTabId);
    if (command === 'reopen-tab') reopenClosed();
    if (command === 'next-tab') cycleTab(1);
    if (command === 'previous-tab') cycleTab(-1);
    if (command === 'reload' && activeTab) void reloadDocument(activeTab.path);
    if (command === 'find') showSearch();
    if (command === 'focus') toggleFocus();
    if (command === 'line-numbers') updateConfig({ ...$appConfig, documentLineNumbers: !$appConfig.documentLineNumbers });
    // Outline/metadata toggles are no longer surfaced as toolbar buttons, but the
    // wiring stays reachable for future advanced settings.
    if (command === 'toggle-outline') toggleOutline();
    if (command === 'toggle-metadata') toggleMetadata();
    if (command === 'print') void printDocument();
    if (command === 'theme') cycleTheme();
    if (command === 'palette') openPalette();
    if (command === 'settings') settingsOpen = true;
    if (command === 'about') aboutOpen = true;
    if (command === 'quit') void quitApp();
  }

  function copyText(text: string) {
    if (!text) return;
    void navigator.clipboard?.writeText(text).catch(() => {});
  }

  function closeOthers(keepId: string) {
    for (const id of workspace.tabs.map((tab) => tab.id)) {
      if (id !== keepId) handleClose(id);
    }
  }

  function readerMenuItems(target: HTMLElement): ContextMenuItem[] {
    const selection = window.getSelection?.()?.toString().trim() ?? '';
    const link = target.closest('a');
    const image = target.closest('img');
    const pre = target.closest('pre');
    const items: ContextMenuItem[] = [];

    if (link) {
      const notePath = link.dataset.notePath;
      const href = link.getAttribute('href') ?? '';
      if (notePath) {
        items.push({ label: 'Open note', onSelect: () => void openLinkedPath(notePath) });
        items.push({ label: 'Copy note name', onSelect: () => copyText(link.textContent ?? '') });
      } else if (href && !isInternalHref(href)) {
        items.push({ label: 'Open link in browser', onSelect: () => void openExternal(new URL(href, window.location.href).toString()) });
        items.push({ label: 'Copy link', onSelect: () => copyText(new URL(href, window.location.href).toString()) });
      } else if (href) {
        items.push({ label: 'Copy link', onSelect: () => copyText(href) });
      }
      return items;
    }

    if (image) {
      items.push({ label: 'Copy image address', onSelect: () => copyText(image.currentSrc || image.src) });
      return items;
    }

    if (selection) {
      items.push({ label: 'Copy', onSelect: () => copyText(selection) });
      items.push({ label: `Find “${selection.length > 24 ? `${selection.slice(0, 24)}…` : selection}”`, onSelect: () => { showSearch(); searchQuery = selection; searchIndex = 0; } });
      return items;
    }

    if (pre) {
      items.push({ label: 'Copy code', onSelect: () => copyText(pre.textContent ?? '') });
      items.push({ separator: true });
    }
    items.push({ label: 'Find in document', onSelect: showSearch });
    items.push({ label: 'Reload', disabled: !activeTab, onSelect: () => activeTab && void reloadDocument(activeTab.path) });
    items.push({ label: 'Print', disabled: !activeTab?.model, onSelect: () => void printDocument() });
    return items;
  }

  function handleContextMenu(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea')) return; // keep native editing menu in fields
    // Suppress the native webview menu everywhere; only surfaces with
    // non-redundant actions get a custom menu (the title bar and metadata panel
    // are intentionally excluded — their actions live on visible controls).
    event.preventDefault();

    const tabEl = target.closest<HTMLElement>('.document-tab');
    const headingEl = target.closest<HTMLElement>('.minimap [data-heading-id]');
    let items: ContextMenuItem[] | null = null;

    if (tabEl?.dataset.tabId) {
      const id = tabEl.dataset.tabId;
      const tab = workspace.tabs.find((item) => item.id === id);
      items = [
        { label: 'Close tab', danger: true, onSelect: () => handleClose(id) },
        { label: 'Close other tabs', disabled: workspace.tabs.length < 2, onSelect: () => closeOthers(id) },
        { label: 'Reopen closed tab', disabled: workspace.closedTabs.length === 0, onSelect: reopenClosed },
        { separator: true },
        { label: 'Copy path', disabled: !tab, onSelect: () => copyText(tab?.path ?? '') }
      ];
    } else if (headingEl?.dataset.headingId) {
      const id = headingEl.dataset.headingId;
      items = [
        { label: 'Copy link to section', onSelect: () => copyText(`#${id}`) },
        { label: 'Copy heading text', onSelect: () => copyText(headingEl.textContent?.trim() ?? '') }
      ];
    } else if (target.closest('.document-scroll')) {
      items = readerMenuItems(target);
    }

    if (items) openContextMenu(items, event.clientX, event.clientY);
  }

  function handleKeydown(event: KeyboardEvent) {
    const mod = event.metaKey || event.ctrlKey;
    if (!mod) return;
    let command = '';
    if (event.key.toLowerCase() === 'o') command = 'open';
    if (event.key.toLowerCase() === 'w') command = 'close-tab';
    if (event.key.toLowerCase() === 'r') command = 'reload';
    if (event.key.toLowerCase() === 'f') command = 'find';
    if (event.shiftKey && event.key.toLowerCase() === 'f') command = 'focus';
    if (event.key === 'Tab') command = event.shiftKey ? 'previous-tab' : 'next-tab';
    if (event.shiftKey && event.key.toLowerCase() === 't') command = 'reopen-tab';
    if (event.key.toLowerCase() === 'q') command = 'quit';
    if (event.key.toLowerCase() === 'p') command = 'print';
    if (event.key.toLowerCase() === 'k') command = 'palette';
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
    const narrowQuery = window.matchMedia('(max-width: 900px)');
    const updateNarrow = () => {
      narrowWindow = narrowQuery.matches;
      if (!narrowWindow) {
        mobileOutlineOpen = false;
        mobileMetadataOpen = false;
      }
    };
    updateNarrow();
    narrowQuery.addEventListener('change', updateNarrow);
    window.addEventListener('keydown', handleKeydown);
    if (import.meta.env.MODE === 'benchmark') {
      (window as unknown as {
        __maakdownBenchmark?: {
          parseFixture: (name: string, collectSourcePositions?: boolean) => Promise<unknown>;
          activeModelStats: () => unknown;
        };
      }).__maakdownBenchmark = {
        parseFixture: async (name, collectSourcePositions = true) => {
          const response = await fetch(`/__maakdown_fixture/${encodeURI(name)}`);
          if (!response.ok) throw new Error(`Fixture load failed: ${response.status}`);
          const source = await response.text();
          const started = performance.now();
          const model = await parseInWorker({ source, path: `fixtures/${name}`, collectSourcePositions });
          return {
            durationMs: performance.now() - started,
            blockCount: model.blocks.length,
            sourceLineCount: model.sourceLineCount,
            sourcePositionedBlocks: model.blocks.filter((block) => block.sourceStart).length,
            transferBytes: new TextEncoder().encode(JSON.stringify(model)).byteLength
          };
        },
        activeModelStats: () => ({
          blocks: activeTab?.model?.blocks.length ?? 0,
          headings: activeTab?.model?.headings.length ?? 0,
          languages: activeTab?.model?.languages.length ?? 0,
          sourceLineCount: activeTab?.model?.sourceLineCount ?? 0
        })
      };
    }
    const openPaletteEvent = () => openPalette();
    window.addEventListener('maakdown:palette', openPaletteEvent);
    // File drag-and-drop: preventDefault is required so the webview does not
    // navigate to the dropped file (otherwise WebKitGTK on Linux opens it as a
    // text view) and so the window is a valid drop target on macOS. The actual
    // file paths arrive via the native OnFileDrop event (onFilesDropped), since
    // the browser File API does not expose filesystem paths.
    const dragHasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files');
    const clearDrag = () => {
      dragDepth = 0;
      dragActive = false;
    };
    // Safety net: DisableWebViewDrop means the JS 'drop' event may not fire, so
    // clear the overlay shortly after dragover stops (drop, cancel, or leave).
    const armDragTimeout = () => {
      window.clearTimeout(dragClearTimer);
      dragClearTimer = window.setTimeout(clearDrag, 250);
    };
    const onDragEnter = (event: DragEvent) => {
      if (!dragHasFiles(event)) return;
      event.preventDefault();
      dragDepth += 1;
      dragActive = true;
      armDragTimeout();
    };
    const onDragOver = (event: DragEvent) => {
      if (!dragHasFiles(event)) return;
      event.preventDefault();
      dragActive = true;
      armDragTimeout();
    };
    const onDragLeave = (event: DragEvent) => {
      if (!dragActive) return;
      event.preventDefault();
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) clearDrag();
    };
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      window.clearTimeout(dragClearTimer);
      clearDrag();
    };
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    removeListeners.push(
      () => window.removeEventListener('dragenter', onDragEnter),
      () => window.removeEventListener('dragover', onDragOver),
      () => window.removeEventListener('dragleave', onDragLeave),
      () => window.removeEventListener('drop', onDrop),
      () => window.clearTimeout(dragClearTimer)
    );
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
      // Files the OS handed us before this point (double-click launch); opened
      // after restore so they land as the active tab. Live opens arrive via the
      // "open-file" event; tab dedup makes any overlap harmless.
      for (const pending of await consumePendingOpenFiles()) {
        await openPath(pending);
      }
    });
    removeListeners.push(
      onFileChanged((path) => void reloadDocument(path)),
      onOpenFile((path) => void openPath(path)),
      onFilesDropped((paths) => {
        // DisableWebViewDrop means the JS 'drop' event never fires, so clear the
        // drop overlay here when the native drop completes.
        dragActive = false;
        dragDepth = 0;
        paths.filter((path) => /\.md(?:own|arkdown)?$/i.test(path)).forEach((path) => void openPath(path));
      }),
      onAppCommand(handleCommand)
    );
    removeListeners.push(() => window.removeEventListener('maakdown:palette', openPaletteEvent));
    removeListeners.push(() => narrowQuery.removeEventListener('change', updateNarrow));
  });

  $effect(() => {
    const mode = resolveTheme($appConfig.theme);
    applyTheme($appConfig.theme);
    applyReaderTheme($appConfig.readerTheme, mode);
    document.documentElement.style.setProperty('--font-reader', $appConfig.readerFont === 'serif' ? 'var(--font-serif)' : 'var(--font-sans)');
    document.documentElement.style.setProperty('--reader-font-size', `${$appConfig.readerFontSize}px`);
    document.documentElement.style.setProperty('--reader-line-height', $appConfig.readerLineHeight === 'compact' ? '1.45' : $appConfig.readerLineHeight === 'relaxed' ? '1.85' : '1.65');
    document.documentElement.style.setProperty('--reading-measure', $appConfig.readerMeasure === 'narrow' ? '680px' : $appConfig.readerMeasure === 'wide' ? '1040px' : '860px');
    document.documentElement.style.setProperty('--sidebar-width', `${$appConfig.outlineWidth}px`);
    document.documentElement.style.setProperty('--metadata-width', `${$appConfig.metadataWidth}px`);
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
  <main
    class="workspace-shell"
    class:drop-active={dragActive}
    class:focus-mode={$appConfig.focusMode}
    class:no-outline={!$appConfig.outlineVisible}
    class:outline-open={mobileOutlineOpen}
    class:metadata-open={mobileMetadataOpen}
    class:frameless={desktopRuntime}
    oncontextmenu={handleContextMenu}
  >
    <section class="workspace-main">
      <WorkspaceToolbar
        reloading={activeTab?.reloading ?? false}
        canBack={(activeHistory?.index ?? -1) > 0}
        canForward={Boolean(activeHistory && activeHistory.index < activeHistory.entries.length - 1)}
        config={$appConfig}
        onOpen={handleOpen}
        onTheme={cycleTheme}
        onSearch={showSearch}
        onSettings={() => (settingsOpen = !settingsOpen)}
        onFocus={toggleFocus}
        onReload={() => activeTab && void reloadDocument(activeTab.path)}
        onBack={() => void moveHistory(-1)}
        onForward={() => void moveHistory(1)}
      />
      <TabStrip tabs={workspace.tabs} activeTabId={workspace.activeTabId} onActivate={activateTab} onClose={handleClose} />
      {#if searchOpen}
        <SearchBar
          query={searchQuery}
          index={searchIndex}
          total={searchMatches.length}
          caseSensitive={searchCaseSensitive}
          onQuery={(value) => { searchQuery = value; searchIndex = 0; searchStatus = ''; }}
          status={searchStatus}
          onCase={() => { searchCaseSensitive = !searchCaseSensitive; searchIndex = 0; searchStatus = ''; }}
          onPrevious={() => moveSearch(-1)}
          onNext={() => moveSearch(1)}
          onClose={() => { searchOpen = false; searchQuery = ''; searchStatus = ''; }}
        />
      {/if}
      {#if settingsOpen}
        <button type="button" class="settings-dismiss-layer" aria-label="Close settings" onclick={() => (settingsOpen = false)}></button>
        <ReaderSettings config={$appConfig} onChange={updateConfig} onClose={() => (settingsOpen = false)} onAbout={() => { settingsOpen = false; aboutOpen = true; }} />
      {/if}
      {#if paletteOpen}
        <CommandPalette
          tabs={workspace.tabs}
          recents={workspace.recents}
          headings={activeTab?.model?.headings ?? []}
          onCommand={handleCommand}
          onOpenPath={(path) => void openLinkedPath(path)}
          onHeading={navigate}
          onClose={closePalette}
        />
      {/if}

      {#if activeTab?.error}
        <ReaderError
          error={activeTab.error}
          onRetry={() => void openPath(activeTab.path)}
          onRelocate={() => void relocateMissingTab(activeTab.id)}
          onClose={() => handleClose(activeTab.id)}
        />
      {:else if activeTab?.model}
        <div class="reader-grid">
          {#if $appConfig.outlineVisible}
            <Minimap
              headings={activeTab.model.headings}
              {activeHeadingId}
              marks={minimapMarks}
              viewport={minimapViewport}
              activeSearchBlockId={searchMatches[searchIndex]?.blockId ?? null}
              onNavigate={navigate}
            />
          {/if}
          <DocumentView
            bind:this={documentView}
            model={activeTab.model}
            documentPath={activeTab.path}
            initialScrollTop={livePositions.get(activeTab.id)?.scrollTop ?? activeTab.position.scrollTop}
            onPositionChange={updatePosition}
            onViewportChange={updateViewport}
            onOpenDocument={openLinkedPath}
            searchQuery={searchOpen ? searchQuery : ''}
            searchBlockId={searchMatches[searchIndex]?.blockId ?? null}
          searchCaseSensitive={searchCaseSensitive}
            showMasthead={$appConfig.frontmatterDisplay === 'panel' && (!printing || $appConfig.printMetadata)}
            stats={activeStats}
            showDocumentLineNumbers={$appConfig.documentLineNumbers}
          />
        </div>
      {:else if activeTab?.loading || workspace.restoring}
        <div class="workspace-loading" role="status">
          <LoaderCircle class="spinner" size={24} aria-hidden="true" />
          <span>Opening document…</span>
        </div>
      {:else}
        <WorkspaceEmptyState
          recents={workspace.recents}
          onOpen={handleOpen}
          onOpenRecent={openPath}
          onPinRecent={handlePinRecent}
          onClearMissing={() => updateRecents(clearMissingRecents(workspace.recents))}
          onClearUnpinned={() => updateRecents(clearUnpinnedRecents(workspace.recents))}
        />
      {/if}
      {#if dragActive}<div class="drop-overlay">Drop Markdown files to open</div>{/if}
      {#if printing}
        <div class="print-status" role="status">
          <span>Preparing complete document for print... {printProgress}%</span>
          <button type="button" onclick={() => printController?.abort()}>Cancel</button>
        </div>
      {/if}
      <p class="sr-only" aria-live="polite">{announcement}</p>
    </section>
    <ContextMenu />
    <AboutDialog open={aboutOpen} onClose={() => (aboutOpen = false)} />
  </main>
{/if}
