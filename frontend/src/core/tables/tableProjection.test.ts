import { describe, expect, it } from 'vitest';
import {
  defaultTableInteractionState,
  filterForColumnType,
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
    expect(projection?.columns.map((column) => column.type)).toEqual(['text', 'number', 'text']);
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

  it('filters rows with per-column text predicates', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Name</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Parser</td><td>Ready</td></tr>
          <tr><td>Renderer</td><td>Needs review</td></tr>
        </tbody>
      </table>
    `)!;

    const rows = visibleTableRows(projection, { ...defaultTableInteractionState(), filters: { 1: { kind: 'text', query: 'review' } } });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0].text).toBe('Renderer');
  });

  it('combines filters across columns with AND', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Name</th><th>Status</th><th>Area</th></tr></thead>
        <tbody>
          <tr><td>Review queue</td><td>Ready</td><td>Workspace</td></tr>
          <tr><td>Renderer</td><td>Needs review</td><td>Rendering</td></tr>
          <tr><td>Parser</td><td>Needs review</td><td>Pipeline</td></tr>
        </tbody>
      </table>
    `)!;

    const rows = visibleTableRows(projection, {
      ...defaultTableInteractionState(),
      filters: {
        1: { kind: 'text', query: 'review' },
        2: { kind: 'text', query: 'render' }
      }
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].cells[0].text).toBe('Renderer');
  });

  it('infers enum columns and filters selected values with OR', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Package</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>A</td><td>stable</td></tr>
          <tr><td>B</td><td>beta</td></tr>
          <tr><td>C</td><td>stable</td></tr>
          <tr><td>D</td><td></td></tr>
          <tr><td>E</td><td>deprecated</td></tr>
          <tr><td>F</td><td>stable</td></tr>
          <tr><td>G</td><td>stable</td></tr>
          <tr><td>H</td><td>beta</td></tr>
        </tbody>
      </table>
    `)!;

    expect(projection.columns[1].type).toBe('enum');
    expect(projection.columns[1].distinctValues[0]).toMatchObject({ value: 'stable', count: 4 });
    expect(projection.columns[1].distinctValues.some((item) => item.empty && item.label === '(empty)')).toBe(true);

    const rows = visibleTableRows(projection, {
      ...defaultTableInteractionState(),
      filters: { 1: { kind: 'enum', selected: ['stable', 'beta'] } }
    });
    expect(rows.map((row) => row.cells[0].text)).toEqual(['A', 'B', 'C', 'F', 'G', 'H']);
  });

  it('filters number and date ranges inclusively', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Name</th><th>Downloads</th><th>Date</th></tr></thead>
        <tbody>
          <tr><td>Low</td><td>1,200</td><td>2026-06-01</td></tr>
          <tr><td>Mid</td><td>10,000</td><td>2026-06-15</td></tr>
          <tr><td>High</td><td>$24,000</td><td>2026-07-01</td></tr>
        </tbody>
      </table>
    `)!;

    expect(projection.columns.map((column) => column.type)).toEqual(['text', 'number', 'date']);
    const rows = visibleTableRows(projection, {
      ...defaultTableInteractionState(),
      filters: {
        1: { kind: 'number', min: '5000', max: '25000' },
        2: { kind: 'date', from: '2026-06-10', to: '2026-07-01' }
      }
    });
    expect(rows.map((row) => row.cells[0].text)).toEqual(['Mid', 'High']);
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

    const numeric = visibleTableRows(projection, { filters: {}, sortColumn: 1, sortDirection: 'asc' });
    expect(numeric.map((row) => row.cells[0].text)).toEqual(['Alpha', 'Alpha', 'Beta']);

    const dates = visibleTableRows(projection, { filters: {}, sortColumn: 2, sortDirection: 'desc' });
    expect(dates.map((row) => row.cells[2].text)).toEqual(['2026-06-03', '2026-06-02', '2026-06-01']);

    const text = visibleTableRows(projection, { filters: {}, sortColumn: 0, sortDirection: 'asc' });
    expect(text.map((row) => row.originalIndex)).toEqual([1, 2, 0]);
  });

  it('sorts blank cells last in both directions', () => {
    const projection = projectTable(`
      <table>
        <thead><tr><th>Name</th><th>Score</th></tr></thead>
        <tbody>
          <tr><td>Blank</td><td></td></tr>
          <tr><td>High</td><td>10</td></tr>
          <tr><td>Low</td><td>1</td></tr>
        </tbody>
      </table>
    `)!;

    const asc = visibleTableRows(projection, { filters: {}, sortColumn: 1, sortDirection: 'asc' });
    const desc = visibleTableRows(projection, { filters: {}, sortColumn: 1, sortDirection: 'desc' });
    expect(asc.map((row) => row.cells[0].text)).toEqual(['Low', 'High', 'Blank']);
    expect(desc.map((row) => row.cells[0].text)).toEqual(['High', 'Low', 'Blank']);
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

  it('returns empty filters for column types', () => {
    expect(filterForColumnType('enum')).toEqual({ kind: 'enum', selected: [] });
    expect(filterForColumnType('text')).toEqual({ kind: 'text', query: '' });
    expect(filterForColumnType('number')).toEqual({ kind: 'number', min: '', max: '' });
    expect(filterForColumnType('date')).toEqual({ kind: 'date', from: '', to: '' });
  });
});
