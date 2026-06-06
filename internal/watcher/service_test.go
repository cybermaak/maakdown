package watcher

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestWatcherEmitsForAtomicRename(t *testing.T) {
	dir := t.TempDir()
	target := filepath.Join(dir, "note.md")
	if err := os.WriteFile(target, []byte("one"), 0o644); err != nil {
		t.Fatal(err)
	}

	service := New()
	if err := service.WatchDocument(target); err != nil {
		t.Fatal(err)
	}
	defer service.UnwatchAllDocuments()

	temp := filepath.Join(dir, ".note.md.tmp")
	if err := os.WriteFile(temp, []byte("two"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Rename(temp, target); err != nil {
		t.Fatal(err)
	}

	select {
	case changed := <-service.Changes():
		expected, _ := canonicalPath(target)
		if changed != expected {
			t.Fatalf("expected %q, got %q", target, changed)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for change event")
	}
}

func TestWatcherTracksMultipleDocuments(t *testing.T) {
	dir := t.TempDir()
	first := filepath.Join(dir, "first.md")
	second := filepath.Join(dir, "second.md")
	for _, path := range []string{first, second} {
		if err := os.WriteFile(path, []byte("one"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	service := New()
	defer service.UnwatchAllDocuments()
	if err := service.WatchDocument(first); err != nil {
		t.Fatal(err)
	}
	if err := service.WatchDocument(second); err != nil {
		t.Fatal(err)
	}
	if got := len(service.WatchedPaths()); got != 2 {
		t.Fatalf("expected two watchers, got %d", got)
	}
	if err := os.WriteFile(second, []byte("two"), 0o644); err != nil {
		t.Fatal(err)
	}
	select {
	case changed := <-service.Changes():
		expected, _ := canonicalPath(second)
		if changed != expected {
			t.Fatalf("expected %q, got %q", second, changed)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for second document")
	}
	service.UnwatchDocument(first)
	if got := len(service.WatchedPaths()); got != 1 {
		t.Fatalf("expected one watcher after unregister, got %d", got)
	}
}
