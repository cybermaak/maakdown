package assetservice

import (
	"context"
	"net/http"
	"os"
	"path/filepath"
	"testing"
	"time"
)

var tinyPNG = []byte{
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
	0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
	0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
	0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
	0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82,
}

func TestDetectTrustedRootPrefersConfiguredRoot(t *testing.T) {
	dir := t.TempDir()
	vault := filepath.Join(dir, "vault")
	repo := filepath.Join(vault, "repo")
	docs := filepath.Join(repo, "docs")
	mustMkdir(t, filepath.Join(repo, ".git"))
	mustMkdir(t, docs)
	document := filepath.Join(docs, "readme.md")
	mustWrite(t, document, []byte("# Readme"))

	root, err := DetectTrustedRoot(document, vault)
	if err != nil {
		t.Fatal(err)
	}
	if root != mustEval(t, vault) {
		t.Fatalf("expected configured vault root %q, got %q", vault, root)
	}
}

func TestResolveAssetPathAllowsParentWithinGitRoot(t *testing.T) {
	dir := t.TempDir()
	mustMkdir(t, filepath.Join(dir, ".git"))
	mustMkdir(t, filepath.Join(dir, "docs"))
	mustMkdir(t, filepath.Join(dir, "images"))
	document := filepath.Join(dir, "docs", "readme.md")
	image := filepath.Join(dir, "images", "logo.png")
	mustWrite(t, document, []byte("# Readme"))
	mustWrite(t, image, tinyPNG)

	resolved, root, err := ResolveAssetPath(document, "../images/logo.png", "")
	if err != nil {
		t.Fatal(err)
	}
	if resolved != mustEval(t, image) {
		t.Fatalf("expected %q, got %q", image, resolved)
	}
	if root != mustEval(t, dir) {
		t.Fatalf("expected git root %q, got %q", dir, root)
	}
}

func TestResolveAssetPathRejectsEscape(t *testing.T) {
	dir := t.TempDir()
	outside := filepath.Join(dir, "outside.png")
	project := filepath.Join(dir, "project")
	docs := filepath.Join(project, "docs")
	mustMkdir(t, docs)
	document := filepath.Join(docs, "readme.md")
	mustWrite(t, document, []byte("# Readme"))
	mustWrite(t, outside, tinyPNG)

	_, _, err := ResolveAssetPath(document, "../../outside.png", "")
	if err == nil {
		t.Fatal("expected traversal outside trusted root to fail")
	}
}

func TestValidateSVGRejectsScript(t *testing.T) {
	path := filepath.Join(t.TempDir(), "bad.svg")
	mustWrite(t, path, []byte(`<svg><script>alert(1)</script></svg>`))
	if err := ValidateSVG(path); err == nil {
		t.Fatal("expected unsafe SVG to be rejected")
	}
}

func TestAssetServerServesTokenizedImage(t *testing.T) {
	dir := t.TempDir()
	mustMkdir(t, filepath.Join(dir, "docs"))
	document := filepath.Join(dir, "docs", "readme.md")
	image := filepath.Join(dir, "docs", "logo.png")
	mustWrite(t, document, []byte("# Readme"))
	mustWrite(t, image, tinyPNG)

	service := New()
	service.Start(context.Background())
	defer service.Shutdown(context.Background())

	ref, err := service.ResolveAsset(document, "logo.png")
	if err != nil {
		t.Fatal(err)
	}
	if ref.URL == "" || ref.ID == "" {
		t.Fatalf("expected asset ref url and id, got %+v", ref)
	}

	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(ref.URL)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	if got := resp.Header.Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("expected nosniff header, got %q", got)
	}
}

func mustMkdir(t *testing.T, path string) {
	t.Helper()
	if err := os.MkdirAll(path, 0o755); err != nil {
		t.Fatal(err)
	}
}

func mustWrite(t *testing.T, path string, bytes []byte) {
	t.Helper()
	if err := os.WriteFile(path, bytes, 0o644); err != nil {
		t.Fatal(err)
	}
}

func mustEval(t *testing.T, path string) string {
	t.Helper()
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		t.Fatal(err)
	}
	return resolved
}
