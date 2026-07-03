import { toHtml } from 'hast-util-to-html';
import GithubSlugger from 'github-slugger';
import yaml from 'js-yaml';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Element, Nodes, Root, Text } from 'hast';
import type { Plugin } from 'unified';
import type { DocumentModel, Block, BlockKind, EnhancementKind, Heading, ReaderLine, ReaderLineKind, VaultIndexSnapshot } from '../model/types';
import { sanitizeSchema } from '../sanitize/schema';
import { READER_BLOCK_ANCHOR, READER_LINE_ANCHOR_PROPERTY } from '../reader/decorations';

export interface ParseRequest {
  source: string;
  path: string;
  vaultIndexVersion?: string;
  vaultIndex?: VaultIndexSnapshot;
  collectSourcePositions?: boolean;
}

interface FrontmatterResult {
  body: string;
  data: Record<string, unknown>;
  bodyStartLine: number;
}

interface ProcessorData {
  headings: Heading[];
  anchors: DocumentModel['anchors'];
  footnotes: DocumentModel['footnotes'];
  languages: Set<string>;
  unresolvedWikilinks: Set<string>;
  sourcePositions: Array<{ start?: number; end?: number; lines?: number[]; lineGroups?: number[][] }>;
  sourceLineOffset: number;
  collectSourcePositions: boolean;
}

export async function parseDocument(request: ParseRequest): Promise<DocumentModel> {
  const frontmatter = extractFrontmatter(request.source);
  const data: ProcessorData = {
    headings: [],
    anchors: {},
    footnotes: {},
    languages: new Set(),
    unresolvedWikilinks: new Set(),
    sourcePositions: [],
    sourceLineOffset: frontmatter.bodyStartLine - 1,
    collectSourcePositions: request.collectSourcePositions !== false
  };

  const processor = buildProcessor(data, request.vaultIndex);
  const result = await processor.run(processor.parse(frontmatter.body));
  const root = result as Root;
  const { blocks, readerLineCount } = buildBlocks(root, data);

  return {
    blocks,
    headings: data.headings,
    anchors: data.anchors,
    footnotes: data.footnotes,
    frontmatter: frontmatter.data,
    languages: Array.from(data.languages).sort(),
    unresolvedWikilinks: Array.from(data.unresolvedWikilinks).sort(),
    sourceLineCount: countLines(request.source),
    sourcePositionsEnabled: data.collectSourcePositions,
    readerLineCount
  };
}

export function extractFrontmatter(source: string): FrontmatterResult {
  const normalized = source.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { body: source, data: {}, bodyStartLine: 1 };
  }

  const parsed = yaml.load(match[1]);
  return {
    body: normalized.slice(match[0].length),
    data: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {},
    bodyStartLine: match[0].split(/\r\n|\r|\n/).length
  };
}

function buildProcessor(data: ProcessorData, vaultIndex?: VaultIndexSnapshot) {
  const processor = unified();
  processor.use(remarkParse);
  processor.use(remarkGfm);
  processor.use(remarkFrontmatter, ['yaml']);
  processor.use(remarkMath);
  processor.use(remarkWikilinks(data, vaultIndex));
  processor.use(collectMarkdownMetadata(data));
  processor.use(remarkRehype, { allowDangerousHtml: true });
  processor.use(rehypeRaw as never);
  processor.use(rehypeKatex as never);
  processor.use(rehypeCallouts);
  processor.use(rehypeSlug as never);
  processor.use(rehypeAutolinkHeadings as never, { behavior: 'wrap' });
  processor.use(collectHtmlMetadata(data));
  processor.use(rehypeSanitize as never, sanitizeSchema);
  processor.use(rehypeStringify as never);
  return processor;
}

function remarkWikilinks(data: ProcessorData, vaultIndex?: VaultIndexSnapshot): Plugin<[], Nodes> {
  return () => (tree: Nodes) => {
    visit(tree, 'text', (node: { value?: string }, index, parent: { children?: unknown[] } | undefined) => {
      if (!node.value || index === undefined || !parent?.children || !node.value.includes('[[')) {
        return;
      }
      const replacements: unknown[] = [];
      let cursor = 0;
      for (const match of node.value.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?]]/g)) {
        const start = match.index ?? 0;
        if (start > cursor) {
          replacements.push({ type: 'text', value: node.value.slice(cursor, start) });
        }
        const noteName = match[1].trim();
        const label = (match[2] ?? noteName).trim();
        const path = vaultIndex?.notes[noteName.toLowerCase()];
        if (path) {
          replacements.push({
            type: 'link',
            url: '#',
            data: { hProperties: { className: ['wikilink'], dataNotePath: path } },
            children: [{ type: 'text', value: label }]
          });
        } else {
          data.unresolvedWikilinks.add(noteName);
          replacements.push({
            type: 'html',
            value: `<span class="wikilink wikilink-unresolved" data-note-name="${escapeHtmlAttribute(noteName)}">${escapeHtmlAttribute(label)}</span>`
          });
        }
        cursor = start + match[0].length;
      }
      if (cursor === 0) {
        return;
      }
      if (cursor < node.value.length) {
        replacements.push({ type: 'text', value: node.value.slice(cursor) });
      }
      parent.children.splice(index, 1, ...replacements);
      return index + replacements.length;
    });
  };
}

function collectMarkdownMetadata(data: ProcessorData): Plugin<[], Nodes> {
  return () => (tree: Nodes) => {
    if (data.collectSourcePositions && 'children' in tree && Array.isArray(tree.children)) {
      data.sourcePositions = tree.children
        .map((child) => ({
          start: addLineOffset(child.position?.start.line, data.sourceLineOffset),
          end: addLineOffset(child.position?.end.line, data.sourceLineOffset),
          lines: sourceLinesForNode(child, data.sourceLineOffset),
          lineGroups: sourceLineGroupsForNode(child, data.sourceLineOffset)
        }));
    }

    visit(tree, 'code', (node: { lang?: string; value?: string }) => {
      if (node.lang) {
        data.languages.add(node.lang.toLowerCase());
      }
    });

    visit(tree, 'text', (node: { value?: string }) => {
      for (const match of node.value?.matchAll(/\[\[([^\]]+)]]/g) ?? []) {
        data.unresolvedWikilinks.add(match[1].trim());
      }
    });
  };
}

function collectHtmlMetadata(data: ProcessorData): Plugin<[], Root> {
  return () => (tree) => {
    const slugger = new GithubSlugger();

    for (const child of tree.children) {
      if (!isElement(child)) {
        continue;
      }

      const headingLevel = headingDepth(child);
      if (headingLevel) {
        const text = textContent(child).trim();
        const id = String(child.properties?.id ?? slugger.slug(text));
        child.properties = { ...child.properties, id };
        data.headings.push({ id, blockId: '', depth: headingLevel, text });
      }
    }

    visit(tree, 'element', (node: Element) => {
      const id = typeof node.properties?.id === 'string' ? node.properties.id : undefined;
      if (!id || data.anchors[id]) {
        return;
      }
      const kind = id.startsWith('user-content-fn') ? 'footnote' : 'generic';
      data.anchors[id] = { id, blockId: findBlockIdForElement(tree, node), kind };
      if (kind === 'footnote') {
        data.footnotes[id] = data.anchors[id];
      }
    });
  };
}

function buildBlocks(root: Root, data: ProcessorData): { blocks: Block[]; readerLineCount: number } {
  const blocks: Block[] = [];
  let headingIndex = 0;
  let sourceIndex = 0;
  let readerLineCount = 0;
  const nextReaderLineNumber = () => {
    readerLineCount += 1;
    return readerLineCount;
  };

  for (const child of root.children) {
    if (isWhitespaceText(child)) {
      continue;
    }

    if (!isElement(child)) {
      const id = `block-${blocks.length + 1}`;
      const source = data.sourcePositions[sourceIndex++];
      const readerLines: ReaderLine[] = [];
      blocks.push({
        id,
        kind: 'other',
        html: toHtml(child),
        enhancement: 'none',
        text: textContent(child),
        sourceStart: source?.start,
        sourceEnd: source?.end,
        sourceLines: source?.lines,
        sourceLineGroups: source?.lineGroups,
        readerLines
      });
      continue;
    }

    const indexedSource = data.sourcePositions[sourceIndex++];
    const source = indexedSource;
    const headingLevel = headingDepth(child);
    const id = `block-${blocks.length + 1}`;
    const kind = blockKind(child);
    const enhancement = enhancementFor(child);
    const language = kind === 'code' || kind === 'mermaid' ? codeLanguage(child) ?? undefined : undefined;
    const readerLines = buildReaderLinesForBlock(child, id, kind, nextReaderLineNumber);
    const html = toHtml(child);
    const text = textContent(child).trim();

    if (headingLevel) {
      const heading = data.headings[headingIndex++];
      if (heading) {
        heading.blockId = id;
        data.anchors[heading.id] = { id: heading.id, blockId: id, kind: 'heading' };
      }
    }

    blocks.push({
      id,
      kind,
      html,
      enhancement,
      text,
      language,
      level: headingLevel ?? undefined,
      sourceStart: source?.start,
      sourceEnd: source?.end,
      sourceLines: source?.lines,
      sourceLineGroups: source?.lineGroups,
      readerLines
    });
  }

  return { blocks, readerLineCount };
}

function countLines(source: string): number {
  if (!source) return 0;
  return source.split(/\r\n|\r|\n/).length;
}

function addLineOffset(line: number | undefined, offset: number): number | undefined {
  return typeof line === 'number' ? line + offset : undefined;
}

interface SourcePositionedNode {
  type?: string;
  children?: SourcePositionedNode[];
  position?: { start: { line: number }; end: { line: number } };
}

function sourceLinesForNode(node: unknown, offset: number): number[] | undefined {
  const groups = sourceLineGroupsForNode(node, offset);
  const lines = groups?.flat() ?? [];
  return lines.length > 1 ? lines : undefined;
}

function sourceLineGroupsForNode(node: unknown, offset: number): number[][] | undefined {
  const candidate = node as SourcePositionedNode;
  if (candidate.type !== 'list' || !Array.isArray(candidate.children)) {
    return undefined;
  }
  const groups: number[][] = [];
  for (const item of candidate.children) {
    const lines = sourceLinesForRange(item.position?.start.line, item.position?.end.line, offset);
    if (!lines.length) continue;
    groups.push(lines);
  }
  return groups.length ? groups : undefined;
}

function sourceLinesForRange(startLine: number | undefined, endLine: number | undefined, offset: number): number[] {
  const start = addLineOffset(startLine, offset);
  const end = addLineOffset(endLine, offset);
  if (typeof start !== 'number') {
    return [];
  }
  const finalLine = typeof end === 'number' && end >= start ? end : start;
  const lines: number[] = [];
  for (let line = start; line <= finalLine; line += 1) {
    lines.push(line);
  }
  return lines;
}

function buildReaderLinesForBlock(node: Element, blockId: string, kind: BlockKind, nextLineNumber: () => number): ReaderLine[] {
  const lines: ReaderLine[] = [];
  const nextAnchorId = () => `${blockId}-reader-line-${lines.length + 1}`;
  const emit = (anchorId: string, lineKind: ReaderLineKind) => {
    lines.push({ lineNumber: nextLineNumber(), anchorId, kind: lineKind });
  };
  const markElement = (element: Element, anchorId: string) => {
    element.properties = { ...element.properties, [READER_LINE_ANCHOR_PROPERTY]: anchorId };
  };
  const emitElementLine = (element: Element, lineKind: ReaderLineKind = 'block') => {
    const anchorId = nextAnchorId();
    markElement(element, anchorId);
    emit(anchorId, lineKind);
  };
  const emitBlockLine = () => emit(READER_BLOCK_ANCHOR, 'block');
  const emitHardBreakLine = (parent: Element, insertAfter: number) => {
    const anchorId = nextAnchorId();
    const marker: Element = {
      type: 'element',
      tagName: 'span',
      properties: {
        [READER_LINE_ANCHOR_PROPERTY]: anchorId,
        ariaHidden: 'true',
        className: ['reader-line-anchor']
      },
      children: []
    };
    parent.children.splice(insertAfter + 1, 0, marker);
    emit(anchorId, 'hard-break-segment');
  };
  const collectHardBreakSegments = (element: Element, skipBlockDescendants = false) => {
    for (let index = 0; index < element.children.length; index += 1) {
      const child = element.children[index];
      if (!isElement(child)) {
        continue;
      }
      if (child.tagName === 'br') {
        emitHardBreakLine(element, index);
        index += 1;
        continue;
      }
      if (skipBlockDescendants && isReaderBlockBoundary(child)) {
        continue;
      }
      collectHardBreakSegments(child, skipBlockDescendants);
    }
  };
  const processTextContainer = (element: Element, lineKind: ReaderLineKind = 'block') => {
    if (!hasVisibleContent(element)) {
      return;
    }
    emitElementLine(element, lineKind);
    collectHardBreakSegments(element);
  };
  const processList = (list: Element) => {
    for (const item of list.children) {
      if (!isElement(item) || item.tagName !== 'li' || !hasVisibleContent(item)) {
        continue;
      }
      emitElementLine(item, 'list-item');
      collectHardBreakSegments(item, true);
      let consumedFirstParagraph = false;
      for (const child of item.children) {
        if (!isElement(child)) {
          continue;
        }
        if (child.tagName === 'p' && !consumedFirstParagraph) {
          consumedFirstParagraph = true;
          collectHardBreakSegments(child);
          continue;
        }
        if (child.tagName === 'ul' || child.tagName === 'ol') {
          processList(child);
        } else if (child.tagName === 'p') {
          processTextContainer(child);
        } else if (isFramedReaderObject(child)) {
          emitElementLine(child);
        } else if (child.tagName === 'blockquote') {
          processBlockquote(child);
        } else if (isReaderBlockBoundary(child) && hasVisibleContent(child)) {
          processTextContainer(child);
        }
      }
    }
  };
  const processBlockquote = (quote: Element) => {
    if (!hasVisibleContent(quote)) {
      return;
    }
    for (const child of quote.children) {
      if (!isElement(child)) {
        continue;
      }
      if (child.tagName === 'ul' || child.tagName === 'ol') {
        processList(child);
      } else if (isFramedReaderObject(child)) {
        emitElementLine(child);
      } else if (child.tagName === 'blockquote') {
        processBlockquote(child);
      } else if (hasClass(child, 'callout-title')) {
        processTextContainer(child, 'callout-title');
      } else if (hasVisibleContent(child)) {
        processTextContainer(child);
      }
    }
  };
  const processContainer = (element: Element) => {
    let emitted = false;
    for (const child of element.children) {
      if (!isElement(child)) {
        continue;
      }
      const before = lines.length;
      if (child.tagName === 'ul' || child.tagName === 'ol') {
        processList(child);
      } else if (isFramedReaderObject(child)) {
        emitElementLine(child);
      } else if (child.tagName === 'blockquote') {
        processBlockquote(child);
      } else if (hasVisibleContent(child)) {
        processTextContainer(child);
      }
      emitted = emitted || lines.length > before;
    }
    if (!emitted && hasVisibleContent(element)) {
      processTextContainer(element);
    }
  };

  if (!hasVisibleContent(node)) {
    return lines;
  }
  if (kind === 'code' || kind === 'mermaid' || kind === 'table' || kind === 'math') {
    emitBlockLine();
  } else if (node.tagName === 'ul' || node.tagName === 'ol') {
    processList(node);
  } else if (node.tagName === 'blockquote') {
    processBlockquote(node);
  } else if (node.tagName === 'div' || node.tagName === 'section') {
    processContainer(node);
  } else {
    processTextContainer(node);
  }
  return lines;
}

function isFramedReaderObject(node: Element): boolean {
  return node.tagName === 'pre'
    || node.tagName === 'table'
    || node.tagName === 'img'
    || hasClass(node, 'katex-display')
    || codeLanguage(node) === 'mermaid';
}

function isReaderBlockBoundary(node: Element): boolean {
  return ['blockquote', 'div', 'dl', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ol', 'p', 'pre', 'section', 'table', 'ul'].includes(node.tagName)
    || hasClass(node, 'katex-display');
}

function hasVisibleContent(node: Element): boolean {
  if (node.properties?.hidden === true || node.properties?.ariaHidden === 'true') {
    return false;
  }
  if (['br', 'script', 'style'].includes(node.tagName)) {
    return false;
  }
  if (textContent(node).trim().length > 0) {
    return true;
  }
  return Boolean(findElement(node, (child) => ['img', 'input', 'svg', 'table', 'pre'].includes(child.tagName)));
}

function findElement(node: Element, predicate: (node: Element) => boolean): Element | null {
  for (const child of node.children) {
    if (!isElement(child)) {
      continue;
    }
    if (predicate(child)) {
      return child;
    }
    const found = findElement(child, predicate);
    if (found) {
      return found;
    }
  }
  return null;
}

function rehypeCallouts(): (tree: Root) => void {
  return (tree) => {
    visit(tree, 'element', (node: Element) => {
      if (node.tagName !== 'blockquote') {
        return;
      }
      const firstParagraph = node.children.find(isElement);
      if (!firstParagraph || firstParagraph.tagName !== 'p') {
        return;
      }
      const firstText = textContent(firstParagraph);
      const match = firstText.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)]\s*/i);
      if (!match) {
        return;
      }
      const type = match[1].toLowerCase();
      node.properties = {
        ...node.properties,
        className: ['callout', `callout-${type}`]
      };
      firstParagraph.properties = {
        ...firstParagraph.properties,
        className: ['callout-title']
      };
      replaceFirstText(firstParagraph, firstText.replace(match[0], `${type.toUpperCase()}: `));
    });
  };
}

function blockKind(node: Element): BlockKind {
  const level = headingDepth(node);
  if (level) return 'heading';
  if (node.tagName === 'pre') return codeLanguage(node) === 'mermaid' ? 'mermaid' : 'code';
  if (node.tagName === 'table') return 'table';
  if (node.tagName === 'blockquote' && hasClass(node, 'callout')) return 'callout';
  if (hasClass(node, 'katex-display')) return 'math';
  if (node.tagName === 'p') return 'paragraph';
  if (node.tagName === 'div' || node.tagName === 'section') return 'html';
  return 'other';
}

function enhancementFor(node: Element): EnhancementKind {
  if (node.tagName !== 'pre') {
    return 'none';
  }
  return codeLanguage(node) === 'mermaid' ? 'mermaid' : 'code';
}

function codeLanguage(node: Element): string | null {
  let language: string | null = null;
  visit(node, 'element', (child: Element) => {
    if (language || child.tagName !== 'code') {
      return;
    }
    const className = normalizeClassName(child.properties?.className);
    const languageClass = className.find((name) => name.startsWith('language-'));
    if (languageClass) {
      language = languageClass.slice('language-'.length).toLowerCase();
    }
  });
  return language;
}

function headingDepth(node: Element): number | null {
  const match = node.tagName.match(/^h([1-6])$/);
  return match ? Number(match[1]) : null;
}

function findBlockIdForElement(root: Root, target: Element): string {
  let blockIndex = 0;
  for (const child of root.children) {
    if (isWhitespaceText(child)) {
      continue;
    }
    blockIndex += 1;
    if (child === target || (isElement(child) && containsElement(child, target))) {
      return `block-${blockIndex}`;
    }
  }
  return 'block-1';
}

function containsElement(parent: Element, target: Element): boolean {
  if (parent === target) {
    return true;
  }
  return parent.children.some((child) => isElement(child) && containsElement(child, target));
}

function replaceFirstText(node: Element, nextValue: string): void {
  for (const child of node.children) {
    if (child.type === 'text') {
      (child as Text).value = nextValue;
      return;
    }
    if (isElement(child)) {
      replaceFirstText(child, nextValue);
      return;
    }
  }
}

function textContent(node: Nodes): string {
  if (node.type === 'text') {
    return node.value;
  }
  if ('children' in node) {
    return node.children.map((child) => textContent(child as Nodes)).join('');
  }
  return '';
}

function isElement(node: unknown): node is Element {
  return Boolean(node && typeof node === 'object' && (node as Element).type === 'element');
}

function isWhitespaceText(node: Nodes): boolean {
  return node.type === 'text' && node.value.trim().length === 0;
}

function hasClass(node: Element, className: string): boolean {
  return normalizeClassName(node.properties?.className).includes(className);
}

function normalizeClassName(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String);
  }
  if (typeof value === 'string') {
    return value.split(/\s+/);
  }
  return [];
}

function escapeHtmlAttribute(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
