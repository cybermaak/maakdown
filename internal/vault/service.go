package vault

import (
	"crypto/sha256"
	"encoding/hex"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"
)

type Service struct{}

type VaultIndex struct {
	Version string            `json:"version"`
	Notes   map[string]string `json:"notes"`
}

func New() *Service {
	return &Service{}
}

func (s *Service) GetVaultIndex(root string) (VaultIndex, error) {
	canonicalRoot, err := filepath.EvalSymlinks(root)
	if err != nil {
		return VaultIndex{}, err
	}

	var paths []string
	err = filepath.WalkDir(canonicalRoot, func(path string, entry fs.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if entry.IsDir() {
			if path != canonicalRoot && shouldSkipDirectory(entry.Name()) {
				return filepath.SkipDir
			}
			return nil
		}
		extension := strings.ToLower(filepath.Ext(entry.Name()))
		if extension == ".md" || extension == ".markdown" || extension == ".mdown" {
			paths = append(paths, path)
		}
		return nil
	})
	if err != nil {
		return VaultIndex{}, err
	}

	sort.Strings(paths)
	notes := make(map[string]string, len(paths)*2)
	hasher := sha256.New()
	for _, path := range paths {
		relative, err := filepath.Rel(canonicalRoot, path)
		if err != nil {
			return VaultIndex{}, err
		}
		relativeWithoutExtension := strings.TrimSuffix(filepath.ToSlash(relative), filepath.Ext(relative))
		base := strings.TrimSuffix(filepath.Base(path), filepath.Ext(path))
		for _, key := range []string{base, relativeWithoutExtension} {
			normalized := normalizeKey(key)
			if _, exists := notes[normalized]; !exists {
				notes[normalized] = path
			}
		}
		hasher.Write([]byte(relative))
		hasher.Write([]byte{0})
	}

	return VaultIndex{
		Version: hex.EncodeToString(hasher.Sum(nil))[:16],
		Notes:   notes,
	}, nil
}

func shouldSkipDirectory(name string) bool {
	return strings.HasPrefix(name, ".") || name == "node_modules" || name == "vendor" || name == "build"
}

func normalizeKey(value string) string {
	return strings.ToLower(strings.TrimSpace(strings.ReplaceAll(value, "\\", "/")))
}
