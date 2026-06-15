//go:build linux

package main

import (
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

const (
	markdownHandlerSupported = true
	linuxDesktopFileName     = "com.maak.maakdown.desktop"
	markdownMimeType         = "text/markdown"
)

var (
	linuxExecutable = os.Executable
	linuxLookPath   = exec.LookPath
	linuxRun        = func(name string, args ...string) ([]byte, error) {
		return exec.Command(name, args...).CombinedOutput()
	}
)

// registerMarkdownHandler adds Maakdown as an Open With candidate without
// changing the user's current default application.
func registerMarkdownHandler() {
	go func() {
		if err := installLinuxDesktopEntry(); err != nil {
			fmt.Fprintf(os.Stderr, "Maakdown could not register its Markdown desktop entry: %v\n", err)
		}
	}()
}

func installLinuxDesktopEntry() error {
	executable, err := linuxExecutable()
	if err != nil {
		return fmt.Errorf("resolve Maakdown executable: %w", err)
	}
	executable, err = filepath.Abs(executable)
	if err != nil {
		return fmt.Errorf("resolve absolute Maakdown executable: %w", err)
	}

	applicationsDir, err := linuxApplicationsDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(applicationsDir, 0o755); err != nil {
		return fmt.Errorf("create applications directory: %w", err)
	}

	contents := linuxDesktopEntry(executable)
	path := filepath.Join(applicationsDir, linuxDesktopFileName)
	if existing, readErr := os.ReadFile(path); readErr != nil || string(existing) != contents {
		if err := writeFileAtomically(path, []byte(contents), 0o644); err != nil {
			return fmt.Errorf("write desktop entry: %w", err)
		}
	}

	if command, lookErr := linuxLookPath("update-desktop-database"); lookErr == nil {
		// Cache refresh is best-effort: the desktop entry itself remains valid
		// on environments that do not ship desktop-file-utils.
		_, _ = linuxRun(command, applicationsDir)
	}
	return nil
}

func linuxApplicationsDir() (string, error) {
	if dataHome := strings.TrimSpace(os.Getenv("XDG_DATA_HOME")); dataHome != "" {
		return filepath.Join(dataHome, "applications"), nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("resolve user home: %w", err)
	}
	return filepath.Join(home, ".local", "share", "applications"), nil
}

func linuxDesktopEntry(executable string) string {
	quotedExecutable := strings.NewReplacer(
		`\`, `\\`,
		`"`, `\"`,
		"`", "\\`",
		"$", "\\$",
	).Replace(executable)
	return fmt.Sprintf(`[Desktop Entry]
Type=Application
Version=1.0
Name=Maakdown
Comment=Read Markdown documents
Exec="%s" %%f
TryExec="%s"
Icon=maakdown
Terminal=false
Categories=Office;Utility;
MimeType=%s;
StartupNotify=true
`, quotedExecutable, quotedExecutable, markdownMimeType)
}

func writeFileAtomically(path string, contents []byte, mode os.FileMode) error {
	temp, err := os.CreateTemp(filepath.Dir(path), ".maakdown-desktop-*.tmp")
	if err != nil {
		return err
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	if err := temp.Chmod(mode); err != nil {
		_ = temp.Close()
		return err
	}
	if _, err := temp.Write(contents); err != nil {
		_ = temp.Close()
		return err
	}
	if err := temp.Sync(); err != nil {
		_ = temp.Close()
		return err
	}
	if err := temp.Close(); err != nil {
		return err
	}
	return os.Rename(tempPath, path)
}

func isDefaultMarkdownHandler() bool {
	command, err := linuxLookPath("xdg-mime")
	if err != nil {
		return false
	}
	output, err := linuxRun(command, "query", "default", markdownMimeType)
	return err == nil && strings.TrimSpace(string(output)) == linuxDesktopFileName
}

func setDefaultMarkdownHandler() error {
	if _, err := linuxLookPath("xdg-mime"); err != nil {
		return errors.New("xdg-mime is required to set the default Markdown opener")
	}
	if err := installLinuxDesktopEntry(); err != nil {
		return err
	}
	command, _ := linuxLookPath("xdg-mime")
	output, err := linuxRun(command, "default", linuxDesktopFileName, markdownMimeType)
	if err != nil {
		message := strings.TrimSpace(string(output))
		if message != "" {
			return fmt.Errorf("xdg-mime failed: %s: %w", message, err)
		}
		return fmt.Errorf("xdg-mime failed: %w", err)
	}
	return nil
}
