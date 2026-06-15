//go:build windows

package main

import "testing"

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
