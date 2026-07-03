import { describe, expect, it } from 'vitest';
import type { DocumentModel } from '../model/types';
import { projectDocumentStats } from './documentStats';

const model = {
  blocks: [
    { id: 'h1', kind: 'heading', html: '<h1>Project Plan</h1>', text: 'Project Plan', enhancement: 'none' },
    { id: 'p1', kind: 'paragraph', html: '<p>Hello useful reader.</p><img src="a.png">', text: 'Hello useful reader.', enhancement: 'none' },
    { id: 'task', kind: 'other', html: '<ul><li><input type="checkbox"> Ship it</li></ul>', text: 'Ship it', enhancement: 'none' },
    { id: 'table', kind: 'table', html: '<table><tr><td>A</td></tr></table>', text: 'A', enhancement: 'none' },
    { id: 'code', kind: 'code', html: '<pre><code>const value = 1</code></pre>', text: 'const value = 1', enhancement: 'code' },
    { id: 'diagram', kind: 'mermaid', html: '<pre><code>graph TD</code></pre>', text: 'graph TD', enhancement: 'mermaid' }
  ],
  headings: [{ id: 'project-plan', blockId: 'h1', depth: 1, text: 'Project Plan' }],
  anchors: {},
  footnotes: {},
  frontmatter: {},
  languages: ['ts'],
  unresolvedWikilinks: [],
  sourceLineCount: 32,
  readerLineCount: 6
} satisfies DocumentModel;

describe('projectDocumentStats', () => {
  it('projects lightweight reader stats from the document model', () => {
    expect(projectDocumentStats(model)).toMatchObject({
      words: 8,
      readingMinutes: 1,
      headings: 1,
      codeBlocks: 1,
      diagrams: 1,
      images: 1,
      tables: 1,
      tasks: 1,
      readerLines: 6
    });
  });
});
