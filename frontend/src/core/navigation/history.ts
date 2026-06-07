export interface NavigationEntry {
  path: string;
  scrollTop: number;
  anchorId: string | null;
}

export interface NavigationHistory {
  entries: NavigationEntry[];
  index: number;
}

export function emptyHistory(): NavigationHistory {
  return { entries: [], index: -1 };
}

export function pushHistory(history: NavigationHistory, entry: NavigationEntry): NavigationHistory {
  const current = history.entries[history.index];
  if (
    current?.path === entry.path &&
    current.anchorId === entry.anchorId &&
    Math.abs(current.scrollTop - entry.scrollTop) < 2
  ) {
    return history;
  }
  const entries = [...history.entries.slice(0, history.index + 1), entry].slice(-100);
  return { entries, index: entries.length - 1 };
}

export function replaceCurrent(history: NavigationHistory, entry: NavigationEntry): NavigationHistory {
  if (history.index < 0) return pushHistory(history, entry);
  const entries = [...history.entries];
  entries[history.index] = entry;
  return { entries, index: history.index };
}

export function moveHistory(history: NavigationHistory, offset: number): NavigationHistory {
  const index = history.index + offset;
  return index < 0 || index >= history.entries.length ? history : { ...history, index };
}
