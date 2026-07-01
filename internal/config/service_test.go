package config

import (
	"encoding/json"
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

func TestMigratesCodeWrapDefaultFromV1State(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	legacy := stateFile{
		Version: 1,
		Config: AppConfig{
			Theme:              "system",
			HighlighterEngine:  "highlightjs",
			FrontmatterDisplay: "panel",
			ReaderTheme:        "editorial",
			ReaderFont:         "sans",
			ReaderFontSize:     15,
			ReaderLineHeight:   "comfortable",
			ReaderMeasure:      "standard",
			OutlineVisible:     true,
			OutlineWidth:       280,
			MetadataWidth:      260,
		},
		Session: PersistedSession{Tabs: []SessionTab{}, Recents: []RecentDocument{}},
	}
	data, err := json.Marshal(legacy)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, data, 0o600); err != nil {
		t.Fatal(err)
	}

	service := NewAt(path)
	if !service.GetConfig().CodeWrap {
		t.Fatalf("expected migrated code wrap default to be enabled")
	}
}
