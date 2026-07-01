import { describe, expect, it } from 'vitest';
import { presentReaderError } from './readerErrors';

describe('reader error presentation', () => {
  it('classifies recoverable file failures', () => {
    expect(presentReaderError(new Error('file not found')).kind).toBe('missing');
    expect(presentReaderError(new Error('permission denied')).kind).toBe('permission');
  });

  it('classifies reader and enhancement failures', () => {
    expect(presentReaderError(new Error('markdown parse failed')).kind).toBe('parse');
    expect(presentReaderError(new Error('mermaid enhancement failed')).kind).toBe('enhancement');
    expect(presentReaderError(new Error('asset blocked')).kind).toBe('asset');
    expect(presentReaderError(new Error('oversized document')).retryable).toBe(false);
  });
});
