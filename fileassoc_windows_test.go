//go:build windows

package main

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
)

func TestMarkdownOpenCommandQuotesExecutableAndPath(t *testing.T) {
	got := markdownOpenCommand(`C:\Program Files\Maakdown\Maakdown.exe`)
	want := `"C:\Program Files\Maakdown\Maakdown.exe" "%1"`
	if got != want {
		t.Fatalf("markdownOpenCommand() = %q, want %q", got, want)
	}
}

func TestSameExecutablePathIgnoresWindowsPathCase(t *testing.T) {
	if !sameExecutablePath(
		`C:\Users\Maak\AppData\Local\Maakdown\Maakdown.exe`,
		`c:\users\maak\appdata\local\maakdown\maakdown.exe`,
	) {
		t.Fatal("expected Windows executable path comparison to ignore case")
	}
}

func TestDefaultAppsSettingsURIUsesPerUserRegistration(t *testing.T) {
	got := defaultAppsSettingsURI()
	want := "ms-settings:defaultapps?registeredAppUser=Maakdown"
	if got != want {
		t.Fatalf("defaultAppsSettingsURI() = %q, want %q", got, want)
	}
}

func TestWindowsIconResourceQuotesPathAndIndex(t *testing.T) {
	got := windowsIconResource(`C:\Users\Maak\AppData\Roaming\Maakdown\markdown.ico`)
	want := `"C:\Users\Maak\AppData\Roaming\Maakdown\markdown.ico",0`
	if got != want {
		t.Fatalf("windowsIconResource() = %q, want %q", got, want)
	}
}

func TestEnsureWindowsMarkdownIconWritesPerUserIcon(t *testing.T) {
	configRoot := t.TempDir()
	t.Setenv("APPDATA", configRoot)

	iconPath, err := ensureWindowsMarkdownIcon()
	if err != nil {
		t.Fatalf("ensureWindowsMarkdownIcon() error = %v", err)
	}
	wantPath := filepath.Join(configRoot, "Maakdown", "markdown.ico")
	if iconPath != wantPath {
		t.Fatalf("ensureWindowsMarkdownIcon() path = %q, want %q", iconPath, wantPath)
	}
	got, err := os.ReadFile(iconPath)
	if err != nil {
		t.Fatalf("read generated icon: %v", err)
	}
	if !bytes.Equal(got, markdownFileIcon) {
		t.Fatal("generated icon bytes did not match embedded Markdown icon")
	}
}
