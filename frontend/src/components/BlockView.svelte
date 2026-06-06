<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Block } from '../core/model/types';
  import { enhancementManager } from '../core/enhancement/enhancementManager';
  import { appConfig } from '../stores/configStore';

  interface Props {
    block: Block;
    onMeasure?: (blockId: string, height: number) => void;
  }

  let { block, onMeasure }: Props = $props();
  let element = $state<HTMLElement | undefined>();
  let html = $state('');
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let enhancementRun = 0;

  $effect(() => {
    block;
    $appConfig.highlighterEngine;
    $appConfig.theme;
    html = block.html;
    observer?.disconnect();
    if (!element || block.enhancement === 'none') {
      observeSize();
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer?.disconnect();
          void enhance();
        }
      },
      { rootMargin: '600px 0px' }
    );
    observer.observe(element);
    observeSize();
  });

  async function enhance() {
    const run = ++enhancementRun;
    const next = await enhancementManager.enhance(block);
    if (run === enhancementRun) {
      html = next;
    }
  }

  function observeSize() {
    resizeObserver?.disconnect();
    if (!element || !onMeasure) {
      return;
    }
    resizeObserver = new ResizeObserver((entries) => {
      const height = entries[0]?.borderBoxSize?.[0]?.blockSize ?? element?.getBoundingClientRect().height ?? 0;
      if (height > 0) {
        onMeasure(block.id, height);
      }
    });
    resizeObserver.observe(element);
  }

  onDestroy(() => {
    observer?.disconnect();
    resizeObserver?.disconnect();
  });
</script>

<div
  bind:this={element}
  id={block.id}
  class={`doc-block doc-block-${block.kind}`}
  data-block-id={block.id}
  data-enhancement={block.enhancement}
>
  {@html html}
</div>
