import { describe, expect, it } from 'vitest';
import { contentFingerprint } from './enhancementManager';

describe('enhancement cache content identity', () => {
  it('distinguishes different sources that share a block id', () => {
    expect(contentFingerprint('flowchart LR\nA --> B')).not.toBe(
      contentFingerprint('classDiagram\nclass App')
    );
  });

  it('is stable for the same source', () => {
    expect(contentFingerprint('sequenceDiagram\nA->>B: hello')).toBe(
      contentFingerprint('sequenceDiagram\nA->>B: hello')
    );
  });
});
