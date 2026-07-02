export type TableColumnSizing = 'balanced' | 'equal';
export type TableSortDirection = 'none' | 'asc' | 'desc';

export interface TableCellProjection {
  html: string;
  text: string;
  align: 'left' | 'center' | 'right';
}

export interface TableProjection {
  headers: TableCellProjection[];
  rows: TableCellProjection[][];
  columnCount: number;
  rowCount: number;
  hasHeader: boolean;
  interactive: boolean;
  disabledReason?: 'no-header' | 'empty' | 'span' | 'too-large';
  columnWidths: number[];
}

export interface TableInteractionState {
  filter: string;
  filterColumn?: number | null;
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
  return { filter: '', filterColumn: null, sortColumn: null, sortDirection: 'none' };
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
    columnCount,
    rowCount: rows.length,
    hasHeader,
    interactive: !disabledReason,
    disabledReason,
    columnWidths: columnWidths(headers, rows, options.columnSizing ?? 'balanced', options.sampleRows ?? DEFAULTS.sampleRows)
  };
}

export function visibleTableRows(projection: TableProjection, state: TableInteractionState): TableVisibleRow[] {
  const filter = normalizeSearch(state.filter);
  let rows = projection.rows.map((cells, originalIndex) => ({ originalIndex, cells }));
  if (filter) {
    const filterColumn = state.filterColumn ?? null;
    rows = rows.filter((row) => {
      const text = filterColumn === null ? row.cells.map((cell) => cell.text).join(' ') : row.cells[filterColumn]?.text ?? '';
      return normalizeSearch(text).includes(filter);
    });
  }
  if (state.sortColumn !== null && state.sortDirection !== 'none') {
    const column = state.sortColumn;
    const direction = state.sortDirection === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const compared = compareCellValues(a.cells[column]?.text ?? '', b.cells[column]?.text ?? '');
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
  return !state.filter && (state.filterColumn ?? null) === null && state.sortColumn === null && state.sortDirection === 'none';
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

function compareCellValues(left: string, right: string): number {
  const a = comparableValue(left);
  const b = comparableValue(right);
  if (a.kind === b.kind && a.kind !== 'text') {
    return a.value === b.value ? 0 : a.value < b.value ? -1 : 1;
  }
  return collator.compare(left.trim(), right.trim());
}

function comparableValue(value: string): { kind: 'number' | 'date' | 'text'; value: number } {
  const trimmed = value.trim();
  const numberText = trimmed.replace(/[$£€,%\s]/g, '');
  if (/^[+-]?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(trimmed.replace(/[$£€%\s]/g, ''))) {
    const parsed = Number(numberText);
    if (Number.isFinite(parsed)) return { kind: 'number', value: parsed };
  }
  if (/\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|[A-Za-z]{3,}\s+\d{1,2},?\s+\d{4}/.test(trimmed)) {
    const timestamp = Date.parse(trimmed);
    if (Number.isFinite(timestamp)) return { kind: 'date', value: timestamp };
  }
  return { kind: 'text', value: 0 };
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
