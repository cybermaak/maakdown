import type { DocumentModel } from '../model/types';

export interface SearchMatch {
  blockId: string;
  blockIndex: number;
  start: number;
  end: number;
}

export function searchDocument(
  model: DocumentModel,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
): SearchMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(options.wholeWord ? `\\b${escaped}\\b` : escaped, options.caseSensitive ? 'g' : 'gi');
  const matches: SearchMatch[] = [];
  model.blocks.forEach((block, blockIndex) => {
    for (const match of block.text?.matchAll(expression) ?? []) {
      const start = match.index ?? 0;
      matches.push({ blockId: block.id, blockIndex, start, end: start + match[0].length });
    }
  });
  return matches;
}
