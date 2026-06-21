//go:build windows

package main

import (
	"bytes"
	_ "embed"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

const (
	markdownHandlerSupported = true
	markdownProgID           = "Maakdown.md"
	registeredAppName        = "Maakdown"
	capabilitiesPath         = `Software\Maakdown\Capabilities`

	assocStrExecutable = 2
	shcneAssocChanged  = 0x08000000
	swShowNormal       = 1
)

var markdownExtensions = []string{".md", ".markdown", ".mdown", ".mkd", ".mdwn"}

var (
	shlwapiDLL        = windows.NewLazySystemDLL("shlwapi.dll")
	assocQueryStringW = shlwapiDLL.NewProc("AssocQueryStringW")
	shell32DLL        = windows.NewLazySystemDLL("shell32.dll")
	shellExecuteW     = shell32DLL.NewProc("ShellExecuteW")
	shChangeNotify    = shell32DLL.NewProc("SHChangeNotify")
	advapi32DLL       = windows.NewLazySystemDLL("advapi32.dll")
	regSetValueExW    = advapi32DLL.NewProc("RegSetValueExW")
)

//go:embed build/windows/markdown.ico
var markdownFileIcon []byte

// registerMarkdownHandler adds Maakdown as a per-user Open With and Default
// Apps candidate. It deliberately does not change the user's current default.
func registerMarkdownHandler() {
	if err := installWindowsMarkdownHandler(); err != nil {
		fmt.Fprintf(os.Stderr, "Maakdown could not register its Markdown handler: %v\n", err)
	}
}

func installWindowsMarkdownHandler() error {
	executable, err := os.Executable()
	if err != nil {
		return fmt.Errorf("resolve Maakdown executable: %w", err)
	}
	executable, err = filepath.Abs(executable)
	if err != nil {
		return fmt.Errorf("resolve absolute Maakdown executable: %w", err)
	}
	iconValue := executable + ",0"
	if iconPath, err := ensureWindowsMarkdownIcon(); err == nil {
		iconValue = windowsIconResource(iconPath)
	} else {
		fmt.Fprintf(os.Stderr, "Maakdown could not install its Markdown file icon: %v\n", err)
	}

	if err := setRegistryDefault(
		registry.CURRENT_USER,
		`Software\Classes\`+markdownProgID,
		"Markdown Document",
	); err != nil {
		return err
	}
	if err := setRegistryDefault(
		registry.CURRENT_USER,
		`Software\Classes\`+markdownProgID+`\DefaultIcon`,
		iconValue,
	); err != nil {
		return err
	}
	if err := setRegistryDefault(
		registry.CURRENT_USER,
		`Software\Classes\`+markdownProgID+`\shell\open\command`,
		markdownOpenCommand(executable),
	); err != nil {
		return err
	}

	for _, extension := range markdownExtensions {
		key, _, err := registry.CreateKey(
			registry.CURRENT_USER,
			`Software\Classes\`+extension+`\OpenWithProgids`,
			registry.SET_VALUE,
		)
		if err != nil {
			return fmt.Errorf("open registry key for %s: %w", extension, err)
		}
		err = setRegistryNoneValue(key, markdownProgID)
		key.Close()
		if err != nil {
			return fmt.Errorf("register %s Open With handler: %w", extension, err)
		}
	}

	capabilities, _, err := registry.CreateKey(
		registry.CURRENT_USER,
		capabilitiesPath,
		registry.SET_VALUE,
	)
	if err != nil {
		return fmt.Errorf("open Maakdown capabilities: %w", err)
	}
	for name, value := range map[string]string{
		"ApplicationName":        registeredAppName,
		"ApplicationDescription": "Read Markdown documents with Maakdown.",
		"ApplicationIcon":        executable + ",0",
	} {
		if err := capabilities.SetStringValue(name, value); err != nil {
			capabilities.Close()
			return fmt.Errorf("write Maakdown capability %s: %w", name, err)
		}
	}
	capabilities.Close()

	associations, _, err := registry.CreateKey(
		registry.CURRENT_USER,
		capabilitiesPath+`\FileAssociations`,
		registry.SET_VALUE,
	)
	if err != nil {
		return fmt.Errorf("open Maakdown file associations: %w", err)
	}
	for _, extension := range markdownExtensions {
		if err := associations.SetStringValue(extension, markdownProgID); err != nil {
			associations.Close()
			return fmt.Errorf("register Maakdown capability for %s: %w", extension, err)
		}
	}
	associations.Close()

	registeredApps, _, err := registry.CreateKey(
		registry.CURRENT_USER,
		`Software\RegisteredApplications`,
		registry.SET_VALUE,
	)
	if err != nil {
		return fmt.Errorf("open RegisteredApplications: %w", err)
	}
	err = registeredApps.SetStringValue(registeredAppName, capabilitiesPath)
	registeredApps.Close()
	if err != nil {
		return fmt.Errorf("register Maakdown application capabilities: %w", err)
	}

	shChangeNotify.Call(shcneAssocChanged, 0, 0, 0)
	return nil
}

func ensureWindowsMarkdownIcon() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user config directory: %w", err)
	}
	dir := filepath.Join(configDir, "Maakdown")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("create icon directory: %w", err)
	}
	iconPath := filepath.Join(dir, "markdown.ico")
	if existing, err := os.ReadFile(iconPath); err == nil && bytes.Equal(existing, markdownFileIcon) {
		return iconPath, nil
	}
	temp, err := os.CreateTemp(dir, ".markdown-icon-*.tmp")
	if err != nil {
		return "", fmt.Errorf("create temporary icon file: %w", err)
	}
	tempPath := temp.Name()
	defer os.Remove(tempPath)
	if _, err := temp.Write(markdownFileIcon); err != nil {
		_ = temp.Close()
		return "", fmt.Errorf("write temporary icon file: %w", err)
	}
	if err := temp.Sync(); err != nil {
		_ = temp.Close()
		return "", fmt.Errorf("sync temporary icon file: %w", err)
	}
	if err := temp.Close(); err != nil {
		return "", fmt.Errorf("close temporary icon file: %w", err)
	}
	if err := os.Rename(tempPath, iconPath); err != nil {
		return "", fmt.Errorf("install Markdown icon: %w", err)
	}
	return iconPath, nil
}

func isDefaultMarkdownHandler() bool {
	handler, err := associatedExecutable(".md")
	if err != nil {
		return false
	}
	executable, err := os.Executable()
	if err != nil {
		return false
	}
	return sameExecutablePath(handler, executable)
}

// Windows 10+ requires the user to choose defaults in system UI. Open the
// per-user Maakdown Default Apps page instead of attempting a silent takeover.
func setDefaultMarkdownHandler() error {
	settingsURI := defaultAppsSettingsURI()
	open, _ := windows.UTF16PtrFromString("open")
	target, _ := windows.UTF16PtrFromString(settingsURI)
	result, _, _ := shellExecuteW.Call(
		0,
		uintptr(unsafe.Pointer(open)),
		uintptr(unsafe.Pointer(target)),
		0,
		0,
		swShowNormal,
	)
	if result <= 32 {
		return fmt.Errorf("open Windows Default Apps settings failed with code %d", result)
	}
	return nil
}

func defaultAppsSettingsURI() string {
	return "ms-settings:defaultapps?registeredAppUser=" +
		url.QueryEscape(registeredAppName)
}

func setRegistryDefault(root registry.Key, path, value string) error {
	key, _, err := registry.CreateKey(root, path, registry.SET_VALUE)
	if err != nil {
		return fmt.Errorf("open registry key %s: %w", path, err)
	}
	defer key.Close()
	if err := key.SetStringValue("", value); err != nil {
		return fmt.Errorf("write registry key %s: %w", path, err)
	}
	return nil
}

func setRegistryNoneValue(key registry.Key, name string) error {
	valueName, err := windows.UTF16PtrFromString(name)
	if err != nil {
		return err
	}
	result, _, _ := regSetValueExW.Call(
		uintptr(key),
		uintptr(unsafe.Pointer(valueName)),
		0,
		registry.NONE,
		0,
		0,
	)
	if result != 0 {
		return windows.Errno(result)
	}
	return nil
}

func markdownOpenCommand(executable string) string {
	return fmt.Sprintf(`"%s" "%%1"`, executable)
}

func windowsIconResource(path string) string {
	return fmt.Sprintf(`"%s",0`, path)
}

func associatedExecutable(extension string) (string, error) {
	association, err := windows.UTF16PtrFromString(extension)
	if err != nil {
		return "", err
	}
	var size uint32
	result, _, _ := assocQueryStringW.Call(
		0,
		assocStrExecutable,
		uintptr(unsafe.Pointer(association)),
		0,
		0,
		uintptr(unsafe.Pointer(&size)),
	)
	if result != 1 || size == 0 {
		return "", fmt.Errorf("size AssocQueryStringW result: HRESULT 0x%x", result)
	}
	buffer := make([]uint16, size)
	result, _, _ = assocQueryStringW.Call(
		0,
		assocStrExecutable,
		uintptr(unsafe.Pointer(association)),
		0,
		uintptr(unsafe.Pointer(&buffer[0])),
		uintptr(unsafe.Pointer(&size)),
	)
	if result != 0 {
		return "", fmt.Errorf("AssocQueryStringW failed with HRESULT 0x%x", result)
	}
	return windows.UTF16ToString(buffer), nil
}

func sameExecutablePath(left, right string) bool {
	leftInfo, leftErr := os.Stat(left)
	rightInfo, rightErr := os.Stat(right)
	if leftErr == nil && rightErr == nil {
		return os.SameFile(leftInfo, rightInfo)
	}
	return strings.EqualFold(filepath.Clean(left), filepath.Clean(right))
}
