import { describe, expect, it } from 'vitest';
import { emptyHistory, moveHistory, pushHistory, replaceCurrent } from './history';

describe('navigation history', () => {
  it('deduplicates equivalent locations and truncates forward history', () => {
    let history = pushHistory(emptyHistory(), { path: '/a.md', scrollTop: 10, anchorId: 'intro' });
    history = pushHistory(history, { path: '/a.md', scrollTop: 11, anchorId: 'intro' });
    expect(history.entries).toHaveLength(1);
    history = pushHistory(history, { path: '/b.md', scrollTop: 0, anchorId: null });
    history = moveHistory(history, -1);
    history = pushHistory(history, { path: '/c.md', scrollTop: 0, anchorId: null });
    expect(history.entries.map((entry) => entry.path)).toEqual(['/a.md', '/c.md']);
  });

  it('updates the current scroll position without adding a visit', () => {
    const history = replaceCurrent(
      pushHistory(emptyHistory(), { path: '/a.md', scrollTop: 0, anchorId: null }),
      { path: '/a.md', scrollTop: 420, anchorId: 'details' }
    );
    expect(history).toEqual({
      entries: [{ path: '/a.md', scrollTop: 420, anchorId: 'details' }],
      index: 0
    });
  });
});
