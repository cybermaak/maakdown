package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPersistsConfigAndSession(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	service := NewAt(path)
	service.SetConfig(AppConfig{Theme: "dark", HighlighterEngine: "highlightjs", FrontmatterDisplay: "panel"})
	service.SetSession(PersistedSession{
		Tabs:       []SessionTab{{Path: "/notes/one.md", Position: ReaderPosition{ScrollTop: 42}}},
		ActivePath: "/notes/one.md",
		Recents:    []RecentDocument{{Path: "/notes/one.md", DisplayName: "one.md", LastOpenedAt: "2026-06-06T00:00:00Z"}},
	})

	reloaded := NewAt(path)
	if got := reloaded.GetConfig().Theme; got != "dark" {
		t.Fatalf("expected dark theme, got %q", got)
	}
	if got := reloaded.GetSession(); len(got.Tabs) != 1 || got.Tabs[0].Position.ScrollTop != 42 {
		t.Fatalf("unexpected session: %#v", got)
	}
}

func TestCorruptStateUsesDefaults(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	if err := os.WriteFile(path, []byte("{broken"), 0o600); err != nil {
		t.Fatal(err)
	}
	service := NewAt(path)
	if got := service.GetConfig().Theme; got != "system" {
		t.Fatalf("expected default theme, got %q", got)
	}
}
