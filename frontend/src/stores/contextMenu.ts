import { writable } from 'svelte/store';

export interface ContextMenuItem {
  /** Visible label. Omit for a separator. */
  label?: string;
  onSelect?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** Renders a divider instead of an actionable row. */
  separator?: boolean;
}

export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const initial: ContextMenuState = { open: false, x: 0, y: 0, items: [] };

export const contextMenu = writable<ContextMenuState>(initial);

export function openContextMenu(items: ContextMenuItem[], x: number, y: number): void {
  const actionable = items.filter((item) => item.separator || item.label);
  if (actionable.length === 0) return;
  contextMenu.set({ open: true, x, y, items: actionable });
}

export function closeContextMenu(): void {
  contextMenu.update((state) => (state.open ? { ...initial } : state));
}
