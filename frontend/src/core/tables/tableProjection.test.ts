import { describe, expect, it } from 'vitest';
import {
  defaultTableInteractionState,
  nextSortDirection,
  projectTable,
  visibleTableRows
} from './tableProjection';

describe('tableProjection', () => {
  it('projects headered sanitized tables and computes balanced widths', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Area</th><th align="right">Count</th><th>Notes</th></tr></thead>
        <tbody>
          <tr><td>Rendering</td><td align="right">12</td><td>Short</td></tr>
          <tr><td>Workspace</td><td align="right">4</td><td>A much longer note that should influence sizing</td></tr>
        </tbody>
      </table>
    `);

    expect(projection).toMatchObject({
      hasHeader: true,
      interactive: true,
      columnCount: 3,
      rowCount: 2
    });
    expect(projection?.headers[1]).toMatchObject({ text: 'Count', align: 'right' });
    expect(Math.round((projection?.columnWidths ?? []).reduce((sum, value) => sum + value, 0))).toBe(100);
    expect((projection?.columnWidths[2] ?? 0)).toBeGreaterThan(projection?.columnWidths[1] ?? 0);
  });

  it('suppresses interactive tools for no-header and oversized tables', () => {
    const noHeader = projectTable('<table><tbody><tr><td>A</td><td>B</td></tr></tbody></table>');
    expect(noHeader?.interactive).toBe(false);
    expect(noHeader?.disabledReason).toBe('no-header');

    const rows = Array.from({ length: 4 }, (_, index) => `<tr><td>${index}</td></tr>`).join('');
    const oversized = projectTable(`<table><thead><tr><th>ID</th></tr></thead><tbody>${rows}</tbody></table>`, { maxRows: 3 });
    expect(oversized?.interactive).toBe(false);
    expect(oversized?.disabledReason).toBe('too-large');
  });

  it('filters rows by visible row text', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Name</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Parser</td><td>Ready</td></tr>
          <tr><td>Renderer</td><td>Needs review</td></tr>
        </tbody>
      </table>
    `)!;

    const rows = visibleTableRows(projection, { ...defaultTableInteractionState(), filter: 'review' });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0].text).toBe('Renderer');
  });

  it('sorts numeric, date-like, and text values stably', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Name</th><th>Score</th><th>Date</th></tr></thead>
        <tbody>
          <tr><td>Beta</td><td>10</td><td>2026-06-02</td></tr>
          <tr><td>Alpha</td><td>2</td><td>2026-06-01</td></tr>
          <tr><td>Alpha</td><td>2</td><td>2026-06-03</td></tr>
        </tbody>
      </table>
    `)!;

    const numeric = visibleTableRows(projection, { filter: '', sortColumn: 1, sortDirection: 'asc' });
    expect(numeric.map((row) => row.cells[0].text)).toEqual(['Alpha', 'Alpha', 'Beta']);

    const dates = visibleTableRows(projection, { filter: '', sortColumn: 2, sortDirection: 'desc' });
    expect(dates.map((row) => row.cells[2].text)).toEqual(['2026-06-03', '2026-06-02', '2026-06-01']);

    const text = visibleTableRows(projection, { filter: '', sortColumn: 0, sortDirection: 'asc' });
    expect(text.map((row) => row.originalIndex)).toEqual([1, 2, 0]);
  });

  it('cycles sort state through ascending, descending, and source order', () => {
    const initial = defaultTableInteractionState();
    const asc = nextSortDirection(initial, 2);
    const desc = nextSortDirection(asc, 2);
    const source = nextSortDirection(desc, 2);

    expect(asc).toMatchObject({ sortColumn: 2, sortDirection: 'asc' });
    expect(desc).toMatchObject({ sortColumn: 2, sortDirection: 'desc' });
    expect(source).toMatchObject({ sortColumn: null, sortDirection: 'none' });
  });

  it('can compute equal column widths', () => {
    const projection = projectTable('<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>Short</td><td>Longer value</td></tr></tbody></table>', {
      columnSizing: 'equal'
    });

    expect(projection?.columnWidths).toEqual([50, 50]);
  });
});
