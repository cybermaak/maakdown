<script lang="ts">
  import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from '@lucide/svelte';
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

  let { block, constrained = false, columnSizing = 'balanced', state, onStateChange, printMode = false }: Props = $props();
  let projection = $derived(projectTable(block.html, { columnSizing }));
  let tableState = $derived(state ?? defaultTableInteractionState());
  let visibleRows = $derived(projection ? visibleTableRows(projection, tableState) : []);
  let controlsVisible = $derived(Boolean(projection?.interactive && !printMode));

  function update(next: TableInteractionState) {
    onStateChange?.(block.id, isDefaultTableInteractionState(next) ? null : next);
  }

  function filter(value: string) {
    update({ ...tableState, filter: value });
  }

  function clearFilter() {
    update({ ...tableState, filter: '' });
  }

  function sort(column: number) {
    update(nextSortDirection(tableState, column));
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
  {#if controlsVisible}
    <div class="table-tools" aria-label="Table tools">
      <label class="table-filter">
        <Search size={14} aria-hidden="true" />
        <span class="sr-only">Filter table rows</span>
        <input
          value={tableState.filter}
          type="search"
          placeholder="Filter rows"
          aria-label="Filter table rows"
          oninput={(event) => filter(event.currentTarget.value)}
        />
      </label>
      {#if tableState.filter}
        <button type="button" class="table-tool-button" aria-label="Clear table filter" onclick={clearFilter}>
          <X size={14} aria-hidden="true" />
        </button>
      {/if}
      <span class="table-row-count" aria-live="polite">{visibleRows.length} / {projection?.rowCount ?? 0} rows</span>
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
                  <button type="button" class="table-sort-button" aria-label={sortLabel(index)} onclick={() => sort(index)}>
                    <span>{@html cellHtml(cell)}</span>
                    {#if sortIcon(index) === 'asc'}
                      <ArrowUp class="table-sort-icon active" size={14} aria-hidden="true" />
                    {:else if sortIcon(index) === 'desc'}
                      <ArrowDown class="table-sort-icon active" size={14} aria-hidden="true" />
                    {:else}
                      <ArrowUpDown class="table-sort-icon" size={14} aria-hidden="true" />
                    {/if}
                  </button>
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
            <td class="table-empty" colspan={projection.columnCount}>No matching rows</td>
          </tr>
        {/if}
      </tbody>
    </table>
  {:else}
    {@html block.html}
  {/if}
</div>
