package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

const stateVersion = 4

type AppConfig struct {
	Theme               string `json:"theme"`
	HighlighterEngine   string `json:"highlighterEngine"`
	FrontmatterDisplay  string `json:"frontmatterDisplay"`
	ReaderTheme         string `json:"readerTheme"`
	ReaderFont          string `json:"readerFont"`
	ReaderFontSize      int    `json:"readerFontSize"`
	ReaderLineHeight    string `json:"readerLineHeight"`
	ReaderMeasure       string `json:"readerMeasure"`
	FocusMode           bool   `json:"focusMode"`
	OutlineVisible      bool   `json:"outlineVisible"`
	OutlineWidth        int    `json:"outlineWidth"`
	MetadataWidth       int    `json:"metadataWidth"`
	DocumentLineNumbers bool   `json:"documentLineNumbers"`
	CodeLineNumbers     bool   `json:"codeLineNumbers"`
	CodeWrap            bool   `json:"codeWrap"`
	PrintMetadata       bool   `json:"printMetadata"`
	TableConstrain      bool   `json:"tableConstrainToMeasure"`
	TableColumnSizing   string `json:"tableColumnSizing"`
}

type ReaderPosition struct {
	ScrollTop       float64 `json:"scrollTop"`
	ActiveHeadingID string  `json:"activeHeadingId,omitempty"`
}

type SessionTab struct {
	Path     string         `json:"path"`
	Position ReaderPosition `json:"position"`
}

type RecentDocument struct {
	Path         string `json:"path"`
	DisplayName  string `json:"displayName"`
	LastOpenedAt string `json:"lastOpenedAt"`
	Pinned       bool   `json:"pinned,omitempty"`
	MissingAt    string `json:"missingAt,omitempty"`
}

type PersistedSession struct {
	Tabs       []SessionTab     `json:"tabs"`
	ActivePath string           `json:"activePath,omitempty"`
	Recents    []RecentDocument `json:"recents"`
}

type stateFile struct {
	Version int              `json:"version"`
	Config  AppConfig        `json:"config"`
	Session PersistedSession `json:"session"`
}

type Service struct {
	mu      sync.RWMutex
	path    string
	current stateFile
}

func New() *Service {
	base, err := os.UserConfigDir()
	if err != nil {
		base = os.TempDir()
	}
	return NewAt(filepath.Join(base, "Maakdown", "state.json"))
}

func NewAt(path string) *Service {
	s := &Service{path: path, current: defaultState()}
	_ = s.load()
	return s
}

func defaultState() stateFile {
	return stateFile{
		Version: stateVersion,
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
			TableConstrain:     false,
			TableColumnSizing:  "balanced",
		},
		Session: PersistedSession{Tabs: []SessionTab{}, Recents: []RecentDocument{}},
	}
}

func (s *Service) GetConfig() AppConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.current.Config
}

func (s *Service) SetConfig(next AppConfig) AppConfig {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.current.Config = normalizeConfig(next)
	_ = s.persistLocked()
	return s.current.Config
}

func (s *Service) GetSession() PersistedSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return cloneSession(s.current.Session)
}

func (s *Service) SetSession(next PersistedSession) PersistedSession {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.current.Session = cloneSession(next)
	_ = s.persistLocked()
	return cloneSession(s.current.Session)
}

func (s *Service) load() error {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return err
	}
	var loaded stateFile
	if err := json.Unmarshal(data, &loaded); err != nil || loaded.Version < 1 || loaded.Version > stateVersion {
		return err
	}
	s.current = loaded
	s.current.Config = normalizeConfigForVersion(s.current.Config, loaded.Version)
	s.current.Version = stateVersion
	if s.current.Session.Tabs == nil {
		s.current.Session.Tabs = []SessionTab{}
	}
	if s.current.Session.Recents == nil {
		s.current.Session.Recents = []RecentDocument{}
	}
	return nil
}

func normalizeConfig(value AppConfig) AppConfig {
	return normalizeConfigForVersion(value, stateVersion)
}

func normalizeConfigForVersion(value AppConfig, version int) AppConfig {
	defaults := defaultState().Config
	legacyOutlineSetting := value.OutlineWidth == 0
	if value.Theme != "light" && value.Theme != "dark" && value.Theme != "system" {
		value.Theme = defaults.Theme
	}
	if value.HighlighterEngine != "shiki-js-regex" {
		value.HighlighterEngine = defaults.HighlighterEngine
	}
	if value.FrontmatterDisplay != "hidden" {
		value.FrontmatterDisplay = defaults.FrontmatterDisplay
	}
	if value.ReaderTheme != "editorial" && value.ReaderTheme != "high-contrast" {
		value.ReaderTheme = defaults.ReaderTheme
	}
	if value.ReaderFont != "serif" {
		value.ReaderFont = defaults.ReaderFont
	}
	if value.ReaderFontSize < 13 || value.ReaderFontSize > 22 {
		value.ReaderFontSize = defaults.ReaderFontSize
	}
	if value.ReaderLineHeight != "compact" && value.ReaderLineHeight != "relaxed" {
		value.ReaderLineHeight = defaults.ReaderLineHeight
	}
	if value.ReaderMeasure != "narrow" && value.ReaderMeasure != "wide" {
		value.ReaderMeasure = defaults.ReaderMeasure
	}
	if value.OutlineWidth < 200 || value.OutlineWidth > 480 {
		value.OutlineWidth = defaults.OutlineWidth
	}
	if value.MetadataWidth < 220 || value.MetadataWidth > 480 {
		value.MetadataWidth = defaults.MetadataWidth
	}
	if legacyOutlineSetting {
		value.OutlineVisible = true
	}
	if version < 2 {
		value.CodeWrap = defaults.CodeWrap
	}
	if version < 3 {
		value.PrintMetadata = defaults.PrintMetadata
	}
	if version < 4 {
		value.TableConstrain = defaults.TableConstrain
		value.TableColumnSizing = defaults.TableColumnSizing
	}
	if value.TableColumnSizing != "equal" {
		value.TableColumnSizing = defaults.TableColumnSizing
	}
	return value
}

func (s *Service) persistLocked() error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(s.current, "", "  ")
	if err != nil {
		return err
	}
	temp, err := os.CreateTemp(filepath.Dir(s.path), ".state-*.tmp")
	if err != nil {
		return err
	}
	tempName := temp.Name()
	defer os.Remove(tempName)
	if err := temp.Chmod(0o600); err != nil {
		_ = temp.Close()
		return err
	}
	if _, err := temp.Write(append(data, '\n')); err != nil {
		_ = temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		_ = temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	return os.Rename(tempName, s.path)
}

func cloneSession(session PersistedSession) PersistedSession {
	session.Tabs = append([]SessionTab(nil), session.Tabs...)
	session.Recents = append([]RecentDocument(nil), session.Recents...)
	return session
}
