export type TableColumnSizing = 'balanced' | 'equal';
export type TableSortDirection = 'none' | 'asc' | 'desc';
export type TableColumnType = 'number' | 'date' | 'enum' | 'text';

export interface TableCellProjection {
  html: string;
  text: string;
  align: 'left' | 'center' | 'right';
}

export interface TableDistinctValue {
  value: string;
  label: string;
  count: number;
  empty: boolean;
}

export interface TableColumnProjection {
  index: number;
  label: string;
  type: TableColumnType;
  distinctValues: TableDistinctValue[];
  blankCount: number;
}

export interface TableProjection {
  headers: TableCellProjection[];
  rows: TableCellProjection[][];
  columns: TableColumnProjection[];
  columnCount: number;
  rowCount: number;
  hasHeader: boolean;
  interactive: boolean;
  disabledReason?: 'no-header' | 'empty' | 'span' | 'too-large';
  columnWidths: number[];
}

export type TableColumnFilter =
  | { kind: 'enum'; selected: string[] }
  | { kind: 'text'; query: string }
  | { kind: 'number'; min?: string; max?: string }
  | { kind: 'date'; from?: string; to?: string };

export interface TableInteractionState {
  filters: Record<string, TableColumnFilter>;
  sortColumn: number | null;
  sortDirection: TableSortDirection;
}

export interface TableVisibleRow {
  originalIndex: number;
  cells: TableCellProjection[];
}

export interface ProjectTableOptions {
  columnSizing?: TableColumnSizing;
  maxRows?: number;
  maxColumns?: number;
  maxCells?: number;
  maxTextLength?: number;
  sampleRows?: number;
}

const DEFAULTS = {
  maxRows: 250,
  maxColumns: 12,
  maxCells: 1_500,
  maxTextLength: 40_000,
  sampleRows: 40
};

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function defaultTableInteractionState(): TableInteractionState {
  return { filters: {}, sortColumn: null, sortDirection: 'none' };
}

export function projectTable(html: string, options: ProjectTableOptions = {}): TableProjection | null {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const table = template.content.querySelector('table');
  if (!table) return null;

  const hasSpans = Boolean(table.querySelector('[colspan], [rowspan]'));
  const headerCells = headerCellsFor(table).map(projectCell);
  const bodyRows = bodyRowsFor(table);
  const projectedRows = bodyRows.map((row) => Array.from(row.children).filter(isTableCell).map(projectCell));
  const columnCount = Math.max(headerCells.length, ...projectedRows.map((row) => row.length), 0);
  if (columnCount === 0) return null;

  const headers = normalizeRow(headerCells, columnCount);
  const rows = projectedRows.map((row) => normalizeRow(row, columnCount));
  const textLength = rows.reduce((total, row) => total + row.reduce((rowTotal, cell) => rowTotal + cell.text.length, 0), headers.reduce((total, cell) => total + cell.text.length, 0));
  const maxRows = options.maxRows ?? DEFAULTS.maxRows;
  const maxColumns = options.maxColumns ?? DEFAULTS.maxColumns;
  const maxCells = options.maxCells ?? DEFAULTS.maxCells;
  const maxTextLength = options.maxTextLength ?? DEFAULTS.maxTextLength;
  const hasHeader = headerCells.length > 0;
  const tooLarge = rows.length > maxRows || columnCount > maxColumns || rows.length * columnCount > maxCells || textLength > maxTextLength;
  const disabledReason = !hasHeader
    ? 'no-header'
    : rows.length === 0
      ? 'empty'
      : hasSpans
        ? 'span'
        : tooLarge
          ? 'too-large'
          : undefined;

  return {
    headers,
    rows,
    columns: columnsFor(headers, rows),
    columnCount,
    rowCount: rows.length,
    hasHeader,
    interactive: !disabledReason,
    disabledReason,
    columnWidths: columnWidths(headers, rows, options.columnSizing ?? 'balanced', options.sampleRows ?? DEFAULTS.sampleRows)
  };
}

export function visibleTableRows(projection: TableProjection, state: TableInteractionState): TableVisibleRow[] {
  let rows = projection.rows.map((cells, originalIndex) => ({ originalIndex, cells }));
  const filters = activeFilterEntries(state);
  if (filters.length > 0) {
    rows = rows.filter((row) => filters.every(([column, filter]) => rowMatchesFilter(row, projection.columns[column], filter)));
  }
  if (state.sortColumn !== null && state.sortDirection !== 'none') {
    const column = state.sortColumn;
    const direction = state.sortDirection === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const left = a.cells[column]?.text ?? '';
      const right = b.cells[column]?.text ?? '';
      const blankCompared = compareBlankLast(left, right);
      if (blankCompared !== 0) return blankCompared;
      const compared = compareCellValues(left, right, projection.columns[column]?.type ?? 'text');
      return compared === 0 ? a.originalIndex - b.originalIndex : compared * direction;
    });
  }
  return rows;
}

export function nextSortDirection(current: TableInteractionState, column: number): TableInteractionState {
  if (current.sortColumn !== column || current.sortDirection === 'none') {
    return { ...current, sortColumn: column, sortDirection: 'asc' };
  }
  if (current.sortDirection === 'asc') {
    return { ...current, sortColumn: column, sortDirection: 'desc' };
  }
  return { ...current, sortColumn: null, sortDirection: 'none' };
}

export function isDefaultTableInteractionState(state: TableInteractionState): boolean {
  return activeFilterEntries(state).length === 0 && state.sortColumn === null && state.sortDirection === 'none';
}

export function filterForColumnType(type: TableColumnType): TableColumnFilter {
  if (type === 'enum') return { kind: 'enum', selected: [] };
  if (type === 'number') return { kind: 'number', min: '', max: '' };
  if (type === 'date') return { kind: 'date', from: '', to: '' };
  return { kind: 'text', query: '' };
}

export function isActiveTableFilter(filter: TableColumnFilter | null | undefined): boolean {
  if (!filter) return false;
  if (filter.kind === 'enum') return filter.selected.length > 0;
  if (filter.kind === 'text') return normalizeSearch(filter.query).length > 0;
  if (filter.kind === 'number') return parseNumber(filter.min ?? '') !== null || parseNumber(filter.max ?? '') !== null;
  return parseDate(filter.from ?? '') !== null || parseDate(filter.to ?? '') !== null;
}

export function activeFilterEntries(state: TableInteractionState): Array<[number, TableColumnFilter]> {
  return Object.entries(state.filters ?? {})
    .map(([column, filter]) => [Number(column), filter] as [number, TableColumnFilter])
    .filter(([column, filter]) => Number.isInteger(column) && column >= 0 && isActiveTableFilter(filter));
}

function headerCellsFor(table: HTMLTableElement): Element[] {
  const explicit = table.querySelector('thead tr');
  if (explicit) return Array.from(explicit.children).filter(isTableCell);
  const firstRow = table.querySelector('tr');
  if (!firstRow) return [];
  const cells = Array.from(firstRow.children).filter(isTableCell);
  return cells.length > 0 && cells.every((cell) => cell.tagName.toLowerCase() === 'th') ? cells : [];
}

function bodyRowsFor(table: HTMLTableElement): HTMLTableRowElement[] {
  const explicitHeader = table.querySelector('thead tr');
  const allRows = Array.from(table.querySelectorAll('tr'));
  if (explicitHeader) {
    return allRows.filter((row) => row !== explicitHeader);
  }
  const firstRow = allRows[0];
  const firstRowIsHeader = firstRow && Array.from(firstRow.children).filter(isTableCell).every((cell) => cell.tagName.toLowerCase() === 'th');
  return firstRowIsHeader ? allRows.slice(1) : allRows;
}

function projectCell(cell: Element): TableCellProjection {
  return {
    html: cell.innerHTML,
    text: normalizeCellText(cell.textContent ?? ''),
    align: alignmentFor(cell)
  };
}

function normalizeRow(row: TableCellProjection[], columnCount: number): TableCellProjection[] {
  return Array.from({ length: columnCount }, (_, index) => row[index] ?? { html: '', text: '', align: 'left' });
}

function columnsFor(headers: TableCellProjection[], rows: TableCellProjection[][]): TableColumnProjection[] {
  const columnCount = headers.length || rows[0]?.length || 0;
  return Array.from({ length: columnCount }, (_, index) => {
    const values = rows.map((row) => row[index]?.text ?? '');
    const type = inferColumnType(values);
    return {
      index,
      label: headers[index]?.text || `Column ${index + 1}`,
      type,
      distinctValues: distinctValues(values, type),
      blankCount: values.filter((value) => value.trim() === '').length
    };
  });
}

function inferColumnType(values: string[]): TableColumnType {
  const nonBlank = values.map((value) => value.trim()).filter(Boolean);
  if (nonBlank.length === 0) return 'text';
  if (nonBlank.every((value) => parseNumber(value) !== null)) return 'number';
  if (nonBlank.every((value) => parseDate(value) !== null)) return 'date';

  const distinct = new Set(nonBlank.map((value) => normalizeSearch(value)));
  const longest = Math.max(...nonBlank.map((value) => value.length));
  const enumLimit = Math.min(12, Math.round(0.4 * values.length));
  return distinct.size <= enumLimit && longest <= 24 ? 'enum' : 'text';
}

function distinctValues(values: string[], type: TableColumnType): TableDistinctValue[] {
  if (type !== 'enum') return [];
  const counts = new Map<string, { label: string; count: number; empty: boolean }>();
  for (const value of values) {
    const trimmed = value.trim();
    const key = trimmed;
    const current = counts.get(key);
    if (current) {
      current.count += 1;
    } else {
      counts.set(key, { label: trimmed || '(empty)', count: 1, empty: trimmed === '' });
    }
  }
  return [...counts.entries()]
    .map(([value, item]) => ({ value, label: item.label, count: item.count, empty: item.empty }))
    .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));
}

function columnWidths(headers: TableCellProjection[], rows: TableCellProjection[][], sizing: TableColumnSizing, sampleRows: number): number[] {
  const columnCount = headers.length || rows[0]?.length || 0;
  if (columnCount === 0) return [];
  if (sizing === 'equal') {
    return Array.from({ length: columnCount }, () => 100 / columnCount);
  }

  const samples = rows.slice(0, sampleRows);
  const weights = Array.from({ length: columnCount }, (_, column) => {
    const lengths = [headers[column]?.text.length ?? 0, ...samples.map((row) => row[column]?.text.length ?? 0)];
    const maxLength = Math.max(4, Math.min(80, ...lengths));
    const averageLength = lengths.reduce((total, length) => total + Math.min(length, 80), 0) / Math.max(1, lengths.length);
    return Math.max(4, Math.sqrt(maxLength) * 2.2 + Math.sqrt(averageLength) * 1.2);
  });
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  return weights.map((weight) => (weight / total) * 100);
}

function compareCellValues(left: string, right: string, type: TableColumnType): number {
  if (type === 'number') {
    const a = parseNumber(left);
    const b = parseNumber(right);
    if (a !== null && b !== null) return a === b ? 0 : a < b ? -1 : 1;
  }
  if (type === 'date') {
    const a = parseDate(left);
    const b = parseDate(right);
    if (a !== null && b !== null) return a === b ? 0 : a < b ? -1 : 1;
  }
  return collator.compare(left.trim(), right.trim());
}

function compareBlankLast(left: string, right: string): number {
  const leftBlank = left.trim() === '';
  const rightBlank = right.trim() === '';
  if (leftBlank && rightBlank) return 0;
  if (leftBlank) return 1;
  if (rightBlank) return -1;
  return 0;
}

function rowMatchesFilter(row: TableVisibleRow, column: TableColumnProjection | undefined, filter: TableColumnFilter): boolean {
  const value = row.cells[column?.index ?? -1]?.text ?? '';
  if (filter.kind === 'enum') {
    return filter.selected.length === 0 || filter.selected.includes(value.trim());
  }
  if (filter.kind === 'text') {
    const query = normalizeSearch(filter.query);
    return !query || normalizeSearch(value).includes(query);
  }
  if (filter.kind === 'number') {
    const parsed = parseNumber(value);
    if (parsed === null) return false;
    const min = parseNumber(filter.min ?? '');
    const max = parseNumber(filter.max ?? '');
    return (min === null || parsed >= min) && (max === null || parsed <= max);
  }
  const parsed = parseDate(value);
  if (parsed === null) return false;
  const from = parseDate(filter.from ?? '');
  const to = parseDate(filter.to ?? '');
  return (from === null || parsed >= from) && (to === null || parsed <= to);
}

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withoutCurrency = trimmed.replace(/^[\s$£€]+/, '').replace(/%\s*$/, '').trim();
  const numberText = withoutCurrency.replace(/,/g, '');
  if (/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(withoutCurrency)) {
    const parsed = Number(numberText);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseDate(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|[A-Za-z]{3,}\s+\d{1,2},?\s+\d{4}/.test(trimmed)) {
    const timestamp = Date.parse(trimmed);
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

function alignmentFor(cell: Element): TableCellProjection['align'] {
  const align = cell.getAttribute('align')?.toLowerCase();
  return align === 'center' || align === 'right' ? align : 'left';
}

function isTableCell(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'th' || tag === 'td';
}

function normalizeCellText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}
