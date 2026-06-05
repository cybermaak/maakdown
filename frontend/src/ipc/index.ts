import { OpenDocument, OpenDocumentAt, ReadDocument } from '../../wailsjs/go/fileservice/Service';
import { GetConfig, SetConfig } from '../../wailsjs/go/config/Service';
import { ResolveAsset, RevokeAsset } from '../../wailsjs/go/assetservice/Service';
import { OpenExternal } from '../../wailsjs/go/linkservice/Service';
import { StartWatch, StopWatch } from '../../wailsjs/go/watcher/Service';
import { GetVaultIndex } from '../../wailsjs/go/vault/Service';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import type { assetservice, config, fileservice, vault } from '../../wailsjs/go/models';
import type { AppConfig } from '../stores/configStore';

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
    frontmatterDisplay: result.frontmatterDisplay === 'hidden' ? 'hidden' : 'panel'
  };
}

export async function setConfig(next: AppConfig): Promise<AppConfig> {
  const result = (await SetConfig(next)) as config.AppConfig;
  return {
    theme: normalizeTheme(result.theme),
    highlighterEngine: result.highlighterEngine === 'shiki-js-regex' ? 'shiki-js-regex' : 'highlightjs',
    frontmatterDisplay: result.frontmatterDisplay === 'hidden' ? 'hidden' : 'panel'
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

export async function startWatch(path: string): Promise<void> {
  await StartWatch(path);
}

export async function stopWatch(): Promise<void> {
  await StopWatch();
}

export function onFileChanged(callback: (path: string) => void): () => void {
  return EventsOn('file-changed', (path: string) => callback(path));
}

function normalizeTheme(value: string): AppConfig['theme'] {
  if (value === 'light' || value === 'dark') {
    return value;
  }
  return 'system';
}
