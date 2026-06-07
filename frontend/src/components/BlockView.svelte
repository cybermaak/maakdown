<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Block } from '../core/model/types';
  import { enhancementManager } from '../core/enhancement/enhancementManager';
  import { appConfig } from '../stores/configStore';
  import { Copy, Maximize2 } from '@lucide/svelte';
  import { IconButton } from '../design-system';

  interface Props {
    block: Block;
    onMeasure?: (blockId: string, height: number) => void;
    searchQuery?: string;
    caseSensitive?: boolean;
    currentSearchBlockId?: string | null;
    onCopy?: (label: string, value: string) => void;
    onInspectDiagram?: (title: string, html: string) => void;
  }

  let { block, onMeasure, searchQuery = '', caseSensitive = false, currentSearchBlockId = null, onCopy, onInspectDiagram }: Props = $props();
  let element = $state<HTMLElement | undefined>();
  let html = $state('');
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let enhancementRun = 0;
  let enhancedKey = '';

  $effect(() => {
    block;
    $appConfig.highlighterEngine;
    $appConfig.theme;
    const nextKey = `${block.id}:${$appConfig.highlighterEngine}:${$appConfig.theme}`;
    if (enhancedKey !== nextKey) {
      html = block.html;
      enhancedKey = '';
    }
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

  $effect(() => {
    html;
    searchQuery;
    caseSensitive;
    currentSearchBlockId;
    queueMicrotask(markSearchResults);
  });

  async function enhance() {
    const run = ++enhancementRun;
    const next = await enhancementManager.enhance(block);
    if (run === enhancementRun) {
      html = next;
      enhancedKey = `${block.id}:${$appConfig.highlighterEngine}:${$appConfig.theme}`;
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

  function markSearchResults() {
    if (!element) return;
    element.querySelectorAll('mark.search-mark').forEach((mark) => mark.replaceWith(document.createTextNode(mark.textContent ?? '')));
    if (!searchQuery) return;
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const expression = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.parentElement?.closest('script, style, mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes: Text[] = [];
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    for (const node of nodes) {
      const value = node.data;
      const matches = Array.from(value.matchAll(expression));
      if (!matches.length) continue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      matches.forEach((match, index) => {
        const start = match.index ?? 0;
        fragment.append(value.slice(cursor, start));
        const mark = document.createElement('mark');
        mark.className = `search-mark${currentSearchBlockId === block.id && index === 0 ? ' current' : ''}`;
        mark.textContent = match[0];
        fragment.append(mark);
        cursor = start + match[0].length;
      });
      fragment.append(value.slice(cursor));
      node.replaceWith(fragment);
    }
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
  {#if block.kind === 'code'}
    <div class="block-tools">
      <span>{block.language ?? 'text'}</span>
      <IconButton icon={Copy} label="Copy code" size="sm" onclick={() => onCopy?.('Code copied', block.text ?? '')} />
    </div>
  {:else if block.kind === 'heading'}
    <div class="heading-tools">
      <IconButton icon={Copy} label="Copy heading link" size="sm" onclick={() => {
        const anchor = element?.querySelector('a')?.getAttribute('href') ?? '';
        onCopy?.('Heading link copied', `${window.location.href.split('#')[0]}${anchor}`);
      }} />
    </div>
  {:else if block.kind === 'mermaid'}
    <div class="block-tools diagram">
      <span>Diagram</span>
      <IconButton icon={Maximize2} label="Inspect diagram" size="sm" onclick={() => onInspectDiagram?.('Mermaid diagram', html)} />
    </div>
  {/if}
  {@html html}
</div>
