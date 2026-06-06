import { describe, expect, it } from 'vitest';
import { activateOrAddTab, addRecent, closeTab, createWorkspace, serializeSession } from './workspace';

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
