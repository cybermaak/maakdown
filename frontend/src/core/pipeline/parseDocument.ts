import type { DocumentModel } from '../model/types';

export interface ParseRequest {
  source: string;
  path: string;
  vaultIndexVersion?: string;
}

export async function parseDocument(request: ParseRequest): Promise<DocumentModel> {
  return {
    blocks: [
      {
        id: 'placeholder-1',
        kind: 'paragraph',
        html: escapeHtml(request.source || 'No content'),
        enhancement: 'none'
      }
    ],
    headings: [],
    anchors: {},
    frontmatter: {}
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
