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

func TestGetVaultIndexCachesUntilInvalidated(t *testing.T) {
	root := t.TempDir()
	mustWriteVault(t, filepath.Join(root, "alpha.md"), "# Alpha")
	svc := New()
	first, err := svc.GetVaultIndex(root)
	if err != nil {
		t.Fatalf("first index: %v", err)
	}
	// A note added after the first scan is not visible until invalidation.
	mustWriteVault(t, filepath.Join(root, "beta.md"), "# Beta")
	cached, err := svc.GetVaultIndex(root)
	if err != nil {
		t.Fatalf("cached index: %v", err)
	}
	if cached.Version != first.Version {
		t.Fatal("expected cached index to be reused before invalidation")
	}
	svc.Invalidate()
	fresh, err := svc.GetVaultIndex(root)
	if err != nil {
		t.Fatalf("fresh index: %v", err)
	}
	if fresh.Version == first.Version {
		t.Fatal("expected a fresh scan to reflect the added note after invalidation")
	}
}

func mustWriteVault(t *testing.T, path, contents string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(contents), 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
}
