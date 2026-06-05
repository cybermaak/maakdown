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

export interface VisibleRange {
  startBlockId: string | null;
  endBlockId: string | null;
}

export interface ReaderPosition {
  anchorId?: string;
  blockId?: string;
}

export function getActiveHeading(model: DocumentModel, visibleRange: VisibleRange): string | null {
  if (!visibleRange.startBlockId) {
    return model.headings[0]?.id ?? null;
  }

  const startIndex = model.blocks.findIndex((block) => block.id === visibleRange.startBlockId);
  if (startIndex < 0) {
    return model.headings[0]?.id ?? null;
  }

  let active = model.headings[0]?.id ?? null;
  for (const heading of model.headings) {
    const blockIndex = model.blocks.findIndex((block) => block.id === heading.blockId);
    if (blockIndex <= startIndex) {
      active = heading.id;
    } else {
      break;
    }
  }
  return active;
}

export function restorePosition(model: DocumentModel, previous: ReaderPosition): NavigationTarget | null {
  if (previous.anchorId) {
    const anchor = resolveAnchor(model, previous.anchorId);
    if (anchor) {
      return anchor;
    }
  }

  if (previous.blockId && model.blocks.some((block) => block.id === previous.blockId)) {
    return {
      blockId: previous.blockId,
      anchorId: previous.anchorId ?? previous.blockId
    };
  }

  const first = model.blocks[0];
  if (!first) {
    return null;
  }

  return {
    blockId: first.id,
    anchorId: first.id
  };
}

export function isInternalHref(href: string): boolean {
  return href.startsWith('#') && href.length > 1;
}

export function anchorIdFromHref(href: string): string {
  return decodeURIComponent(href.replace(/^#/, ''));
}
