package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"maakdown/internal/assetservice"
	"maakdown/internal/config"
	"maakdown/internal/fileservice"
	"maakdown/internal/linkservice"
	"maakdown/internal/vault"
	"maakdown/internal/watcher"
)

// appBundleID must match CFBundleIdentifier in build/darwin/Info.plist.
const appBundleID = "com.maak.maakdown"

type App struct {
	ctx context.Context

	Files   *fileservice.Service
	Assets  *assetservice.Service
	Links   *linkservice.Service
	Vault   *vault.Service
	Config  *config.Service
	Watcher *watcher.Service

	// Files handed to us by the OS before the frontend subscribed (cold start).
	pendingMu     sync.Mutex
	pendingOpens  []string
	frontendReady bool
}

func NewApp() *App {
	cfg := config.New()
	return &App{
		Files:   fileservice.New(),
		Assets:  assetservice.New(),
		Links:   linkservice.New(),
		Vault:   vault.New(),
		Config:  cfg,
		Watcher: watcher.New(),
	}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	registerMarkdownHandler()
	a.Files.SetContext(ctx)
	a.Links.SetContext(ctx)
	a.Watcher.SetContext(ctx)
	a.Assets.Start(ctx)
	runtime.OnFileDrop(ctx, func(_ int, _ int, paths []string) {
		runtime.EventsEmit(ctx, "files-dropped", paths)
	})
	// Drop cached vault indexes when watched files change so wikilink
	// resolution stays fresh while repeated opens reuse the cached scan.
	go func() {
		for range a.Watcher.Changes() {
			a.Vault.Invalidate()
		}
	}()
}

func (a *App) Shutdown(ctx context.Context) {
	a.Watcher.UnwatchAllDocuments()
	runtime.OnFileDropOff(ctx)
	a.Assets.Shutdown(ctx)
}

func (a *App) SetWindowTitle(path string) {
	title := "Maakdown"
	if path != "" {
		title = filepath.Base(path) + " - Maakdown"
	}
	runtime.WindowSetTitle(a.ctx, title)
}

func (a *App) EmitCommand(command string) {
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "app-command", command)
	}
}

func (a *App) Quit() {
	if a.ctx != nil {
		runtime.Quit(a.ctx)
	}
}

func (a *App) Print() {
	if a.ctx != nil {
		runtime.WindowPrint(a.ctx)
	}
}

func (a *App) AppName() string {
	return "Maakdown"
}

// Version reports the build version ("dev" outside tagged release builds).
func (a *App) Version() string {
	return appVersion
}

// WindowMinimise minimises the frameless window from the custom title bar.
func (a *App) WindowMinimise() {
	if a.ctx != nil {
		runtime.WindowMinimise(a.ctx)
	}
}

// WindowToggleMaximise toggles maximised/restored state from the custom title bar.
func (a *App) WindowToggleMaximise() {
	if a.ctx != nil {
		runtime.WindowToggleMaximise(a.ctx)
	}
}

// WindowIsMaximised reports maximised state so the title bar can pick its glyph.
func (a *App) WindowIsMaximised() bool {
	if a.ctx != nil {
		return runtime.WindowIsMaximised(a.ctx)
	}
	return false
}

// isMarkdownPath mirrors the reader's accepted Markdown extensions.
func isMarkdownPath(path string) bool {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".md", ".markdown", ".mdown", ".mkd", ".mdwn":
		return true
	}
	return false
}

// QueueOpenFile routes an OS-handed file to the frontend: emitted live when the
// app is running, buffered for ConsumePendingOpenFiles during cold start.
// Non-Markdown or unreadable paths are ignored.
func (a *App) QueueOpenFile(path string) {
	if !isMarkdownPath(path) {
		return
	}
	if _, err := os.Stat(path); err != nil {
		return
	}
	a.pendingMu.Lock()
	if !a.frontendReady {
		// Buffer until the frontend drains once; the event may fire before the
		// frontend has subscribed, and tab dedup makes any overlap idempotent.
		a.pendingOpens = append(a.pendingOpens, path)
	}
	a.pendingMu.Unlock()
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "open-file", path)
	}
}

// ConsumePendingOpenFiles drains files queued before the frontend subscribed
// and marks the frontend ready, after which opens flow only through the
// "open-file" event. The frontend calls this once after restoring its session.
func (a *App) ConsumePendingOpenFiles() []string {
	a.pendingMu.Lock()
	defer a.pendingMu.Unlock()
	a.frontendReady = true
	pending := a.pendingOpens
	a.pendingOpens = nil
	if pending == nil {
		return []string{}
	}
	return pending
}

// MarkdownHandlerSupported reports whether this platform supports querying and
// setting the default Markdown opener.
func (a *App) MarkdownHandlerSupported() bool {
	return markdownHandlerSupported
}

// IsDefaultMarkdownHandler reports whether Maakdown is the OS default opener
// for Markdown files.
func (a *App) IsDefaultMarkdownHandler() bool {
	return isDefaultMarkdownHandler()
}

// SetDefaultMarkdownHandler makes Maakdown the OS default Markdown opener. The
// OS call is silent, so this must only run from an explicit user action.
func (a *App) SetDefaultMarkdownHandler() error {
	return setDefaultMarkdownHandler()
}
