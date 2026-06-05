package main

import (
	"context"

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
}

func (a *App) Shutdown(ctx context.Context) {
	a.Watcher.StopWatch()
	a.Assets.Shutdown(ctx)
}

func (a *App) AppName() string {
	return "Maakdown"
}
