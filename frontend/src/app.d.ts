declare global {
  interface Window {
    go?: Record<string, unknown>;
    __maakdownBenchmark?: {
      parseFixture: (name: string, collectSourcePositions?: boolean) => Promise<unknown>;
      activeModelStats: () => unknown;
    };
  }
}

export {};
