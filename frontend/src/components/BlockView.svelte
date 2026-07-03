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
  import { READER_BLOCK_ANCHOR, READER_LINE_ANCHOR_ATTRIBUTE, READER_LINE_LABEL_CLASS } from '../core/reader/decorations';

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
  let mermaidSourceRun = 0;
  let enhancedKey = '';
  let codeWrapOverride = $state<boolean | null>(null);
  let mermaidSourceVisible = $state(false);
  let mermaidSourceHtml = $state('');
  let codeWrapped = $derived(codeWrapOverride ?? $appConfig.codeWrap);
  let hasDocumentSourceLabel = $derived(Boolean(block.readerLines?.length));
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
    mermaidSourceHtml = '';
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
    mermaidSourceHtml;
    showDocumentLineNumbers;
    block.readerLines;
    queueMicrotask(() => {
      markSearchResults();
      applyCodeDisplay();
      applyReaderLineLabels();
      if (element && block.kind === 'mermaid' && renderedMermaidVisible) {
        void stabilizeMountedMermaid(element);
      }
    });
  });

  $effect(() => {
    if (block.kind !== 'mermaid' || !mermaidSourceVisible) return;
    void enhanceMermaidSource();
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

  async function enhanceMermaidSource() {
    const run = ++mermaidSourceRun;
    const highlighted = await enhancementManager.highlightSource(`${block.id}:source`, block.text ?? '', 'mermaid');
    if (run === mermaidSourceRun) {
      mermaidSourceHtml = addPreClass(highlighted, 'mermaid-source');
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

  function applyReaderLineLabels() {
    if (!element) return;
    const host = element;
    host.querySelectorAll(`.${READER_LINE_LABEL_CLASS}`).forEach((label) => label.remove());
    if (!showDocumentLineNumbers || !block.readerLines?.length) return;
    const blockRect = host.getBoundingClientRect();
    block.readerLines.forEach((line) => {
      const anchor = readerLineAnchor(line.anchorId);
      if (!anchor) return;
      const anchorRect = anchor.getBoundingClientRect();
      const anchorStyle = getComputedStyle(anchor);
      const fontSize = Number.parseFloat(anchorStyle.fontSize || '0') || 0;
      const label = document.createElement('span');
      label.className = READER_LINE_LABEL_CLASS;
      label.setAttribute('aria-hidden', 'true');
      label.title = `Line ${line.lineNumber}`;
      label.textContent = String(line.lineNumber);
      label.style.top = `${Math.max(0, anchorRect.top - blockRect.top + fontSize * 0.2)}px`;
      host.append(label);
    });
  }

  function readerLineAnchor(anchorId: string): HTMLElement | null {
    if (!element) return null;
    if (anchorId === READER_BLOCK_ANCHOR) return element;
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(anchorId) : anchorId.replace(/"/g, '\\"');
    return element.querySelector<HTMLElement>(`[${READER_LINE_ANCHOR_ATTRIBUTE}="${escaped}"]`);
  }

  function addPreClass(source: string, className: string): string {
    const preTag = source.match(/<pre\b[^>]*>/)?.[0] ?? '';
    if (preTag.includes('class="')) {
      return source.replace(/<pre([^>]*?)class="/, `<pre$1class="${className} `);
    }
    return source.replace('<pre', `<pre class="${className}"`);
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
  class:with-reader-line={showDocumentLineNumbers && hasDocumentSourceLabel}
  class:table-measure={block.kind === 'table' && $appConfig.tableConstrainToMeasure}
  data-block-id={block.id}
  data-enhancement={block.enhancement}
  style={showDocumentLineNumbers ? `--reader-line-digits: ${documentLineDigits}` : undefined}
>
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
    {:else if mermaidSourceHtml}
      {@html mermaidSourceHtml}
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
      showRowNumbers={$appConfig.tableRowNumbers}
      {printMode}
    />
  {:else}
    {@html html}
  {/if}
</div>
