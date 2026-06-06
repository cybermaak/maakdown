<script lang="ts">
  import { tick } from 'svelte';
  import type { DocumentModel } from '../core/model/types';
  import { anchorIdFromHref, getActiveHeading, isInternalHref, resolveAnchor } from '../core/navigation/navigation';
  import { shouldResolveAsset } from '../core/assets/assets';
  import { openExternal, resolveAsset } from '../ipc';
  import { uiStore } from '../stores/uiStore';

  interface Props {
    model: DocumentModel;
    documentPath: string;
  }

  let { model, documentPath }: Props = $props();
  let surface: HTMLElement | undefined;

  $effect(() => {
    model;
    documentPath;
    void resolveVisibleImages();
  });

  function navigateTo(anchorId: string) {
    const target = resolveAnchor(model, anchorId);
    if (!target) {
      return;
    }

    document.getElementById(target.blockId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    uiStore.update((state) => ({ ...state, activeHeadingId: anchorId }));
  }

  function handleClick(event: MouseEvent) {
    const link = (event.target as HTMLElement).closest('a');
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
    navigateTo(anchorIdFromHref(href));
  }

  function handleScroll(event: Event) {
    const container = event.currentTarget as HTMLElement;
    const blocks = Array.from(container.querySelectorAll<HTMLElement>('[data-block-id]'));
    const visible = blocks.find((block) => block.offsetTop + block.offsetHeight >= container.scrollTop);
    const activeHeadingId = getActiveHeading(model, {
      startBlockId: visible?.dataset.blockId ?? null,
      endBlockId: visible?.dataset.blockId ?? null
    });
    uiStore.update((state) => ({ ...state, activeHeadingId }));
  }

  export function scrollToAnchor(anchorId: string) {
    navigateTo(anchorId);
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
  {#each model.blocks as block}
    <div id={block.id} class={`doc-block doc-block-${block.kind}`} data-block-id={block.id}>
      {@html block.html}
    </div>
  {/each}
</div>
