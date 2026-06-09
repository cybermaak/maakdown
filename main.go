package main

import (
	"embed"
	"fmt"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/menu/keys"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()
	appMenu := menu.NewMenu()
	fileMenu := appMenu.AddSubmenu("File")
	fileMenu.AddText("Open...", keys.CmdOrCtrl("o"), func(_ *menu.CallbackData) { app.EmitCommand("open") })
	fileMenu.AddText("Close Tab", keys.CmdOrCtrl("w"), func(_ *menu.CallbackData) { app.EmitCommand("close-tab") })
	fileMenu.AddText("Reopen Closed Tab", keys.Combo("t", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		app.EmitCommand("reopen-tab")
	})
	fileMenu.AddSeparator()
	fileMenu.AddText("Reload", keys.CmdOrCtrl("r"), func(_ *menu.CallbackData) { app.EmitCommand("reload") })
	fileMenu.AddText("Print...", keys.CmdOrCtrl("p"), func(_ *menu.CallbackData) { app.EmitCommand("print") })
	fileMenu.AddSeparator()
	fileMenu.AddText("Quit Maakdown", keys.CmdOrCtrl("q"), func(_ *menu.CallbackData) { app.Quit() })
	viewMenu := appMenu.AddSubmenu("View")
	viewMenu.AddText("Command Palette", keys.CmdOrCtrl("k"), func(_ *menu.CallbackData) {
		app.EmitCommand("palette")
	})
	viewMenu.AddText("Find in Document", keys.CmdOrCtrl("f"), func(_ *menu.CallbackData) {
		app.EmitCommand("find")
	})
	viewMenu.AddText("Focus Mode", keys.Combo("f", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		app.EmitCommand("focus")
	})
	viewMenu.AddText("Next Tab", keys.Control("tab"), func(_ *menu.CallbackData) {
		app.EmitCommand("next-tab")
	})
	viewMenu.AddText("Previous Tab", keys.Combo("tab", keys.CmdOrCtrlKey, keys.ShiftKey), func(_ *menu.CallbackData) {
		app.EmitCommand("previous-tab")
	})

	err := wails.Run(&options.App{
		Title:  "Maakdown",
		Width:  1200,
		Height: 800,
		// Remove the OS title bar so Maakdown renders one consistent custom
		// title bar across macOS, Windows, and Linux.
		Frameless: true,
		Menu:      appMenu,
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop: true,
			// Disable the webview's own drag-and-drop so a dropped file is not
			// opened/navigated to inside the webview (notably WebKitGTK on Linux).
			// The native layer still delivers the dropped paths via OnFileDrop.
			DisableWebViewDrop: true,
		},
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		OnStartup:  app.Startup,
		OnShutdown: app.Shutdown,
		Bind: []interface{}{
			app,
			app.Files,
			app.Assets,
			app.Links,
			app.Vault,
			app.Config,
			app.Watcher,
		},
	})
	if err != nil {
		fmt.Println("Maakdown failed to start:", err)
	}
}
