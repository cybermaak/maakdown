<script lang="ts">
  import { tick } from 'svelte';
  import { closeContextMenu, contextMenu, type ContextMenuItem } from '../stores/contextMenu';

  let menuEl = $state<HTMLDivElement | undefined>();
  let position = $state({ x: 0, y: 0 });

  // Reposition within the viewport and wire dismissal whenever the menu opens.
  $effect(() => {
    if (!$contextMenu.open) return;
    position = { x: $contextMenu.x, y: $contextMenu.y };

    // Preserve an active text selection: focusing a menu item would clear the
    // highlight, so mouse-driven selection menus keep focus on the document.
    const hasSelection = Boolean(window.getSelection()?.toString());

    const dismissOnPointer = (event: PointerEvent) => {
      if (!menuEl?.contains(event.target as Node)) closeContextMenu();
    };
    const dismissOnScroll = () => closeContextMenu();
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeContextMenu();
      }
    };
    window.addEventListener('pointerdown', dismissOnPointer, true);
    window.addEventListener('resize', dismissOnScroll);
    window.addEventListener('blur', dismissOnScroll);
    window.addEventListener('keydown', dismissOnEscape);

    void tick().then(() => {
      if (!menuEl) return;
      const rect = menuEl.getBoundingClientRect();
      const margin = 8;
      let { x, y } = position;
      if (x + rect.width > window.innerWidth - margin) x = Math.max(margin, window.innerWidth - rect.width - margin);
      if (y + rect.height > window.innerHeight - margin) y = Math.max(margin, window.innerHeight - rect.height - margin);
      position = { x, y };
      if (!hasSelection) menuEl.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')?.focus();
    });

    return () => {
      window.removeEventListener('pointerdown', dismissOnPointer, true);
      window.removeEventListener('resize', dismissOnScroll);
      window.removeEventListener('blur', dismissOnScroll);
      window.removeEventListener('keydown', dismissOnEscape);
    };
  });

  function select(item: ContextMenuItem) {
    if (item.disabled || item.separator) return;
    closeContextMenu();
    item.onSelect?.();
  }

  function actionableIndexes(): number[] {
    return $contextMenu.items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.separator && !item.disabled)
      .map(({ index }) => index);
  }

  function moveFocus(event: KeyboardEvent, currentIndex: number, direction: 1 | -1) {
    event.preventDefault();
    const indexes = actionableIndexes();
    if (indexes.length === 0) return;
    const pos = indexes.indexOf(currentIndex);
    const nextIndex = indexes[(pos + direction + indexes.length) % indexes.length];
    menuEl?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')?.[nextIndex]?.focus();
  }

  function handleKeydown(event: KeyboardEvent, index: number) {
    if (event.key === 'ArrowDown') moveFocus(event, index, 1);
    else if (event.key === 'ArrowUp') moveFocus(event, index, -1);
    else if (event.key === 'Escape') {
      event.preventDefault();
      closeContextMenu();
    }
  }
</script>

{#if $contextMenu.open}
  <div
    class="context-menu"
    role="menu"
    tabindex="-1"
    bind:this={menuEl}
    style={`left:${position.x}px; top:${position.y}px`}
    oncontextmenu={(event) => event.preventDefault()}
  >
    {#each $contextMenu.items as item, index}
      {#if item.separator}
        <div class="context-menu-separator" role="separator"></div>
      {:else}
        <button
          type="button"
          role="menuitem"
          class="context-menu-item"
          class:danger={item.danger}
          disabled={item.disabled}
          tabindex="-1"
          onclick={() => select(item)}
          onkeydown={(event) => handleKeydown(event, index)}
        >
          {item.label}
        </button>
      {/if}
    {/each}
  </div>
{/if}
