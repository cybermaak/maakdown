import type { Block, DocumentModel } from '../model/types';
import type { SearchMatch } from '../search/search';

export type MinimapMarkKind = 'heading' | 'search' | 'code' | 'diagram' | 'table';

export interface MinimapMark {
  id: string;
  blockId: string;
  blockIndex: number;
  position: number;
  kind: MinimapMarkKind;
  depth?: number;
}

export interface MinimapViewport {
  start: number;
  end: number;
}

export function buildStructuralMinimapMarks(model: DocumentModel): MinimapMark[] {
  const total = Math.max(1, model.blocks.length - 1);
  const marks: MinimapMark[] = [];

  model.blocks.forEach((block, blockIndex) => {
    const kind = structuralKind(block);
    if (!kind) return;
    marks.push({
      id: `${kind}-${block.id}`,
      blockId: block.id,
      blockIndex,
      position: blockIndex / total,
      kind,
      depth: block.level
    });
  });

  return marks;
}

export function buildSearchMinimapMarks(model: DocumentModel, matches: SearchMatch[]): MinimapMark[] {
  const total = Math.max(1, model.blocks.length - 1);
  const seen = new Set<string>();
  const marks: MinimapMark[] = [];

  for (const match of matches) {
    if (seen.has(match.blockId)) continue;
    seen.add(match.blockId);
    marks.push({
      id: `search-${match.blockId}`,
      blockId: match.blockId,
      blockIndex: match.blockIndex,
      position: match.blockIndex / total,
      kind: 'search'
    });
  }

  return marks;
}

function structuralKind(block: Block): MinimapMarkKind | null {
  if (block.kind === 'heading') return 'heading';
  if (block.kind === 'code') return 'code';
  if (block.kind === 'mermaid') return 'diagram';
  if (block.kind === 'table') return 'table';
  return null;
}
