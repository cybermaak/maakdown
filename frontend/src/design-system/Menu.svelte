<script lang="ts" generics="T extends { label?: string; separator?: boolean; disabled?: boolean; danger?: boolean }">
  interface Props<T> {
    items: T[];
    label?: string;
    onselect: (item: T, index: number) => void;
    onitemkeydown?: (event: KeyboardEvent, index: number) => void;
  }

  let { items, label = 'Menu', onselect, onitemkeydown }: Props<T> = $props();
</script>

<div class="ds-menu" role="menu" tabindex="-1" aria-label={label}>
  {#each items as item, index}
    {#if item.separator}
      <div class="ds-menu-separator" role="separator"></div>
    {:else}
      <button
        type="button"
        role="menuitem"
        class="ds-menu-item"
        class:danger={item.danger}
        disabled={item.disabled}
        tabindex="-1"
        onclick={() => onselect(item, index)}
        onkeydown={(event) => onitemkeydown?.(event, index)}
      >
        {item.label}
      </button>
    {/if}
  {/each}
</div>
