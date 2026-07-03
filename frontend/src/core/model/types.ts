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

export type ReaderLineKind = 'block' | 'list-item' | 'hard-break-segment' | 'callout-title';

export interface ReaderLine {
  lineNumber: number;
  anchorId: string;
  kind: ReaderLineKind;
}

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
  sourceLines?: number[];
  sourceLineGroups?: number[][];
  readerLines?: ReaderLine[];
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
  sourceLineCount?: number;
  sourcePositionsEnabled?: boolean;
  readerLineCount?: number;
}

export interface VaultIndexSnapshot {
  version: string;
  notes: Record<string, string>;
}
