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
	service.SetConfig(AppConfig{
		Theme:              "dark",
		HighlighterEngine:  "highlightjs",
		FrontmatterDisplay: "panel",
		TableConstrain:     true,
		TableColumnSizing:  "equal",
		TableRowNumbers:    true,
	})
	service.SetSession(PersistedSession{
		Tabs:       []SessionTab{{Path: "/notes/one.md", Position: ReaderPosition{ScrollTop: 42}}},
		ActivePath: "/notes/one.md",
		Recents:    []RecentDocument{{Path: "/notes/one.md", DisplayName: "one.md", LastOpenedAt: "2026-06-06T00:00:00Z", Pinned: true, MissingAt: "2026-06-07T00:00:00Z"}},
	})

	reloaded := NewAt(path)
	if got := reloaded.GetConfig().Theme; got != "dark" {
		t.Fatalf("expected dark theme, got %q", got)
	} else if config := reloaded.GetConfig(); !config.TableConstrain || config.TableColumnSizing != "equal" || !config.TableRowNumbers {
		t.Fatalf("expected table config to persist: %#v", config)
	}
	if got := reloaded.GetSession(); len(got.Tabs) != 1 || got.Tabs[0].Position.ScrollTop != 42 {
		t.Fatalf("unexpected session: %#v", got)
	} else if !got.Recents[0].Pinned || got.Recents[0].MissingAt == "" {
		t.Fatalf("expected recent metadata to persist: %#v", got.Recents[0])
	}
}

func TestMigratesTableRowNumbersDefaultFromV4State(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	legacy := stateFile{
		Version: 4,
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
			CodeWrap:           true,
			PrintMetadata:      true,
			TableColumnSizing:  "balanced",
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
	if service.GetConfig().TableRowNumbers {
		t.Fatalf("expected migrated table row numbers default to be disabled")
	}
}

func TestMigratesTableDefaultsFromV3State(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	legacy := stateFile{
		Version: 3,
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
			CodeWrap:           true,
			PrintMetadata:      true,
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
	config := service.GetConfig()
	if config.TableConstrain || config.TableColumnSizing != "balanced" {
		t.Fatalf("expected migrated table defaults, got %#v", config)
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

func TestMigratesPrintMetadataDefaultFromV2State(t *testing.T) {
	path := filepath.Join(t.TempDir(), "state.json")
	legacy := stateFile{
		Version: 2,
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
			CodeWrap:           true,
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
	if !service.GetConfig().PrintMetadata {
		t.Fatalf("expected migrated print metadata default to be enabled")
	}
}
