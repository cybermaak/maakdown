<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search, X } from '@lucide/svelte';
  import type { Block } from '../core/model/types';
  import {
    activeFilterEntries,
    defaultTableInteractionState,
    filterForColumnType,
    isActiveTableFilter,
    isDefaultTableInteractionState,
    nextSortDirection,
    projectTable,
    visibleTableRows,
    type TableCellProjection,
    type TableColumnFilter,
    type TableColumnProjection,
    type TableColumnSizing,
    type TableInteractionState,
    type TableSortDirection
  } from '../core/tables/tableProjection';

  interface Props {
    block: Block;
    constrained?: boolean;
    columnSizing?: TableColumnSizing;
    state?: TableInteractionState;
    onStateChange?: (blockId: string, state: TableInteractionState | null) => void;
    printMode?: boolean;
  }

  let { block, constrained = false, columnSizing = 'balanced', state: interactionState, onStateChange, printMode = false }: Props = $props();
  let projection = $derived(projectTable(block.html, { columnSizing }));
  let tableState = $derived(interactionState ?? defaultTableInteractionState());
  let visibleRows = $derived(projection ? visibleTableRows(projection, tableState) : []);
  let controlsVisible = $derived(Boolean(projection?.interactive && !printMode));
  let openFilterColumn = $state<number | null>(null);
  let pendingFilter = $state<TableColumnFilter | null>(null);
  let enumSearch = $state('');
  let filterPopover = $state<HTMLElement | undefined>();
  let activeFilters = $derived(
    projection
      ? activeFilterEntries(tableState).filter(([column]) => column >= 0 && column < projection.columnCount)
      : []
  );
  let filterActive = $derived(activeFilters.length > 0);
  let sortActive = $derived(tableState.sortColumn !== null && tableState.sortDirection !== 'none');
  let activeSortLabel = $derived(columnLabel(tableState.sortColumn));
  let activeSortDirection = $derived(tableState.sortDirection === 'desc' ? 'descending' : 'ascending');
  let rowSummary = $derived(filterActive ? `${visibleRows.length} of ${projection?.rowCount ?? 0} rows match` : `${projection?.rowCount ?? 0} rows`);
  let tableToolsVisible = $derived(controlsVisible && (filterActive || sortActive));
  let pendingState = $derived(
    openFilterColumn !== null && pendingFilter
      ? stateWithPendingFilter(tableState, openFilterColumn, pendingFilter)
      : tableState
  );
  let prospectiveRows = $derived(projection ? visibleTableRows(projection, pendingState) : []);
  let openColumn = $derived(openFilterColumn !== null ? projection?.columns[openFilterColumn] : undefined);

  $effect(() => {
    if (openFilterColumn === null) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (filterPopover?.contains(target)) return;
      if (target.closest('[data-table-filter-trigger]')) return;
      closeFilter();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  });

  function update(next: TableInteractionState) {
    onStateChange?.(block.id, isDefaultTableInteractionState(next) ? null : next);
  }

  function sort(column: number) {
    update(nextSortDirection(tableState, column));
  }

  function clearSort() {
    update({ ...tableState, sortColumn: null, sortDirection: 'none' });
  }

  function clearAll() {
    update(defaultTableInteractionState());
    closeFilter();
  }

  function openFilter(column: number) {
    if (openFilterColumn === column) {
      closeFilter();
      return;
    }
    const tableColumn = projection?.columns[column];
    if (!tableColumn) return;
    const existing = tableState.filters?.[String(column)];
    openFilterColumn = column;
    pendingFilter = existing && existing.kind === filterForColumnType(tableColumn.type).kind
      ? cloneFilter(existing)
      : filterForColumnType(tableColumn.type);
    enumSearch = '';
  }

  function closeFilter() {
    openFilterColumn = null;
    pendingFilter = null;
    enumSearch = '';
  }

  function applyPendingFilter() {
    if (openFilterColumn === null || !pendingFilter) return;
    update(stateWithPendingFilter(tableState, openFilterColumn, pendingFilter));
    closeFilter();
  }

  function clearColumnFilter(column: number | null = openFilterColumn) {
    if (column === null) return;
    const filters = { ...(tableState.filters ?? {}) };
    delete filters[String(column)];
    update({ ...tableState, filters });
    closeFilter();
  }

  function stateWithPendingFilter(state: TableInteractionState, column: number, filter: TableColumnFilter): TableInteractionState {
    const filters = { ...(state.filters ?? {}) };
    if (isActiveTableFilter(filter)) {
      filters[String(column)] = cloneFilter(filter);
    } else {
      delete filters[String(column)];
    }
    return { ...state, filters };
  }

  function cloneFilter(filter: TableColumnFilter): TableColumnFilter {
    if (filter.kind === 'enum') return { kind: 'enum', selected: [...filter.selected] };
    return { ...filter };
  }

  function setTextQuery(value: string) {
    if (pendingFilter?.kind === 'text') pendingFilter = { ...pendingFilter, query: value };
  }

  function setNumberBound(key: 'min' | 'max', value: string) {
    if (pendingFilter?.kind === 'number') pendingFilter = { ...pendingFilter, [key]: value };
  }

  function setDateBound(key: 'from' | 'to', value: string) {
    if (pendingFilter?.kind === 'date') pendingFilter = { ...pendingFilter, [key]: value };
  }

  function toggleEnumValue(value: string, checked: boolean) {
    if (pendingFilter?.kind !== 'enum') return;
    const selected = new Set(pendingFilter.selected);
    if (checked) {
      selected.add(value);
    } else {
      selected.delete(value);
    }
    pendingFilter = { ...pendingFilter, selected: [...selected] };
  }

  function enumValueChecked(value: string): boolean {
    return pendingFilter?.kind === 'enum' && pendingFilter.selected.includes(value);
  }

  function enumOptions(column: TableColumnProjection | undefined) {
    if (!column) return [];
    const query = normalize(enumSearch);
    return column.distinctValues.filter((option) => !query || normalize(option.label).includes(query));
  }

  function columnLabel(column: number | null | undefined): string {
    if (column === null || column === undefined) return 'All columns';
    return projection?.headers[column]?.text || `Column ${column + 1}`;
  }

  function sortLabel(column: number): string {
    const label = columnLabel(column);
    if (tableState.sortColumn !== column || tableState.sortDirection === 'none') return `Sort ${label} ascending`;
    if (tableState.sortDirection === 'asc') return `Sort ${label} descending`;
    return `Restore ${label} source order`;
  }

  function sortAria(column: number): 'none' | 'ascending' | 'descending' {
    if (tableState.sortColumn !== column) return 'none';
    if (tableState.sortDirection === 'asc') return 'ascending';
    if (tableState.sortDirection === 'desc') return 'descending';
    return 'none';
  }

  function sortIcon(column: number): TableSortDirection {
    return tableState.sortColumn === column ? tableState.sortDirection : 'none';
  }

  function columnHasFilter(column: number): boolean {
    return isActiveTableFilter(tableState.filters?.[String(column)]);
  }

  function filterLabel(column: number): string {
    const label = columnLabel(column);
    return columnHasFilter(column) ? `Change ${label} filter` : `Filter ${label}`;
  }

  function filterSummary(column: number, filter: TableColumnFilter): string {
    const label = columnLabel(column);
    const tableColumn = projection?.columns[column];
    if (filter.kind === 'enum') {
      const labels = filter.selected.map((value) => tableColumn?.distinctValues.find((item) => item.value === value)?.label ?? value);
      const visible = labels.slice(0, 2).join(', ');
      const extra = labels.length > 2 ? ` +${labels.length - 2}` : '';
      return `${label}: ${visible}${extra}`;
    }
    if (filter.kind === 'number') {
      return `${label}: ${filter.min || 'min'}-${filter.max || 'max'}`;
    }
    if (filter.kind === 'date') {
      return `${label}: ${filter.from || 'from'}-${filter.to || 'to'}`;
    }
    return `${label} contains "${filter.query.trim()}"`;
  }

  function filterTypeLabel(column: TableColumnProjection | undefined): string {
    if (!column) return 'Filter';
    if (column.type === 'enum') return 'Value checklist';
    if (column.type === 'number') return 'Number range';
    if (column.type === 'date') return 'Date range';
    return 'Contains';
  }

  function popoverAlignRight(column: number): boolean {
    return Boolean(projection && column >= Math.max(0, projection.columnCount - 2));
  }

  function textPreviewRows(): Array<{ html: string; title: string }> {
    if (!openColumn || pendingFilter?.kind !== 'text') return [];
    const query = pendingFilter.query.trim();
    if (!query) return [];
    return prospectiveRows.slice(0, 4).map((row) => {
      const value = row.cells[openColumn.index]?.text ?? '';
      return { html: highlightContains(value, query), title: value };
    });
  }

  function filterKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeFilter();
      event.stopPropagation();
    }
  }

  function cellHtml(cell: TableCellProjection | undefined): string {
    return cell?.html ?? '';
  }

  function alignStyle(cell: TableCellProjection | undefined): string {
    return `text-align: ${cell?.align ?? 'left'}`;
  }

  function normalize(value: string): string {
    return value.trim().toLocaleLowerCase();
  }

  function escapeHtml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  }

  function highlightContains(value: string, query: string): string {
    const normalizedValue = value.toLocaleLowerCase();
    const normalizedQuery = query.toLocaleLowerCase();
    const index = normalizedValue.indexOf(normalizedQuery);
    if (index < 0 || !query) return escapeHtml(value);
    return `${escapeHtml(value.slice(0, index))}<mark>${escapeHtml(value.slice(index, index + query.length))}</mark>${escapeHtml(value.slice(index + query.length))}`;
  }
</script>

<div
  class="table-shell"
  class:table-constrained={constrained}
  class:table-wide={!constrained}
  class:table-projected={Boolean(projection)}
  data-table-disabled-reason={projection?.disabledReason}
>
  {#if tableToolsVisible}
    <div class="table-tools" aria-label="Table tools">
      <div class="table-chip-row">
        {#if sortActive}
          <span class="table-chip">
            <ArrowUpDown size={13} aria-hidden="true" />
            <span>{activeSortLabel}: {activeSortDirection}</span>
            <button type="button" aria-label="Clear table sort" onclick={clearSort}><X size={12} aria-hidden="true" /></button>
          </span>
        {/if}
        {#each activeFilters as [column, filter]}
          <span class="table-chip">
            <ListFilter size={13} aria-hidden="true" />
            <span>{filterSummary(column, filter)}</span>
            <button type="button" aria-label={`Remove ${columnLabel(column)} filter`} onclick={() => clearColumnFilter(column)}><X size={12} aria-hidden="true" /></button>
          </span>
        {/each}
        <span class="table-row-count" aria-live="polite">{rowSummary}</span>
        <button type="button" class="table-clear-all" aria-label="Clear all table controls" onclick={clearAll}>Clear all</button>
      </div>
    </div>
  {/if}

  {#if projection && !printMode}
    <table class="reader-table">
      <colgroup>
        {#each projection.columnWidths as width}
          <col style={`width: ${width}%`} />
        {/each}
      </colgroup>
      {#if projection.hasHeader}
        <thead>
          <tr>
            {#each projection.headers as cell, index}
              <th class:table-header-active={sortIcon(index) !== 'none' || columnHasFilter(index)} style={alignStyle(cell)} aria-sort={sortAria(index)}>
                {#if projection.interactive}
                  <span class="table-header-content">
                    <span class="table-header-label">{@html cellHtml(cell)}</span>
                    <span class="table-header-actions" class:active={sortIcon(index) !== 'none' || columnHasFilter(index) || openFilterColumn === index}>
                      <button type="button" class="table-sort-button" aria-label={sortLabel(index)} onclick={() => sort(index)}>
                        {#if sortIcon(index) === 'asc'}
                          <ArrowUp class="table-sort-icon active" size={14} aria-hidden="true" />
                        {:else if sortIcon(index) === 'desc'}
                          <ArrowDown class="table-sort-icon active" size={14} aria-hidden="true" />
                        {:else}
                          <ArrowUpDown class="table-sort-icon" size={14} aria-hidden="true" />
                        {/if}
                      </button>
                      <button
                        type="button"
                        class="table-filter-button"
                        class:active={columnHasFilter(index) || openFilterColumn === index}
                        aria-label={filterLabel(index)}
                        aria-expanded={openFilterColumn === index}
                        data-table-filter-trigger
                        onclick={() => openFilter(index)}
                      >
                        <ListFilter size={13} aria-hidden="true" />
                      </button>
                    </span>
                  </span>
                  {#if openFilterColumn === index && openColumn && pendingFilter}
                    <div
                      bind:this={filterPopover}
                      class="table-filter-popover"
                      class:align-right={popoverAlignRight(index)}
                      role="dialog"
                      aria-label={`Filter ${columnLabel(index)}`}
                      tabindex="-1"
                      onkeydown={filterKeydown}
                    >
                      <div class="table-filter-copy">
                        <span>Filter · {columnLabel(index)}</span>
                        <small>{filterTypeLabel(openColumn)}</small>
                      </div>

                      {#if pendingFilter.kind === 'enum'}
                        <label class="table-filter">
                          <Search size={14} aria-hidden="true" />
                          <span class="sr-only">Find {columnLabel(index)} values</span>
                          <input
                            value={enumSearch}
                            type="search"
                            placeholder="Find value..."
                            aria-label={`Find ${columnLabel(index)} values`}
                            oninput={(event) => (enumSearch = event.currentTarget.value)}
                          />
                        </label>
                        <div class="table-value-list" role="group" aria-label={`${columnLabel(index)} values`}>
                          {#each enumOptions(openColumn) as option}
                            <label class="table-value-option" title={option.label}>
                              <input
                                type="checkbox"
                                checked={enumValueChecked(option.value)}
                                onchange={(event) => toggleEnumValue(option.value, event.currentTarget.checked)}
                              />
                              <span>{option.label}</span>
                              <small>{option.count}</small>
                            </label>
                          {/each}
                        </div>
                      {:else if pendingFilter.kind === 'text'}
                        <label class="table-filter">
                          <Search size={14} aria-hidden="true" />
                          <span class="sr-only">Filter {columnLabel(index)} column</span>
                          <input
                            value={pendingFilter.query}
                            type="search"
                            placeholder="Contains..."
                            aria-label={`Filter ${columnLabel(index)} column`}
                            oninput={(event) => setTextQuery(event.currentTarget.value)}
                          />
                        </label>
                        {#if pendingFilter.query.trim()}
                          <div class="table-filter-preview">
                            <strong>Matching rows</strong>
                            {#if textPreviewRows().length}
                              {#each textPreviewRows() as preview}
                                <span title={preview.title}>{@html preview.html}</span>
                              {/each}
                            {:else}
                              <span>No rows match this filter.</span>
                            {/if}
                          </div>
                        {/if}
                      {:else if pendingFilter.kind === 'number'}
                        <div class="table-range-grid">
                          <label>
                            <span>Min</span>
                            <input value={pendingFilter.min ?? ''} inputmode="decimal" aria-label={`Minimum ${columnLabel(index)}`} oninput={(event) => setNumberBound('min', event.currentTarget.value)} />
                          </label>
                          <label>
                            <span>Max</span>
                            <input value={pendingFilter.max ?? ''} inputmode="decimal" aria-label={`Maximum ${columnLabel(index)}`} oninput={(event) => setNumberBound('max', event.currentTarget.value)} />
                          </label>
                        </div>
                      {:else}
                        <div class="table-range-grid">
                          <label>
                            <span>From</span>
                            <input value={pendingFilter.from ?? ''} aria-label={`From ${columnLabel(index)}`} placeholder="YYYY-MM-DD" oninput={(event) => setDateBound('from', event.currentTarget.value)} />
                          </label>
                          <label>
                            <span>To</span>
                            <input value={pendingFilter.to ?? ''} aria-label={`To ${columnLabel(index)}`} placeholder="YYYY-MM-DD" oninput={(event) => setDateBound('to', event.currentTarget.value)} />
                          </label>
                        </div>
                      {/if}

                      <div class="table-filter-footer">
                        <span aria-live="polite">{prospectiveRows.length} of {projection.rowCount} rows match</span>
                        <button type="button" class="table-filter-secondary" onclick={() => clearColumnFilter(index)}>Clear</button>
                        <button type="button" class="table-filter-apply" onclick={applyPendingFilter}>Apply</button>
                      </div>
                    </div>
                  {/if}
                {:else}
                  {@html cellHtml(cell)}
                {/if}
              </th>
            {/each}
          </tr>
        </thead>
      {/if}
      <tbody>
        {#if visibleRows.length}
          {#each visibleRows as row (row.originalIndex)}
            <tr>
              {#each row.cells as cell}
                <td style={alignStyle(cell)}>{@html cellHtml(cell)}</td>
              {/each}
            </tr>
          {/each}
        {:else}
          <tr>
            <td class="table-empty" colspan={projection.columnCount}>
              <span>No rows match the current filters.</span>
              <button type="button" onclick={clearAll}>Clear filters</button>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  {:else}
    {@html block.html}
  {/if}
</div>
