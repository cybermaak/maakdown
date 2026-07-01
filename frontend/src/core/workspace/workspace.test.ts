import { describe, expect, it } from 'vitest';
import {
  activateOrAddTab,
  addRecent,
  clearMissingRecents,
  clearUnpinnedRecents,
  closeTab,
  createWorkspace,
  markRecentMissing,
  pinRecent,
  relocateTab,
  serializeSession
} from './workspace';

describe('workspace', () => {
  it('deduplicates canonical paths', () => {
    let state = activateOrAddTab(createWorkspace(), '/notes/one.md');
    state = activateOrAddTab(state, '/notes//one.md');
    expect(state.tabs).toHaveLength(1);
  });

  it('selects the nearest tab on close and can retain closed tabs', () => {
    let state = activateOrAddTab(createWorkspace(), '/a.md');
    state = activateOrAddTab(state, '/b.md');
    state = activateOrAddTab(state, '/c.md');
    state = closeTab(state, state.tabs[1].id);
    expect(state.tabs.find((tab) => tab.id === state.activeTabId)?.path).toBe('/c.md');
    expect(state.closedTabs[0].path).toBe('/b.md');
  });

  it('relocates a missing tab in place without losing its position', () => {
    let state = activateOrAddTab(createWorkspace(), '/missing.md', { scrollTop: 320, activeHeadingId: 'details' });
    const id = state.activeTabId!;
    state = relocateTab(state, id, '/moved/found.md');
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]).toMatchObject({
      id,
      path: '/moved/found.md',
      title: 'found.md',
      position: { scrollTop: 320, activeHeadingId: 'details' },
      loading: true,
      error: null
    });
  });

  it('deduplicates a relocated path against an existing tab', () => {
    let state = activateOrAddTab(createWorkspace(), '/missing.md');
    const missingId = state.activeTabId!;
    state = activateOrAddTab(state, '/existing.md');
    const existingId = state.activeTabId!;
    state = relocateTab(state, missingId, '/existing.md');
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(existingId);
  });

  it('keeps recents unique and bounded', () => {
    let recents = Array.from({ length: 12 }, (_, index) =>
      addRecent([], `/note-${index}.md`, new Date(`2026-06-${String(index + 1).padStart(2, '0')}T00:00:00Z`))[0]
    );
    recents = addRecent(recents, '/note-5.md', new Date('2026-06-20T00:00:00Z'));
    expect(recents).toHaveLength(12);
    expect(recents[0].path).toBe('/note-5.md');
    expect(recents.filter((recent) => recent.path === '/note-5.md')).toHaveLength(1);
  });

  it('keeps pinned recents first and preserves pin state when reopened', () => {
    let recents = addRecent([], '/a.md', new Date('2026-06-01T00:00:00Z'));
    recents = addRecent(recents, '/b.md', new Date('2026-06-02T00:00:00Z'));
    recents = pinRecent(recents, '/a.md', true);
    recents = addRecent(recents, '/a.md', new Date('2026-06-03T00:00:00Z'));

    expect(recents[0]).toMatchObject({ path: '/a.md', pinned: true });
  });

  it('marks and clears missing or unpinned recents', () => {
    let recents = addRecent([], '/a.md', new Date('2026-06-01T00:00:00Z'));
    recents = addRecent(recents, '/b.md', new Date('2026-06-02T00:00:00Z'));
    recents = pinRecent(recents, '/a.md', true);
    recents = markRecentMissing(recents, '/b.md', new Date('2026-06-03T00:00:00Z'));

    expect(clearMissingRecents(recents).map((recent) => recent.path)).toEqual(['/a.md']);
    expect(clearUnpinnedRecents(recents).map((recent) => recent.path)).toEqual(['/a.md']);
  });

  it('serializes only durable workspace data', () => {
    let state = activateOrAddTab(createWorkspace(), '/a.md', { scrollTop: 20, activeHeadingId: 'intro' });
    state = { ...state, recents: addRecent([], '/a.md', new Date('2026-06-06T00:00:00Z')) };
    expect(serializeSession(state)).toEqual({
      tabs: [{ path: '/a.md', position: { scrollTop: 20, activeHeadingId: 'intro' } }],
      activePath: '/a.md',
      recents: [{ path: '/a.md', displayName: 'a.md', lastOpenedAt: '2026-06-06T00:00:00.000Z' }]
    });
  });
});
