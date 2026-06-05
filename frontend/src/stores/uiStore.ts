import { writable } from 'svelte/store';

export interface UIState {
  activeHeadingId: string | null;
  metadataPanelOpen: boolean;
}

export const uiStore = writable<UIState>({
  activeHeadingId: null,
  metadataPanelOpen: true
});
