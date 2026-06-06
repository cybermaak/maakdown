export interface VirtualRange {
  start: number;
  end: number;
  top: number;
  bottom: number;
}

export class BlockVirtualizer {
  private heights = new Map<number, number>();

  constructor(
    private count: number,
    private estimate = 72,
    private overscanPx = 900
  ) {}

  setCount(count: number) {
    this.count = count;
    for (const index of this.heights.keys()) {
      if (index >= count) {
        this.heights.delete(index);
      }
    }
  }

  measure(index: number, height: number) {
    if (index >= 0 && index < this.count && height > 0) {
      this.heights.set(index, height);
    }
  }

  offsetFor(index: number): number {
    let offset = 0;
    for (let current = 0; current < Math.min(index, this.count); current += 1) {
      offset += this.heightFor(current);
    }
    return offset;
  }

  totalHeight(): number {
    return this.offsetFor(this.count);
  }

  indexAt(offset: number): number {
    let low = 0;
    let high = this.count;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.offsetFor(middle + 1) <= offset) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    return Math.min(low, Math.max(this.count - 1, 0));
  }

  range(scrollTop: number, viewportHeight: number): VirtualRange {
    if (this.count === 0) {
      return { start: 0, end: 0, top: 0, bottom: 0 };
    }
    const start = this.indexAt(Math.max(scrollTop - this.overscanPx, 0));
    const end = Math.min(this.indexAt(scrollTop + viewportHeight + this.overscanPx) + 1, this.count);
    const top = this.offsetFor(start);
    const bottom = Math.max(this.totalHeight() - this.offsetFor(end), 0);
    return { start, end, top, bottom };
  }

  private heightFor(index: number): number {
    return this.heights.get(index) ?? this.estimate;
  }
}
