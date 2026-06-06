package vault

import (
	"os"
	"path/filepath"
	"testing"
)

func TestGetVaultIndexMapsBasenameAndRelativePath(t *testing.T) {
	root := t.TempDir()
	nested := filepath.Join(root, "architecture")
	if err := os.MkdirAll(nested, 0o755); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(nested, "Rendering Model.md")
	if err := os.WriteFile(path, []byte("# Rendering Model"), 0o644); err != nil {
		t.Fatal(err)
	}

	index, err := New().GetVaultIndex(root)
	if err != nil {
		t.Fatal(err)
	}
	canonicalPath, err := filepath.EvalSymlinks(path)
	if err != nil {
		t.Fatal(err)
	}
	if index.Notes["rendering model"] != canonicalPath {
		t.Fatalf("basename mapping missing: %#v", index.Notes)
	}
	if index.Notes["architecture/rendering model"] != canonicalPath {
		t.Fatalf("relative mapping missing: %#v", index.Notes)
	}
	if index.Version == "" {
		t.Fatal("expected a version")
	}
}
