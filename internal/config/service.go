package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

const stateVersion = 1

type AppConfig struct {
	Theme              string `json:"theme"`
	HighlighterEngine  string `json:"highlighterEngine"`
	FrontmatterDisplay string `json:"frontmatterDisplay"`
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
	s.current.Config = next
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
	if err := json.Unmarshal(data, &loaded); err != nil || loaded.Version != stateVersion {
		return err
	}
	s.current = loaded
	if s.current.Session.Tabs == nil {
		s.current.Session.Tabs = []SessionTab{}
	}
	if s.current.Session.Recents == nil {
		s.current.Session.Recents = []RecentDocument{}
	}
	return nil
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
