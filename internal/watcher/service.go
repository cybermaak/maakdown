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

type Service struct {
	mu      sync.Mutex
	ctx     context.Context
	path    string
	watcher *fsnotify.Watcher
	done    chan struct{}
	changes chan string
}

func New() *Service {
	return &Service{
		changes: make(chan string, 8),
	}
}

func (s *Service) SetContext(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.ctx = ctx
}

func (s *Service) StartWatch(path string) error {
	abs, err := filepath.Abs(path)
	if err != nil {
		return err
	}

	info, err := os.Stat(abs)
	if err != nil {
		return err
	}
	if info.IsDir() {
		abs = filepath.Join(abs, ".")
	}

	parent := filepath.Dir(abs)
	w, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}
	if err := w.Add(parent); err != nil {
		_ = w.Close()
		return err
	}

	s.StopWatch()

	s.mu.Lock()
	s.path = abs
	s.watcher = w
	s.done = make(chan struct{})
	done := s.done
	s.mu.Unlock()

	go s.loop(w, done, abs)
	return nil
}

func (s *Service) StopWatch() {
	s.mu.Lock()
	w := s.watcher
	done := s.done
	s.watcher = nil
	s.done = nil
	s.path = ""
	s.mu.Unlock()

	if done != nil {
		close(done)
	}
	if w != nil {
		_ = w.Close()
	}
}

func (s *Service) WatchedPath() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.path
}

func (s *Service) Changes() <-chan string {
	return s.changes
}

func (s *Service) loop(w *fsnotify.Watcher, done <-chan struct{}, target string) {
	var timer *time.Timer
	var timerC <-chan time.Time
	pending := false

	for {
		select {
		case <-done:
			if timer != nil {
				timer.Stop()
			}
			return
		case event, ok := <-w.Events:
			if !ok {
				return
			}
			if eventMatchesTarget(event, target) {
				pending = true
				if timer != nil {
					timer.Stop()
				}
				timer = time.NewTimer(debounceWindow)
				timerC = timer.C
			}
		case <-timerC:
			if pending && fileReadable(target) {
				s.emitChange(target)
			}
			pending = false
			timerC = nil
		case _, ok := <-w.Errors:
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

func eventMatchesTarget(event fsnotify.Event, target string) bool {
	eventPath, err := filepath.Abs(event.Name)
	if err != nil {
		return false
	}
	return filepath.Clean(eventPath) == filepath.Clean(target)
}

func fileReadable(path string) bool {
	file, err := os.Open(path)
	if err != nil {
		return false
	}
	_ = file.Close()
	return true
}
