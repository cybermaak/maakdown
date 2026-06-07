package main

import (
	"context"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"maakdown/internal/assetservice"
	"maakdown/internal/config"
	"maakdown/internal/fileservice"
	"maakdown/internal/linkservice"
	"maakdown/internal/vault"
	"maakdown/internal/watcher"
)

type App struct {
	ctx context.Context

	Files   *fileservice.Service
	Assets  *assetservice.Service
	Links   *linkservice.Service
	Vault   *vault.Service
	Config  *config.Service
	Watcher *watcher.Service
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
