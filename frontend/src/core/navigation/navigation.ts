import type { DocumentModel } from '../model/types';

export interface NavigationTarget {
  blockId: string;
  anchorId: string;
}

export function resolveAnchor(model: DocumentModel, anchorId: string): NavigationTarget | null {
  const target = model.anchors[anchorId];
  if (!target) {
    return null;
  }

  return {
    blockId: target.blockId,
    anchorId
  };
}
