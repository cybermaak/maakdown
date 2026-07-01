import type { DocumentModel } from '../model/types';
import { emptyHistory, type NavigationHistory } from '../navigation/history';

export interface ReaderPosition {
  scrollTop: number;
  activeHeadingId: string | null;
}

export interface DocumentTab {
  id: string;
  path: string;
  title: string;
  model: DocumentModel | null;
  loading: boolean;
  error: string | null;
  trustedRoot: string;
  position: ReaderPosition;
  watching: boolean;
  changed: boolean;
  reloading: boolean;
  history: NavigationHistory;
}

export interface RecentDocument {
  path: string;
  displayName: string;
  lastOpenedAt: string;
  pinned?: boolean;
  missingAt?: string;
}

export interface WorkspaceState {
  tabs: DocumentTab[];
  activeTabId: string | null;
  closedTabs: DocumentTab[];
  recents: RecentDocument[];
  restoring: boolean;
}

export interface PersistedSession {
  tabs: Array<{ path: string; position: { scrollTop: number; activeHeadingId?: string } }>;
  activePath?: string;
  recents: RecentDocument[];
}

export function createWorkspace(): WorkspaceState {
  return { tabs: [], activeTabId: null, closedTabs: [], recents: [], restoring: false };
}

export function canonicalIdentity(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+/g, '/').replace(/\/$/, '');
}

export function tabId(path: string): string {
  let hash = 2166136261;
  for (const char of canonicalIdentity(path)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `tab-${(hash >>> 0).toString(36)}`;
}

export function titleFromPath(path: string): string {
  return path.replaceAll('\\', '/').split('/').at(-1) || path;
}

export function activateOrAddTab(state: WorkspaceState, path: string, position?: ReaderPosition): WorkspaceState {
  const identity = canonicalIdentity(path);
  const existing = state.tabs.find((tab) => canonicalIdentity(tab.path) === identity);
  if (existing) {
    return { ...state, activeTabId: existing.id };
  }
  const tab: DocumentTab = {
    id: tabId(path),
    path,
    title: titleFromPath(path),
    model: null,
    loading: true,
    error: null,
    trustedRoot: '',
    position: position ?? { scrollTop: 0, activeHeadingId: null },
    watching: false,
    changed: false,
    reloading: false,
    history: emptyHistory()
  };
  return { ...state, tabs: [...state.tabs, tab], activeTabId: tab.id };
}

export function updateTab(state: WorkspaceState, id: string, patch: Partial<DocumentTab>): WorkspaceState {
  return { ...state, tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)) };
}

export function closeTab(state: WorkspaceState, id: string): WorkspaceState {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index < 0) return state;
  const closed = state.tabs[index];
  const tabs = state.tabs.filter((tab) => tab.id !== id);
  const nextActive =
    state.activeTabId === id ? (tabs[Math.min(index, tabs.length - 1)]?.id ?? null) : state.activeTabId;
  return { ...state, tabs, activeTabId: nextActive, closedTabs: [closed, ...state.closedTabs].slice(0, 10) };
}

export function relocateTab(state: WorkspaceState, id: string, path: string): WorkspaceState {
  const sourceIndex = state.tabs.findIndex((tab) => tab.id === id);
  if (sourceIndex < 0) return state;
  const identity = canonicalIdentity(path);
  const existing = state.tabs.find((tab) => tab.id !== id && canonicalIdentity(tab.path) === identity);
  if (existing) {
    return {
      ...state,
      tabs: state.tabs.filter((tab) => tab.id !== id),
      activeTabId: existing.id
    };
  }
  const tabs = [...state.tabs];
  tabs[sourceIndex] = {
    ...tabs[sourceIndex],
    path,
    title: titleFromPath(path),
    model: null,
    loading: true,
    error: null,
    trustedRoot: '',
    watching: false,
    changed: false,
    reloading: false,
    history: emptyHistory()
  };
  return { ...state, tabs, activeTabId: id };
}

export function addRecent(recents: RecentDocument[], path: string, now = new Date()): RecentDocument[] {
  const identity = canonicalIdentity(path);
  const existing = recents.find((recent) => canonicalIdentity(recent.path) === identity);
  return sortRecents([
    { path, displayName: titleFromPath(path), lastOpenedAt: now.toISOString(), pinned: existing?.pinned },
    ...recents.filter((recent) => canonicalIdentity(recent.path) !== identity)
  ]).slice(0, 12);
}

export function pinRecent(recents: RecentDocument[], path: string, pinned: boolean): RecentDocument[] {
  return sortRecents(recents.map((recent) => (
    canonicalIdentity(recent.path) === canonicalIdentity(path) ? { ...recent, pinned } : recent
  )));
}

export function markRecentMissing(recents: RecentDocument[], path: string, now = new Date()): RecentDocument[] {
  return recents.map((recent) => (
    canonicalIdentity(recent.path) === canonicalIdentity(path)
      ? { ...recent, missingAt: now.toISOString() }
      : recent
  ));
}

export function clearMissingRecents(recents: RecentDocument[]): RecentDocument[] {
  return recents.filter((recent) => !recent.missingAt);
}

export function clearUnpinnedRecents(recents: RecentDocument[]): RecentDocument[] {
  return recents.filter((recent) => recent.pinned);
}

function sortRecents(recents: RecentDocument[]): RecentDocument[] {
  return [...recents].sort((a, b) => {
    if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
    return b.lastOpenedAt.localeCompare(a.lastOpenedAt);
  });
}

export function serializeSession(state: WorkspaceState): PersistedSession {
  const active = state.tabs.find((tab) => tab.id === state.activeTabId);
  return {
    tabs: state.tabs.map((tab) => ({
      path: tab.path,
      position: {
        scrollTop: tab.position.scrollTop,
        ...(tab.position.activeHeadingId ? { activeHeadingId: tab.position.activeHeadingId } : {})
      }
    })),
    ...(active ? { activePath: active.path } : {}),
    recents: state.recents
  };
}
