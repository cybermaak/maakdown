//go:build linux

package main

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func withLinuxAssociationFakes(t *testing.T) {
	t.Helper()
	oldExecutable, oldLookPath, oldRun := linuxExecutable, linuxLookPath, linuxRun
	t.Cleanup(func() {
		linuxExecutable, linuxLookPath, linuxRun = oldExecutable, oldLookPath, oldRun
	})
}

func TestInstallLinuxDesktopEntry(t *testing.T) {
	withLinuxAssociationFakes(t)
	dataHome := t.TempDir()
	t.Setenv("XDG_DATA_HOME", dataHome)
	linuxExecutable = func() (string, error) { return "/opt/Maakdown Reader/Maakdown", nil }
	var calls [][]string
	linuxLookPath = func(name string) (string, error) { return "/usr/bin/" + name, nil }
	linuxRun = func(name string, args ...string) ([]byte, error) {
		calls = append(calls, append([]string{name}, args...))
		return nil, nil
	}

	if err := installLinuxDesktopEntry(); err != nil {
		t.Fatal(err)
	}
	path := filepath.Join(dataHome, "applications", linuxDesktopFileName)
	contents, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	text := string(contents)
	for _, expected := range []string{
		`Exec="/opt/Maakdown Reader/Maakdown" %f`,
		"MimeType=text/markdown;",
		"Terminal=false",
	} {
		if !strings.Contains(text, expected) {
			t.Fatalf("desktop entry missing %q:\n%s", expected, text)
		}
	}
	if strings.Contains(text, "TryExec=") {
		t.Fatalf("desktop entry should not include TryExec because GIO treats quoted paths as literal:\n%s", text)
	}
	expectedCall := []string{"/usr/bin/update-desktop-database", filepath.Join(dataHome, "applications")}
	if !reflect.DeepEqual(calls, [][]string{expectedCall}) {
		t.Fatalf("unexpected commands: %#v", calls)
	}
}

func TestInstallLinuxDesktopEntryWithoutCacheTool(t *testing.T) {
	withLinuxAssociationFakes(t)
	t.Setenv("XDG_DATA_HOME", t.TempDir())
	linuxExecutable = func() (string, error) { return "/usr/bin/maakdown", nil }
	linuxLookPath = func(string) (string, error) { return "", errors.New("missing") }
	linuxRun = func(string, ...string) ([]byte, error) {
		t.Fatal("cache command should not run")
		return nil, nil
	}
	if err := installLinuxDesktopEntry(); err != nil {
		t.Fatal(err)
	}
}

func TestLinuxMarkdownDefaultCommands(t *testing.T) {
	withLinuxAssociationFakes(t)
	t.Setenv("XDG_DATA_HOME", t.TempDir())
	linuxExecutable = func() (string, error) { return "/usr/bin/maakdown", nil }
	linuxLookPath = func(name string) (string, error) { return "/usr/bin/" + name, nil }
	var calls [][]string
	linuxRun = func(name string, args ...string) ([]byte, error) {
		call := append([]string{name}, args...)
		calls = append(calls, call)
		if reflect.DeepEqual(args, []string{"query", "default", markdownMimeType}) {
			return []byte(linuxDesktopFileName + "\n"), nil
		}
		return nil, nil
	}

	if !isDefaultMarkdownHandler() {
		t.Fatal("expected Maakdown to be detected as the default")
	}
	if err := setDefaultMarkdownHandler(); err != nil {
		t.Fatal(err)
	}
	expected := []string{"/usr/bin/xdg-mime", "default", linuxDesktopFileName, markdownMimeType}
	found := false
	for _, call := range calls {
		if reflect.DeepEqual(call, expected) {
			found = true
		}
	}
	if !found {
		t.Fatalf("missing default command in %#v", calls)
	}
}

func TestSetLinuxMarkdownDefaultRequiresXdgMime(t *testing.T) {
	withLinuxAssociationFakes(t)
	linuxLookPath = func(string) (string, error) { return "", errors.New("missing") }
	if err := setDefaultMarkdownHandler(); err == nil || !strings.Contains(err.Error(), "xdg-mime") {
		t.Fatalf("expected actionable xdg-mime error, got %v", err)
	}
}
