export type BlockKind =
  | 'paragraph'
  | 'heading'
  | 'code'
  | 'table'
  | 'math'
  | 'mermaid'
  | 'callout'
  | 'html'
  | 'other';

export type EnhancementKind = 'none' | 'code' | 'mermaid';

export interface Block {
  id: string;
  kind: BlockKind;
  html: string;
  enhancement: EnhancementKind;
  text?: string;
  language?: string;
  level?: number;
  sourceStart?: number;
  sourceEnd?: number;
}

export interface Heading {
  id: string;
  blockId: string;
  depth: number;
  text: string;
}

export interface AnchorTarget {
  id: string;
  blockId: string;
  kind: 'heading' | 'footnote' | 'backref' | 'generic';
}

export interface DocumentModel {
  blocks: Block[];
  headings: Heading[];
  anchors: Record<string, AnchorTarget>;
  footnotes: Record<string, AnchorTarget>;
  frontmatter: Record<string, unknown>;
  languages: string[];
  unresolvedWikilinks: string[];
}

export interface VaultIndexSnapshot {
  version: string;
  notes: Record<string, string>;
}
