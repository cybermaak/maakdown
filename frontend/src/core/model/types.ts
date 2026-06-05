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
}

export interface DocumentModel {
  blocks: Block[];
  headings: Heading[];
  anchors: Record<string, AnchorTarget>;
  frontmatter: Record<string, unknown>;
}
