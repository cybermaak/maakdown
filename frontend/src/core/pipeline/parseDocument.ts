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
import type { DocumentModel, Block, BlockKind, EnhancementKind, Heading } from '../model/types';
import { sanitizeSchema } from '../sanitize/schema';

export interface ParseRequest {
  source: string;
  path: string;
  vaultIndexVersion?: string;
}

interface FrontmatterResult {
  body: string;
  data: Record<string, unknown>;
}

interface ProcessorData {
  headings: Heading[];
  anchors: DocumentModel['anchors'];
  footnotes: DocumentModel['footnotes'];
  languages: Set<string>;
  unresolvedWikilinks: Set<string>;
}

export async function parseDocument(request: ParseRequest): Promise<DocumentModel> {
  const frontmatter = extractFrontmatter(request.source);
  const data: ProcessorData = {
    headings: [],
    anchors: {},
    footnotes: {},
    languages: new Set(),
    unresolvedWikilinks: new Set()
  };

  const processor = buildProcessor(data);
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
    unresolvedWikilinks: Array.from(data.unresolvedWikilinks).sort()
  };
}

export function extractFrontmatter(source: string): FrontmatterResult {
  const normalized = source.replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return { body: source, data: {} };
  }

  const parsed = yaml.load(match[1]);
  return {
    body: normalized.slice(match[0].length),
    data: parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {}
  };
}

function buildProcessor(data: ProcessorData) {
  const processor = unified();
  processor.use(remarkParse);
  processor.use(remarkGfm);
  processor.use(remarkFrontmatter, ['yaml']);
  processor.use(remarkMath);
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

function collectMarkdownMetadata(data: ProcessorData): Plugin<[], Nodes> {
  return () => (tree: Nodes) => {
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
        const blockId = `block-${data.headings.length + 1}`;
        data.headings.push({ id, blockId, depth: headingLevel, text });
        data.anchors[id] = { id, blockId, kind: 'heading' };
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

  for (const child of root.children) {
    if (isWhitespaceText(child)) {
      continue;
    }

    if (!isElement(child)) {
      const id = `block-${blocks.length + 1}`;
      blocks.push({
        id,
        kind: 'other',
        html: toHtml(child),
        enhancement: 'none',
        text: textContent(child)
      });
      continue;
    }

    const headingLevel = headingDepth(child);
    const id = headingLevel ? data.headings[headingIndex++]?.blockId ?? `block-${blocks.length + 1}` : `block-${blocks.length + 1}`;
    const kind = blockKind(child);
    const enhancement = enhancementFor(child);
    const html = toHtml(child);
    const text = textContent(child).trim();

    if (headingLevel) {
      const heading = data.headings.find((item) => item.blockId === id);
      if (heading) {
        data.anchors[heading.id] = { id: heading.id, blockId: id, kind: 'heading' };
      }
    }

    blocks.push({
      id,
      kind,
      html,
      enhancement,
      text,
      level: headingLevel ?? undefined
    });
  }

  return blocks;
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
  const index = root.children.findIndex((child) => child === target || (isElement(child) && containsElement(child, target)));
  return `block-${Math.max(index + 1, 1)}`;
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
