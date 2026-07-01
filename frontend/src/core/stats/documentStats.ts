import type { DocumentModel } from '../model/types';

export interface DocumentStats {
  words: number;
  readingMinutes: number;
  headings: number;
  codeBlocks: number;
  diagrams: number;
  images: number;
  tables: number;
  tasks: number;
  sourceLines: number;
}

const WORDS_PER_MINUTE = 225;

export function projectDocumentStats(model: DocumentModel): DocumentStats {
  let words = 0;
  let images = 0;
  let tasks = 0;

  for (const block of model.blocks) {
    if (block.kind !== 'code' && block.kind !== 'mermaid') {
      words += countWords(block.text ?? '');
    }
    images += countOccurrences(block.html, /<img\b/gi);
    tasks += countOccurrences(block.html, /<input\b[^>]*type=["']checkbox["']/gi);
  }

  return {
    words,
    readingMinutes: Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
    headings: model.headings.length,
    codeBlocks: model.blocks.filter((block) => block.kind === 'code').length,
    diagrams: model.blocks.filter((block) => block.kind === 'mermaid').length,
    images,
    tables: model.blocks.filter((block) => block.kind === 'table').length,
    tasks,
    sourceLines: model.sourceLineCount ?? 0
  };
}

export function formatStatValue(value: number, label: string): string {
  return `${value.toLocaleString()} ${label}${value === 1 ? '' : 's'}`;
}

function countWords(text: string): number {
  return text.match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu)?.length ?? 0;
}

function countOccurrences(value: string, expression: RegExp): number {
  return value.match(expression)?.length ?? 0;
}
