import { OpenDocument, OpenDocumentAt, ReadDocument } from '../../wailsjs/go/fileservice/Service';
import { GetConfig, GetSession, SetConfig, SetSession } from '../../wailsjs/go/config/Service';
import { ResolveAsset, RevokeAsset } from '../../wailsjs/go/assetservice/Service';
import { OpenExternal } from '../../wailsjs/go/linkservice/Service';
import { UnwatchDocument, WatchDocument } from '../../wailsjs/go/watcher/Service';
import { Print, Quit, SetWindowTitle } from '../../wailsjs/go/main/App';
import { GetVaultIndex } from '../../wailsjs/go/vault/Service';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import { config } from '../../wailsjs/go/models';
import type { assetservice, fileservice, vault } from '../../wailsjs/go/models';
import type { AppConfig } from '../stores/configStore';
import type { PersistedSession } from '../core/workspace/workspace';

export async function openDocument(): Promise<fileservice.OpenDocumentResult> {
  return OpenDocument();
}

export async function openDocumentAt(path: string): Promise<fileservice.OpenDocumentResult> {
  return OpenDocumentAt(path);
}

export async function readDocument(path: string): Promise<fileservice.DocumentBytes> {
  return ReadDocument(path);
}

export async function getConfig(): Promise<AppConfig> {
  const result = (await GetConfig()) as config.AppConfig;
  return {
    theme: normalizeTheme(result.theme),
    highlighterEngine: result.highlighterEngine === 'shiki-js-regex' ? 'shiki-js-regex' : 'highlightjs',
    frontmatterDisplay: result.frontmatterDisplay === 'hidden' ? 'hidden' : 'panel',
    readerTheme: 'editorial',
    readerFont: result.readerFont === 'serif' ? 'serif' : 'sans',
    readerFontSize: result.readerFontSize >= 13 && result.readerFontSize <= 22 ? result.readerFontSize : 15,
    readerLineHeight: result.readerLineHeight === 'compact' || result.readerLineHeight === 'relaxed' ? result.readerLineHeight : 'comfortable',
    readerMeasure: result.readerMeasure === 'narrow' || result.readerMeasure === 'wide' ? result.readerMeasure : 'standard',
    focusMode: Boolean(result.focusMode)
  };
}

export async function setConfig(next: AppConfig): Promise<AppConfig> {
  const result = (await SetConfig(next)) as config.AppConfig;
  return {
    theme: normalizeTheme(result.theme),
    highlighterEngine: result.highlighterEngine === 'shiki-js-regex' ? 'shiki-js-regex' : 'highlightjs',
    frontmatterDisplay: result.frontmatterDisplay === 'hidden' ? 'hidden' : 'panel',
    readerTheme: 'editorial',
    readerFont: result.readerFont === 'serif' ? 'serif' : 'sans',
    readerFontSize: result.readerFontSize >= 13 && result.readerFontSize <= 22 ? result.readerFontSize : 15,
    readerLineHeight: result.readerLineHeight === 'compact' || result.readerLineHeight === 'relaxed' ? result.readerLineHeight : 'comfortable',
    readerMeasure: result.readerMeasure === 'narrow' || result.readerMeasure === 'wide' ? result.readerMeasure : 'standard',
    focusMode: Boolean(result.focusMode)
  };
}

export async function resolveAsset(documentPath: string, rawPath: string): Promise<assetservice.AssetRef> {
  return ResolveAsset(documentPath, rawPath);
}

export async function revokeAsset(assetId: string): Promise<void> {
  await RevokeAsset(assetId);
}

export async function openExternal(url: string): Promise<void> {
  await OpenExternal(url);
}

export async function getVaultIndex(root: string): Promise<vault.VaultIndex> {
  return GetVaultIndex(root);
}

export async function getSession(): Promise<PersistedSession> {
  const result = await GetSession();
  return {
    tabs: (result.tabs ?? []).map((tab) => ({
      path: tab.path,
      position: {
        scrollTop: tab.position?.scrollTop ?? 0,
        ...(tab.position?.activeHeadingId ? { activeHeadingId: tab.position.activeHeadingId } : {})
      }
    })),
    ...(result.activePath ? { activePath: result.activePath } : {}),
    recents: result.recents ?? []
  };
}

export async function setSession(next: PersistedSession): Promise<void> {
  await SetSession(config.PersistedSession.createFrom(next));
}

export async function watchDocument(path: string): Promise<void> {
  await WatchDocument(path);
}

export async function unwatchDocument(path: string): Promise<void> {
  await UnwatchDocument(path);
}

export async function setWindowTitle(path: string): Promise<void> {
  await SetWindowTitle(path);
}

export async function quitApp(): Promise<void> {
  await Quit();
}

export async function printWindow(): Promise<void> {
  await Print();
}

export function onFileChanged(callback: (path: string) => void): () => void {
  return EventsOn('file-changed', (path: string) => callback(path));
}

export function onFilesDropped(callback: (paths: string[]) => void): () => void {
  return EventsOn('files-dropped', (paths: string[]) => callback(paths));
}

export function onAppCommand(callback: (command: string) => void): () => void {
  return EventsOn('app-command', (command: string) => callback(command));
}

function normalizeTheme(value: string): AppConfig['theme'] {
  if (value === 'light' || value === 'dark') {
    return value;
  }
  return 'system';
}
