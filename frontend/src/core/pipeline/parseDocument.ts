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
import type { DocumentModel, Block, BlockKind, EnhancementKind, Heading, VaultIndexSnapshot } from '../model/types';
import { sanitizeSchema } from '../sanitize/schema';

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

type SourcePosition = { start?: number; end?: number; lines?: number[]; lineGroups?: number[][] };

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
  const blocks = buildBlocks(root, data);

  return {
    blocks,
    headings: data.headings,
    anchors: data.anchors,
    footnotes: data.footnotes,
    frontmatter: frontmatter.data,
    languages: Array.from(data.languages).sort(),
    unresolvedWikilinks: Array.from(data.unresolvedWikilinks).sort(),
    sourceLineCount: countLines(request.source),
    sourcePositionsEnabled: data.collectSourcePositions
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
      annotateTopLevelSourceLines(tree, data.sourceLineOffset);
      annotateListItemSourceLines(tree, data.sourceLineOffset);
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

function buildBlocks(root: Root, data: ProcessorData): Block[] {
  const blocks: Block[] = [];
  let headingIndex = 0;
  let sourceIndex = 0;

  for (const child of root.children) {
    if (isWhitespaceText(child)) {
      continue;
    }

    if (!isElement(child)) {
      const id = `block-${blocks.length + 1}`;
      const source = data.sourcePositions[sourceIndex++];
      blocks.push({
        id,
        kind: 'other',
        html: toHtml(child),
        enhancement: 'none',
        text: textContent(child),
        sourceStart: source?.start,
        sourceEnd: source?.end,
        sourceLines: source?.lines,
        sourceLineGroups: source?.lineGroups
      });
      continue;
    }

    const indexedSource = data.sourcePositions[sourceIndex++];
    const source = sourcePositionForElement(child) ?? indexedSource;
    const headingLevel = headingDepth(child);
    const id = `block-${blocks.length + 1}`;
    const kind = blockKind(child);
    const enhancement = enhancementFor(child);
    const language = kind === 'code' || kind === 'mermaid' ? codeLanguage(child) ?? undefined : undefined;
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
      sourceLineGroups: source?.lineGroups
    });
  }

  return blocks;
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
  data?: { hProperties?: Record<string, unknown> };
}

function annotateTopLevelSourceLines(tree: Nodes, offset: number): void {
  if (!('children' in tree) || !Array.isArray(tree.children)) {
    return;
  }
  for (const child of tree.children as SourcePositionedNode[]) {
    annotateNodeSourceLines(child, offset);
  }
}

function annotateNodeSourceLines(node: SourcePositionedNode, offset: number): void {
  const start = addLineOffset(node.position?.start.line, offset);
  if (typeof start !== 'number') {
    return;
  }
  const end = addLineOffset(node.position?.end.line, offset) ?? start;
  const lines = sourceLinesForRange(node.position?.start.line, node.position?.end.line, offset);
  node.data = node.data ?? {};
  node.data.hProperties = {
    ...(node.data.hProperties ?? {}),
    dataSourceStart: String(start),
    dataSourceEnd: String(end),
    dataSourceLines: lines.join(',')
  };
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

function annotateListItemSourceLines(tree: Nodes, offset: number): void {
  visit(tree, 'listItem', (node: SourcePositionedNode) => {
    annotateNodeSourceLines(node, offset);
  });
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

function sourcePositionForElement(node: Element): SourcePosition | undefined {
  const start = sourceLineNumberProperty(node.properties?.dataSourceStart);
  if (typeof start !== 'number') {
    return undefined;
  }
  const end = sourceLineNumberProperty(node.properties?.dataSourceEnd) ?? start;
  const lines = sourceLineArrayProperty(node.properties?.dataSourceLines);
  return {
    start,
    end,
    lines: lines.length > 1 ? lines : undefined,
    lineGroups: sourceLineGroupsForElement(node)
  };
}

function sourceLineGroupsForElement(node: Element): number[][] | undefined {
  if (node.tagName !== 'ol' && node.tagName !== 'ul') {
    return undefined;
  }
  const groups = node.children
    .filter((child): child is Element => isElement(child) && child.tagName === 'li')
    .map((item) => sourceLineArrayProperty(item.properties?.dataSourceLines))
    .filter((lines) => lines.length > 0);
  return groups.length ? groups : undefined;
}

function sourceLineNumberProperty(value: unknown): number | undefined {
  const text = Array.isArray(value) ? value[0] : value;
  const line = typeof text === 'number' ? text : typeof text === 'string' ? Number.parseInt(text, 10) : NaN;
  return Number.isFinite(line) ? line : undefined;
}

function sourceLineArrayProperty(value: unknown): number[] {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  return raw
    .split(',')
    .map((item) => Number.parseInt(item, 10))
    .filter((line): line is number => Number.isFinite(line));
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
