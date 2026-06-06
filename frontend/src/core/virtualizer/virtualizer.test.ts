import { describe, expect, it } from 'vitest';
import { BlockVirtualizer } from './virtualizer';

describe('BlockVirtualizer', () => {
  it('keeps the mounted range bounded for large documents', () => {
    const virtualizer = new BlockVirtualizer(10_000, 50, 500);
    const range = virtualizer.range(200_000, 900);
    expect(range.end - range.start).toBeLessThan(50);
    expect(range.top).toBeGreaterThan(0);
    expect(range.bottom).toBeGreaterThan(0);
  });

  it('uses measured heights for target offsets', () => {
    const virtualizer = new BlockVirtualizer(4, 100, 0);
    virtualizer.measure(0, 20);
    virtualizer.measure(1, 40);
    expect(virtualizer.offsetFor(2)).toBe(60);
    expect(virtualizer.totalHeight()).toBe(260);
  });
});
