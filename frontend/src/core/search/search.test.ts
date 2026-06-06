import { describe, expect, it } from 'vitest';
import { searchDocument } from './search';
import type { DocumentModel } from '../model/types';

const model = {
  blocks: [
    { id: 'a', kind: 'paragraph', html: '<p>Alpha beta alpha.</p>', text: 'Alpha beta alpha.', enhancement: 'none' },
    { id: 'b', kind: 'paragraph', html: '<p>alphabet</p>', text: 'alphabet', enhancement: 'none' }
  ],
  headings: [], anchors: {}, footnotes: {}, frontmatter: {}, languages: [], unresolvedWikilinks: []
} satisfies DocumentModel;

describe('searchDocument', () => {
  it('counts matches over the complete document model', () => {
    expect(searchDocument(model, 'alpha')).toHaveLength(3);
  });

  it('supports case and whole-word matching', () => {
    expect(searchDocument(model, 'alpha', { caseSensitive: true })).toHaveLength(2);
    expect(searchDocument(model, 'alpha', { wholeWord: true })).toHaveLength(2);
  });
});
