import { writable } from 'svelte/store';
import type { DocumentModel } from '../core/model/types';

export interface DocumentState {
  model: DocumentModel | null;
  path: string | null;
  loading: boolean;
  error: string | null;
}

export const documentStore = writable<DocumentState>({
  model: null,
  path: null,
  loading: false,
  error: null
});

export function setDocument(path: string, model: DocumentModel): void {
  documentStore.set({
    model,
    path,
    loading: false,
    error: null
  });
}
