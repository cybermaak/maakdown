<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Search, X } from '@lucide/svelte';
  import type { Block } from '../core/model/types';
  import {
    defaultTableInteractionState,
    isDefaultTableInteractionState,
    nextSortDirection,
    projectTable,
    visibleTableRows,
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
  let filterActive = $derived(tableState.filter.trim().length > 0);
  let sortActive = $derived(tableState.sortColumn !== null && tableState.sortDirection !== 'none');
  let activeFilterColumn = $derived(tableState.filterColumn ?? null);
  let activeFilterLabel = $derived(columnLabel(activeFilterColumn));
  let activeSortLabel = $derived(columnLabel(tableState.sortColumn));
  let activeSortDirection = $derived(tableState.sortDirection === 'desc' ? 'descending' : 'ascending');
  let rowSummary = $derived(filterActive ? `${visibleRows.length} of ${projection?.rowCount ?? 0} rows match` : `${projection?.rowCount ?? 0} rows`);
  let filterPanelVisible = $derived(controlsVisible && openFilterColumn !== null);
  let tableToolsVisible = $derived(controlsVisible && (filterPanelVisible || filterActive || sortActive));

  function update(next: TableInteractionState) {
    onStateChange?.(block.id, isDefaultTableInteractionState(next) ? null : next);
  }

  function applyColumnFilter(column: number, value: string) {
    update({ ...tableState, filter: value, filterColumn: value ? column : null });
  }

  function applyOpenColumnFilter(value: string) {
    if (openFilterColumn !== null) applyColumnFilter(openFilterColumn, value);
  }

  function clearFilter() {
    update({ ...tableState, filter: '', filterColumn: null });
    openFilterColumn = null;
  }

  function clearSort() {
    update({ ...tableState, sortColumn: null, sortDirection: 'none' });
  }

  function clearAll() {
    update(defaultTableInteractionState());
    openFilterColumn = null;
  }

  function sort(column: number) {
    update(nextSortDirection(tableState, column));
  }

  function toggleFilter(column: number) {
    openFilterColumn = openFilterColumn === column ? null : column;
  }

  function columnLabel(column: number | null | undefined): string {
    if (column === null || column === undefined) return 'All columns';
    return projection?.headers[column]?.text || `Column ${column + 1}`;
  }

  function sortLabel(column: number): string {
    const label = projection?.headers[column]?.text || `Column ${column + 1}`;
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

  function filterLabel(column: number): string {
    const label = columnLabel(column);
    return activeFilterColumn === column && filterActive ? `Change ${label} filter` : `Filter ${label}`;
  }

  function filterValue(column: number): string {
    return activeFilterColumn === column ? tableState.filter : '';
  }

  function rowPreview(row: { cells: Array<{ text: string }> }): string {
    return row.cells.map((cell) => cell.text).filter(Boolean).join(' · ');
  }

  function filterKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      openFilterColumn = null;
      event.stopPropagation();
    }
  }

  function cellHtml(cell: { html?: string } | undefined): string {
    return cell?.html ?? '';
  }

  function alignStyle(cell: { align?: string } | undefined): string {
    return `text-align: ${cell?.align ?? 'left'}`;
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
      {#if openFilterColumn !== null && projection}
        <div class="table-filter-panel" role="group" aria-label={`Filter ${columnLabel(openFilterColumn)}`}>
          <div class="table-filter-copy">
            <span>Filter {columnLabel(openFilterColumn)}</span>
            <small aria-live="polite">{rowSummary}</small>
          </div>
          <label class="table-filter">
            <Search size={14} aria-hidden="true" />
            <span class="sr-only">Filter {columnLabel(openFilterColumn)} column</span>
            <input
              value={filterValue(openFilterColumn)}
              type="search"
              placeholder="Contains..."
              aria-label={`Filter ${columnLabel(openFilterColumn)} column`}
              oninput={(event) => applyOpenColumnFilter(event.currentTarget.value)}
              onkeydown={filterKeydown}
            />
          </label>
          {#if filterValue(openFilterColumn)}
            <div class="table-filter-preview">
              {#if visibleRows.length}
                {#each visibleRows.slice(0, 3) as row}
                  <span>{rowPreview(row)}</span>
                {/each}
              {:else}
                <span>No rows match this filter.</span>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      {#if filterActive || sortActive}
        <div class="table-chip-row">
          {#if sortActive}
            <span class="table-chip">
              <ArrowUpDown size={13} aria-hidden="true" />
              <span>{activeSortLabel}: {activeSortDirection}</span>
              <button type="button" aria-label="Clear table sort" onclick={clearSort}><X size={12} aria-hidden="true" /></button>
            </span>
          {/if}
          {#if filterActive}
            <span class="table-chip">
              <ListFilter size={13} aria-hidden="true" />
              <span>{activeFilterLabel}: "{tableState.filter.trim()}"</span>
              <button type="button" aria-label="Clear table filter" onclick={clearFilter}><X size={12} aria-hidden="true" /></button>
            </span>
          {/if}
          <span class="table-row-count" aria-live="polite">{rowSummary}</span>
          <button type="button" class="table-clear-all" aria-label="Clear table controls" onclick={clearAll}>Clear all</button>
        </div>
      {/if}
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
              <th style={alignStyle(cell)} aria-sort={sortAria(index)}>
                {#if projection.interactive}
                  <span class="table-header-content">
                    <span class="table-header-label">{@html cellHtml(cell)}</span>
                    <span class="table-header-actions" class:active={sortIcon(index) !== 'none' || (activeFilterColumn === index && filterActive)}>
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
                        class:active={activeFilterColumn === index && filterActive}
                        aria-label={filterLabel(index)}
                        aria-expanded={openFilterColumn === index}
                        onclick={() => toggleFilter(index)}
                      >
                        <ListFilter size={13} aria-hidden="true" />
                      </button>
                    </span>
                  </span>
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
              <span>No rows match "{tableState.filter.trim()}".</span>
              <button type="button" onclick={clearFilter}>Clear filter</button>
            </td>
          </tr>
        {/if}
      </tbody>
    </table>
  {:else}
    {@html block.html}
  {/if}
</div>
