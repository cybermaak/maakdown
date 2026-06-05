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
	if err := service.StartWatch(target); err != nil {
		t.Fatal(err)
	}
	defer service.StopWatch()

	temp := filepath.Join(dir, ".note.md.tmp")
	if err := os.WriteFile(temp, []byte("two"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.Rename(temp, target); err != nil {
		t.Fatal(err)
	}

	select {
	case changed := <-service.Changes():
		if changed != target {
			t.Fatalf("expected %q, got %q", target, changed)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for change event")
	}
}
