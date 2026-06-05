package fileservice

import (
	"os"
	"path/filepath"
	"time"
)

type Service struct{}

type OpenDocumentResult struct {
	Path        string `json:"path"`
	Contents    string `json:"contents"`
	DocumentDir string `json:"documentDir"`
	TrustedRoot string `json:"trustedRoot"`
	ModTime     string `json:"modTime"`
	VaultID     string `json:"vaultId,omitempty"`
}

type DocumentBytes struct {
	Path     string `json:"path"`
	Contents string `json:"contents"`
	ModTime  string `json:"modTime"`
}

func New() *Service {
	return &Service{}
}

func (s *Service) OpenDocument() (OpenDocumentResult, error) {
	return OpenDocumentResult{}, ErrFileDialogNotImplemented
}

func (s *Service) OpenDocumentAt(path string) (OpenDocumentResult, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return OpenDocumentResult{}, err
	}

	info, err := os.Stat(abs)
	if err != nil {
		return OpenDocumentResult{}, err
	}

	bytes, err := os.ReadFile(abs)
	if err != nil {
		return OpenDocumentResult{}, err
	}

	dir := filepath.Dir(abs)
	return OpenDocumentResult{
		Path:        abs,
		Contents:    string(bytes),
		DocumentDir: dir,
		TrustedRoot: dir,
		ModTime:     formatTime(info.ModTime()),
	}, nil
}

func (s *Service) ReadDocument(path string) (DocumentBytes, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return DocumentBytes{}, err
	}

	info, err := os.Stat(abs)
	if err != nil {
		return DocumentBytes{}, err
	}

	bytes, err := os.ReadFile(abs)
	if err != nil {
		return DocumentBytes{}, err
	}

	return DocumentBytes{
		Path:     abs,
		Contents: string(bytes),
		ModTime:  formatTime(info.ModTime()),
	}, nil
}

func formatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}
