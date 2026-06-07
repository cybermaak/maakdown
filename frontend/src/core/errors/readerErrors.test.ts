import { describe, expect, it } from 'vitest';
import { presentReaderError } from './readerErrors';

describe('reader error presentation', () => {
  it('classifies recoverable file failures', () => {
    expect(presentReaderError(new Error('file not found')).kind).toBe('missing');
    expect(presentReaderError(new Error('permission denied')).kind).toBe('permission');
  });
});
