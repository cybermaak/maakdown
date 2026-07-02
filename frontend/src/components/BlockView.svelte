<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Block } from '../core/model/types';
  import { enhancementManager } from '../core/enhancement/enhancementManager';
  import { stabilizeMountedMermaid } from '../core/mermaid/mermaidManager';
  import { appConfig } from '../stores/configStore';
  import { Code2, Copy, Image, Maximize2 } from '@lucide/svelte';
  import { CodeBlockChrome, IconButton } from '../design-system';
  import TableBlock from './TableBlock.svelte';
  import type { TableInteractionState } from '../core/tables/tableProjection';

  interface Props {
    block: Block;
    onMeasure?: (blockId: string, height: number) => void;
    searchQuery?: string;
    caseSensitive?: boolean;
    currentSearchBlockId?: string | null;
    onCopy?: (label: string, value: string) => void;
    onInspectDiagram?: (title: string, html: string) => void;
    forceEnhance?: boolean;
    onEnhanced?: (blockId: string) => void;
    showDocumentLineNumbers?: boolean;
    documentLineDigits?: number;
    tableState?: TableInteractionState;
    onTableStateChange?: (blockId: string, state: TableInteractionState | null) => void;
    printMode?: boolean;
  }

  let { block, onMeasure, searchQuery = '', caseSensitive = false, currentSearchBlockId = null, onCopy, onInspectDiagram, forceEnhance = false, onEnhanced, showDocumentLineNumbers = false, documentLineDigits = 1, tableState, onTableStateChange, printMode = false }: Props = $props();
  let element = $state<HTMLElement | undefined>();
  let html = $state('');
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let enhancementRun = 0;
  let enhancedKey = '';
  let codeWrapOverride = $state<boolean | null>(null);
  let mermaidSourceVisible = $state(false);
  let codeWrapped = $derived(codeWrapOverride ?? $appConfig.codeWrap);
  let sourceLabel = $derived(block.sourceStart ? String(block.sourceStart) : '');
  let codeLineNumbers = $derived(block.kind === 'code' && $appConfig.codeLineNumbers);
  let renderedMermaidVisible = $derived(printMode || !mermaidSourceVisible);

  $effect(() => {
    block;
    $appConfig.highlighterEngine;
    $appConfig.theme;
    const nextKey = `${block.id}:${$appConfig.highlighterEngine}:${$appConfig.theme}`;
    if (enhancedKey !== nextKey) {
      html = block.html;
      enhancedKey = '';
    }
    codeWrapOverride = null;
    mermaidSourceVisible = false;
    observer?.disconnect();
    if (!element || block.enhancement === 'none') {
      observeSize();
      return;
    }
    if (forceEnhance) {
      void enhance();
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
    codeLineNumbers;
    codeWrapped;
    mermaidSourceVisible;
    queueMicrotask(() => {
      markSearchResults();
      applyCodeDisplay();
      if (element && block.kind === 'mermaid' && renderedMermaidVisible) {
        void stabilizeMountedMermaid(element);
      }
    });
  });

  async function enhance() {
    const run = ++enhancementRun;
    const next = await enhancementManager.enhance(block);
    if (run === enhancementRun) {
      html = next;
      enhancedKey = `${block.id}:${$appConfig.highlighterEngine}:${$appConfig.theme}`;
      onEnhanced?.(block.id);
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
    element.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((checkbox) => {
      if (!checkbox.hasAttribute('aria-label')) {
        checkbox.setAttribute('aria-label', checkbox.checked ? 'Completed task' : 'Incomplete task');
      }
    });
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

  function applyCodeDisplay() {
    if (!element || block.kind !== 'code') return;
    const pre = element.querySelector('pre');
    if (!pre) return;
    const lineCount = Math.max(1, (block.text ?? '').split(/\r\n|\r|\n/).length);
    const digits = String(lineCount).length;
    pre.classList.toggle('code-line-numbers', codeLineNumbers);
    pre.classList.toggle('code-wrap', codeWrapped);
    pre.classList.toggle('code-nowrap', !codeWrapped);
    if (codeLineNumbers) {
      pre.dataset.lines = Array.from({ length: lineCount }, (_, index) => String(index + 1)).join('\n');
      pre.style.setProperty('--code-line-digits', String(digits));
    } else {
      pre.removeAttribute('data-lines');
      pre.style.removeProperty('--code-line-digits');
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
  class:with-source-line={showDocumentLineNumbers && Boolean(sourceLabel)}
  class:table-measure={block.kind === 'table' && $appConfig.tableConstrainToMeasure}
  data-block-id={block.id}
  data-enhancement={block.enhancement}
  data-source-start={block.sourceStart ?? undefined}
  data-source-end={block.sourceEnd ?? undefined}
  style={showDocumentLineNumbers ? `--source-line-digits: ${documentLineDigits}` : undefined}
>
  {#if showDocumentLineNumbers && sourceLabel}
    <span class="source-line" aria-hidden="true" title={`Source line ${sourceLabel}`}>{sourceLabel}</span>
  {/if}
  {#if block.kind === 'code'}
    <CodeBlockChrome
      language={block.language}
      oncopy={() => onCopy?.('Code copied', block.text ?? '')}
      wrappable
      wrapped={codeWrapped}
      onwrap={() => (codeWrapOverride = !codeWrapped)}
    >
      {@html html}
    </CodeBlockChrome>
  {:else if block.kind === 'heading'}
    <div class="heading-tools">
      <IconButton icon={Copy} label="Copy heading link" size="sm" onclick={() => {
        const anchor = element?.querySelector('a')?.getAttribute('href') ?? '';
        onCopy?.('Heading link copied', `${window.location.href.split('#')[0]}${anchor}`);
      }} />
    </div>
    {@html html}
  {:else if block.kind === 'mermaid'}
    <div class="block-tools diagram">
      <span>{renderedMermaidVisible ? 'Diagram' : 'Mermaid source'}</span>
      <span class="block-tool-actions">
        {#if !printMode}
          <IconButton
            icon={renderedMermaidVisible ? Code2 : Image}
            label={renderedMermaidVisible ? 'Show Mermaid source' : 'Show diagram'}
            size="sm"
            active={!renderedMermaidVisible}
            onclick={() => (mermaidSourceVisible = !mermaidSourceVisible)}
          />
          <IconButton icon={Copy} label="Copy Mermaid source" size="sm" onclick={() => onCopy?.('Mermaid source copied', block.text ?? '')} />
        {/if}
        <IconButton icon={Maximize2} label="Inspect diagram" size="sm" onclick={() => onInspectDiagram?.('Mermaid diagram', html)} />
      </span>
    </div>
    {#if renderedMermaidVisible}
      {@html html}
    {:else}
      <pre class="mermaid-source"><code>{block.text ?? ''}</code></pre>
    {/if}
  {:else if block.kind === 'table'}
    <TableBlock
      {block}
      constrained={$appConfig.tableConstrainToMeasure}
      columnSizing={$appConfig.tableColumnSizing}
      state={tableState}
      onStateChange={onTableStateChange}
      {printMode}
    />
  {:else}
    {@html html}
  {/if}
</div>
