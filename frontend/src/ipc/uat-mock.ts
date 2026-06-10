/**
 * Deterministic mock of the Wails IPC boundary for UI-driven UAT tests.
 *
 * Substituted for `src/ipc/index.ts` only when the app is built with
 * `vite --mode uat` (see the alias in `vite.config.ts`). Production code paths
 * are untouched.
 *
 * Test state lives on `window.__uat`. Tests seed `window.__uat.state` via
 * `page.addInitScript` (which re-runs on reload, so "filesystem" data like
 * documents and the picker queue is always available) and drive native events
 * via `page.evaluate(() => window.__uat.emit(...))`.
 *
 * Durable settings (config) and the persisted session are mirrored into
 * `localStorage`, so a page reload models an application restart: the durable
 * values survive while in-memory trackers reset. Playwright gives each test an
 * isolated browser context, so this storage never leaks between tests.
 */
import type { AppConfig } from '../stores/configStore';
import type { PersistedSession } from '../core/workspace/workspace';

interface MockDocument {
  contents: string;
  trustedRoot: string;
}

interface VaultIndexShape {
  version: string;
  notes: Record<string, string>;
}

interface MockState {
  documents: Record<string, MockDocument>;
  config: AppConfig;
  session: PersistedSession;
  vaultIndex: VaultIndexShape;
  pickerQueue: string[];
  externalLinks: string[];
  printCalls: number;
  printSnapshots: Array<{ blocks: number; enhanced: number }>;
  clipboardText: string;
  windowTitle: string;
  savedConfigs: AppConfig[];
  savedSessions: PersistedSession[];
  watched: string[];
  quit: boolean;
  pendingOpenFiles: string[];
  markdownHandlerSupported: boolean;
  defaultMarkdownHandler: boolean;
}

type EventName = 'file-changed' | 'files-dropped' | 'app-command' | 'open-file';

interface UatController {
  state: MockState;
  emit(event: EventName, payload: unknown): void;
}

const CONFIG_KEY = '__uat_config';
const SESSION_KEY = '__uat_session';

const defaultConfig: AppConfig = {
  theme: 'system',
  highlighterEngine: 'highlightjs',
  frontmatterDisplay: 'panel',
  readerTheme: 'editorial',
  readerFont: 'sans',
  readerFontSize: 15,
  readerLineHeight: 'comfortable',
  readerMeasure: 'standard',
  focusMode: false,
  outlineVisible: true,
  outlineWidth: 280,
  metadataWidth: 260
};

const listeners: Record<EventName, Array<(payload: unknown) => void>> = {
  'file-changed': [],
  'files-dropped': [],
  'app-command': [],
  'open-file': []
};

function readDurable<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeDurable(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

function buildState(): MockState {
  const globalScope = window as unknown as { __uat?: { state?: Partial<MockState> } };
  const seeded = (globalScope.__uat?.state ?? {}) as Partial<MockState>;

  // Config and session are durable: prefer a prior persisted value (restart),
  // otherwise fall back to the test seed, otherwise defaults.
  const seededConfig = { ...defaultConfig, ...(seeded.config ?? {}) };
  const config = readDurable<AppConfig>(CONFIG_KEY, seededConfig);
  const seededSession: PersistedSession = seeded.session ?? { tabs: [], recents: [] };
  const session = readDurable<PersistedSession>(SESSION_KEY, seededSession);

  return {
    documents: seeded.documents ?? {},
    config,
    session,
    vaultIndex: seeded.vaultIndex ?? { version: 'uat-vault-0', notes: {} },
    pickerQueue: seeded.pickerQueue ?? [],
    externalLinks: [],
    printCalls: 0,
    printSnapshots: [],
    clipboardText: '',
    windowTitle: '',
    savedConfigs: [],
    savedSessions: [],
    watched: [],
    quit: false,
    pendingOpenFiles: seeded.pendingOpenFiles ?? [],
    markdownHandlerSupported: seeded.markdownHandlerSupported ?? false,
    defaultMarkdownHandler: seeded.defaultMarkdownHandler ?? false
  };
}

const state = buildState();

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: async (value: string) => {
      state.clipboardText = value;
    }
  }
});

(window as unknown as { __uat: UatController }).__uat = {
  state,
  emit(event, payload) {
    for (const callback of listeners[event]) callback(payload);
  }
};

function trustedRootFor(path: string): string {
  const normalized = path.replaceAll('\\', '/');
  return normalized.includes('/') ? normalized.slice(0, normalized.lastIndexOf('/')) : '';
}

function readDocumentRecord(path: string): MockDocument {
  const doc = state.documents[path];
  if (!doc) throw new Error(`File not found: ${path}`);
  return doc;
}

export async function openDocument(): Promise<{ path: string; contents: string; trustedRoot: string }> {
  const path = state.pickerQueue.shift();
  if (!path) throw new Error('open dialog cancelled');
  return openDocumentAt(path);
}

export async function openDocumentAt(path: string): Promise<{ path: string; contents: string; trustedRoot: string }> {
  const doc = readDocumentRecord(path);
  return { path, contents: doc.contents, trustedRoot: doc.trustedRoot || trustedRootFor(path) };
}

export async function readDocument(path: string): Promise<{ path: string; contents: string }> {
  const doc = readDocumentRecord(path);
  return { path, contents: doc.contents };
}

export async function getConfig(): Promise<AppConfig> {
  return { ...state.config };
}

export async function setConfig(next: AppConfig): Promise<AppConfig> {
  state.config = { ...next };
  state.savedConfigs.push({ ...next });
  writeDurable(CONFIG_KEY, state.config);
  return { ...next };
}

export async function resolveAsset(
  _documentPath: string,
  rawPath: string
): Promise<{ id: string; rawPath: string; url: string }> {
  // Serve through the dev fixture server so a real <img> renders in the reader.
  return { id: `uat-asset-${rawPath}`, rawPath, url: `/__maakdown_fixture/${encodeURI(rawPath)}` };
}

export async function revokeAsset(_assetId: string): Promise<void> {
  // no-op
}

export async function openExternal(url: string): Promise<void> {
  state.externalLinks.push(url);
}

export async function getVaultIndex(_root: string): Promise<VaultIndexShape> {
  return { version: state.vaultIndex.version, notes: { ...state.vaultIndex.notes } };
}

export async function getSession(): Promise<PersistedSession> {
  const session = state.session;
  return {
    tabs: (session.tabs ?? []).map((tab) => ({
      path: tab.path,
      position: {
        scrollTop: tab.position?.scrollTop ?? 0,
        ...(tab.position?.activeHeadingId ? { activeHeadingId: tab.position.activeHeadingId } : {})
      }
    })),
    ...(session.activePath ? { activePath: session.activePath } : {}),
    recents: session.recents ?? []
  };
}

export async function setSession(next: PersistedSession): Promise<void> {
  state.session = JSON.parse(JSON.stringify(next));
  state.savedSessions.push(JSON.parse(JSON.stringify(next)));
  writeDurable(SESSION_KEY, state.session);
}

export async function watchDocument(path: string): Promise<void> {
  if (!state.watched.includes(path)) state.watched.push(path);
}

export async function unwatchDocument(path: string): Promise<void> {
  state.watched = state.watched.filter((item) => item !== path);
}

export async function setWindowTitle(path: string): Promise<void> {
  state.windowTitle = path;
}

export async function quitApp(): Promise<void> {
  state.quit = true;
}

export async function printWindow(): Promise<void> {
  state.printCalls += 1;
  state.printSnapshots.push({
    blocks: document.querySelectorAll('.doc-block').length,
    enhanced: document.querySelectorAll('.doc-block [data-highlight-engine], .doc-block-mermaid svg').length
  });
}

export function isDesktopRuntime(): boolean {
  // UAT runs a static bundle without the Wails runtime, so the custom title bar
  // stays hidden and tests exercise the browser chrome.
  return false;
}

export function isMacPlatform(): boolean {
  return false;
}

export async function windowMinimise(): Promise<void> {
  // no-op
}

export async function windowToggleMaximise(): Promise<void> {
  // no-op
}

export async function windowIsMaximised(): Promise<boolean> {
  return false;
}

export async function appVersion(): Promise<string> {
  return 'uat-test';
}

export async function consumePendingOpenFiles(): Promise<string[]> {
  const pending = state.pendingOpenFiles;
  state.pendingOpenFiles = [];
  return pending;
}

export async function markdownHandlerSupported(): Promise<boolean> {
  return state.markdownHandlerSupported;
}

export async function isDefaultMarkdownHandler(): Promise<boolean> {
  return state.defaultMarkdownHandler;
}

export async function setDefaultMarkdownHandler(): Promise<void> {
  state.defaultMarkdownHandler = true;
}

export function onOpenFile(callback: (path: string) => void): () => void {
  const wrapped = (payload: unknown) => callback(payload as string);
  listeners['open-file'].push(wrapped);
  return () => {
    listeners['open-file'] = listeners['open-file'].filter((item) => item !== wrapped);
  };
}

export function onFileChanged(callback: (path: string) => void): () => void {
  const wrapped = (payload: unknown) => callback(payload as string);
  listeners['file-changed'].push(wrapped);
  return () => {
    listeners['file-changed'] = listeners['file-changed'].filter((item) => item !== wrapped);
  };
}

export function onFilesDropped(callback: (paths: string[]) => void): () => void {
  const wrapped = (payload: unknown) => callback(payload as string[]);
  listeners['files-dropped'].push(wrapped);
  return () => {
    listeners['files-dropped'] = listeners['files-dropped'].filter((item) => item !== wrapped);
  };
}

export function onAppCommand(callback: (command: string) => void): () => void {
  const wrapped = (payload: unknown) => callback(payload as string);
  listeners['app-command'].push(wrapped);
  return () => {
    listeners['app-command'] = listeners['app-command'].filter((item) => item !== wrapped);
  };
}
