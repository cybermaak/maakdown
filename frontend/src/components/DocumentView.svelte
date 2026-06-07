<script lang="ts">
  import { tick, untrack } from 'svelte';
  import BlockView from './BlockView.svelte';
  import { enhancementManager } from '../core/enhancement/enhancementManager';
  import type { DocumentModel } from '../core/model/types';
  import { anchorIdFromHref, getActiveHeading, isInternalHref, resolveAnchor } from '../core/navigation/navigation';
  import { BlockVirtualizer, type VirtualRange } from '../core/virtualizer/virtualizer';
  import { shouldResolveAsset } from '../core/assets/assets';
  import { openExternal, resolveAsset } from '@ipc';
  import { appConfig } from '../stores/configStore';
  import DiagramDialog from './DiagramDialog.svelte';

  interface Props {
    model: DocumentModel;
    documentPath: string;
    onOpenDocument?: (path: string) => void;
    initialScrollTop?: number;
    onPositionChange?: (scrollTop: number, activeHeadingId: string | null) => void;
    searchQuery?: string;
    searchBlockId?: string | null;
    searchCaseSensitive?: boolean;
  }

  let { model, documentPath, onOpenDocument, initialScrollTop = 0, onPositionChange, searchQuery = '', searchBlockId = null, searchCaseSensitive = false }: Props = $props();
  let surface = $state<HTMLElement | undefined>();
  let virtualizer = new BlockVirtualizer(0);
  let range = $state<VirtualRange>({ start: 0, end: 0, top: 0, bottom: 0 });
  let measurementFrame = 0;
  let restoredPath = '';
  let printRange: VirtualRange | null = null;
  let announcement = $state('');
  let diagram = $state<{ title: string; html: string } | null>(null);
  let printMode = $state(false);
  let enhancedForPrint = new Set<string>();

  $effect(() => {
    model;
    documentPath;
    virtualizer = new BlockVirtualizer(model.blocks.length);
    const viewportHeight = untrack(() => surface?.clientHeight ?? 900);
    range = virtualizer.range(0, viewportHeight);
    const currentScroll = untrack(() => surface?.scrollTop ?? 0);
    const restoreTop = restoredPath === documentPath ? currentScroll : untrack(() => initialScrollTop);
    restoredPath = documentPath;
    queueMicrotask(() => {
      if (surface) {
        surface.scrollTop = restoreTop;
        updateRange();
      }
    });
    void resolveVisibleImages();
  });

  $effect(() => {
    void enhancementManager.configure(
      $appConfig.highlighterEngine,
      resolvedTheme($appConfig.theme),
      model.languages
    );
  });

  async function navigateTo(anchorId: string) {
    const target = resolveAnchor(model, anchorId);
    if (!target) {
      return;
    }

    const index = model.blocks.findIndex((block) => block.id === target.blockId);
    if (index < 0 || !surface) {
      return;
    }

    surface.scrollTop = virtualizer.offsetFor(index);
    updateRange();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      await tick();
      const element = document.getElementById(target.blockId);
      if (!element) {
        updateRange();
        continue;
      }
      const delta = element.getBoundingClientRect().top - surface.getBoundingClientRect().top;
      if (Math.abs(delta) <= 2) {
        break;
      }
      surface.scrollTop += delta;
      updateRange();
    }
    onPositionChange?.(surface.scrollTop, anchorId);
  }

  function handleClick(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a');
    const notePath = link?.dataset.notePath;
    if (notePath) {
      event.preventDefault();
      onOpenDocument?.(notePath);
      return;
    }
    const href = link?.getAttribute('href');
    if (!href) {
      return;
    }

    if (!isInternalHref(href)) {
      const url = new URL(href, window.location.href);
      if (['http:', 'https:', 'mailto:'].includes(url.protocol)) {
        event.preventDefault();
        void openExternal(url.toString());
      }
      return;
    }

    event.preventDefault();
    void navigateTo(anchorIdFromHref(href));
  }

  function handleScroll() {
    // A queued scroll event can fire while the surface is being detached during
    // tab close; bail before touching the (possibly cleared) model.
    if (!surface || !surface.isConnected) {
      return;
    }
    updateRange();
    const startBlock = model.blocks[virtualizer.indexAt(surface?.scrollTop ?? 0)];
    const activeHeadingId = getActiveHeading(model, {
      startBlockId: startBlock?.id ?? null,
      endBlockId: model.blocks[Math.max(range.end - 1, range.start)]?.id ?? null
    });
    onPositionChange?.(surface?.scrollTop ?? 0, activeHeadingId);
  }

  export function scrollToAnchor(anchorId: string) {
    void navigateTo(anchorId);
  }

  export async function scrollToBlock(blockId: string) {
    const index = model.blocks.findIndex((block) => block.id === blockId);
    if (index < 0 || !surface) return;
    surface.scrollTop = virtualizer.offsetFor(index);
    updateRange();
    await tick();
    document.getElementById(blockId)?.scrollIntoView({ block: 'center' });
  }

  export function scrollToOffset(scrollTop: number) {
    if (!surface) return;
    surface.scrollTop = scrollTop;
    updateRange();
  }

  export async function preparePrint(signal: AbortSignal, onProgress: (value: number) => void): Promise<boolean> {
    if (!surface || printRange) return false;
    printRange = range;
    enhancedForPrint = new Set();
    printMode = true;
    range = { start: 0, end: model.blocks.length, top: 0, bottom: 0 };
    await tick();
    const enhancedBlocks = model.blocks.filter((block) => block.enhancement !== 'none');
    const total = Math.max(1, enhancedBlocks.length);
    const started = performance.now();
    while (enhancedForPrint.size < enhancedBlocks.length && performance.now() - started < 10_000) {
      if (signal.aborted) return false;
      onProgress(Math.min(90, Math.round((enhancedForPrint.size / total) * 90)));
      await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
    }
    if (signal.aborted) return false;
    const images = Array.from(surface.querySelectorAll<HTMLImageElement>('img'));
    await Promise.all(images.map(async (image) => {
      if (image.complete) return;
      await Promise.race([
        image.decode().catch(() => undefined),
        new Promise<void>((resolve) => window.setTimeout(resolve, 2_000))
      ]);
    }));
    if (signal.aborted) return false;
    onProgress(100);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    return true;
  }

  export function restoreAfterPrint() {
    if (!printRange) return;
    printMode = false;
    range = printRange;
    printRange = null;
    updateRange();
  }

  async function resolveVisibleImages() {
    await tick();
    if (!surface) {
      return;
    }

    const images = Array.from(surface.querySelectorAll<HTMLImageElement>('img'));
    await Promise.all(
      images.map(async (image) => {
        const raw = image.getAttribute('src');
        if (!raw || !shouldResolveAsset(raw) || image.dataset.assetResolved === 'true') {
          return;
        }
        try {
          const fixture = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('fixture') : null;
          if (fixture) {
            const fixtureDirectory = fixture.includes('/') ? fixture.slice(0, fixture.lastIndexOf('/') + 1) : '';
            image.src = `/__maakdown_fixture/${encodeURI(`${fixtureDirectory}${raw}`)}`;
            image.dataset.assetResolved = 'true';
            image.loading = 'lazy';
            return;
          }
          const asset = await resolveAsset(documentPath, raw);
          image.src = asset.url;
          image.dataset.assetResolved = 'true';
          image.loading = 'lazy';
        } catch (error) {
          image.dataset.assetError = error instanceof Error ? error.message : String(error);
          image.alt = image.alt || 'Blocked local image';
        }
      })
    );
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'a') {
      handleClick(event as unknown as MouseEvent);
    }
  }

  function resolvedTheme(theme: 'system' | 'light' | 'dark'): string {
    if (theme !== 'system') {
      return theme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateRange() {
    if (!surface) {
      return;
    }
    range = virtualizer.range(surface.scrollTop, surface.clientHeight);
  }

  function handleMeasure(blockId: string, height: number) {
    const index = model.blocks.findIndex((block) => block.id === blockId);
    if (index < 0) {
      return;
    }
    virtualizer.measure(index, height);
    cancelAnimationFrame(measurementFrame);
    measurementFrame = requestAnimationFrame(updateRange);
  }

  async function copyValue(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      announcement = label;
    } catch {
      announcement = 'Copy failed';
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions - document surface delegates sanitized internal anchor clicks from rendered Markdown -->
<div
  class="document-scroll"
  bind:this={surface}
  role="document"
  tabindex="0"
  aria-label="Markdown document"
  onclick={handleClick}
  onkeydown={handleKeydown}
  onscroll={handleScroll}
>
  <div class="virtual-spacer" style={`height: ${range.top}px`} aria-hidden="true"></div>
  {#each model.blocks.slice(range.start, range.end) as block (block.id)}
    <BlockView
      {block}
      onMeasure={handleMeasure}
      {searchQuery}
      caseSensitive={searchCaseSensitive}
      currentSearchBlockId={searchBlockId}
      onCopy={copyValue}
      onInspectDiagram={(title, html) => (diagram = { title, html })}
      forceEnhance={printMode}
      onEnhanced={(blockId) => enhancedForPrint.add(blockId)}
    />
  {/each}
  <div class="virtual-spacer" style={`height: ${range.bottom}px`} aria-hidden="true"></div>
</div>
<p class="sr-only" aria-live="polite">{announcement}</p>
<DiagramDialog open={diagram !== null} html={diagram?.html ?? ''} title={diagram?.title ?? 'Diagram'} onClose={() => (diagram = null)} />
