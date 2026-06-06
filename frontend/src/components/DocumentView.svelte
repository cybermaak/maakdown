<script lang="ts">
  import { tick } from 'svelte';
  import BlockView from './BlockView.svelte';
  import { enhancementManager } from '../core/enhancement/enhancementManager';
  import type { DocumentModel } from '../core/model/types';
  import { anchorIdFromHref, getActiveHeading, isInternalHref, resolveAnchor } from '../core/navigation/navigation';
  import { BlockVirtualizer, type VirtualRange } from '../core/virtualizer/virtualizer';
  import { shouldResolveAsset } from '../core/assets/assets';
  import { openExternal, resolveAsset } from '../ipc';
  import { uiStore } from '../stores/uiStore';
  import { appConfig } from '../stores/configStore';

  interface Props {
    model: DocumentModel;
    documentPath: string;
    onOpenDocument?: (path: string) => void;
  }

  let { model, documentPath, onOpenDocument }: Props = $props();
  let surface = $state<HTMLElement | undefined>();
  let virtualizer = new BlockVirtualizer(0);
  let range = $state<VirtualRange>({ start: 0, end: 0, top: 0, bottom: 0 });
  let measurementFrame = 0;

  $effect(() => {
    model;
    documentPath;
    virtualizer = new BlockVirtualizer(model.blocks.length);
    range = virtualizer.range(0, surface?.clientHeight ?? 900);
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
    uiStore.update((state) => ({ ...state, activeHeadingId: anchorId }));
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
    updateRange();
    const startBlock = model.blocks[virtualizer.indexAt(surface?.scrollTop ?? 0)];
    const activeHeadingId = getActiveHeading(model, {
      startBlockId: startBlock?.id ?? null,
      endBlockId: model.blocks[Math.max(range.end - 1, range.start)]?.id ?? null
    });
    uiStore.update((state) => ({ ...state, activeHeadingId }));
  }

  export function scrollToAnchor(anchorId: string) {
    void navigateTo(anchorId);
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
    <BlockView {block} onMeasure={handleMeasure} />
  {/each}
  <div class="virtual-spacer" style={`height: ${range.bottom}px`} aria-hidden="true"></div>
</div>
