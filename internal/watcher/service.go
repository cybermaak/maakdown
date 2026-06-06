package watcher

import (
	"context"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/fsnotify/fsnotify"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const debounceWindow = 150 * time.Millisecond

type registration struct {
	watcher *fsnotify.Watcher
	done    chan struct{}
}

type Service struct {
	mu            sync.Mutex
	ctx           context.Context
	registrations map[string]*registration
	changes       chan string
}

func New() *Service {
	return &Service{
		registrations: make(map[string]*registration),
		changes:       make(chan string, 16),
	}
}

func (s *Service) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

func (s *Service) WatchDocument(path string) error {
	target, err := canonicalPath(path)
	if err != nil {
		return err
	}
	s.mu.Lock()
	if _, exists := s.registrations[target]; exists {
		s.mu.Unlock()
		return nil
	}
	s.mu.Unlock()

	w, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	if err := w.Add(filepath.Dir(target)); err != nil {
		_ = w.Close()
		return err
	}
	reg := &registration{watcher: w, done: make(chan struct{})}
	s.mu.Lock()
	if existing := s.registrations[target]; existing != nil {
		s.mu.Unlock()
		_ = w.Close()
		return nil
	}
	s.registrations[target] = reg
	s.mu.Unlock()
	go s.loop(reg, target)
	return nil
}

func (s *Service) UnwatchDocument(path string) {
	target, err := canonicalPath(path)
	if err != nil {
		return
	}
	s.mu.Lock()
	reg := s.registrations[target]
	delete(s.registrations, target)
	s.mu.Unlock()
	if reg != nil {
		close(reg.done)
		_ = reg.watcher.Close()
	}
}

func (s *Service) UnwatchAllDocuments() {
	s.mu.Lock()
	registrations := s.registrations
	s.registrations = make(map[string]*registration)
	s.mu.Unlock()
	for _, reg := range registrations {
		close(reg.done)
		_ = reg.watcher.Close()
	}
}

func (s *Service) WatchedPaths() []string {
	s.mu.Lock()
	defer s.mu.Unlock()
	paths := make([]string, 0, len(s.registrations))
	for path := range s.registrations {
		paths = append(paths, path)
	}
	return paths
}

func (s *Service) Changes() <-chan string {
	return s.changes
}

func (s *Service) loop(reg *registration, target string) {
	var timer *time.Timer
	var timerC <-chan time.Time
	for {
		select {
		case <-reg.done:
			if timer != nil {
				timer.Stop()
			}
			return
		case event, ok := <-reg.watcher.Events:
			if !ok {
				return
			}
			if eventMatchesTarget(event, target) {
				if timer != nil {
					timer.Stop()
				}
				timer = time.NewTimer(debounceWindow)
				timerC = timer.C
			}
		case <-timerC:
			if fileReadable(target) {
				s.emitChange(target)
			}
			timerC = nil
		case _, ok := <-reg.watcher.Errors:
			if !ok {
				return
			}
		}
	}
}

func (s *Service) emitChange(path string) {
	select {
	case s.changes <- path:
	default:
	}
	s.mu.Lock()
	ctx := s.ctx
	s.mu.Unlock()
	if ctx != nil {
		runtime.EventsEmit(ctx, "file-changed", path)
	}
}

func canonicalPath(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if evaluated, evalErr := filepath.EvalSymlinks(abs); evalErr == nil {
		abs = evaluated
	}
	return filepath.Clean(abs), nil
}

func eventMatchesTarget(event fsnotify.Event, target string) bool {
	eventPath, err := filepath.Abs(event.Name)
	return err == nil && filepath.Clean(eventPath) == target
}

func fileReadable(path string) bool {
	file, err := os.Open(path)
	if err != nil {
		return false
	}
	return file.Close() == nil
}
