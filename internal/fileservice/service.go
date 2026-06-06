package fileservice

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"maakdown/internal/assetservice"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Service struct {
	ctx context.Context
}

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

func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *Service) OpenDocument() (OpenDocumentResult, error) {
	if s.ctx == nil {
		return OpenDocumentResult{}, ErrFileDialogNotImplemented
	}

	path, err := runtime.OpenFileDialog(s.ctx, runtime.OpenDialogOptions{
		Title: "Open Markdown Document",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Markdown Documents (*.md, *.markdown, *.mdown)",
				Pattern:     "*.md;*.markdown;*.mdown",
			},
			{
				DisplayName: "All Files (*.*)",
				Pattern:     "*.*",
			},
		},
	})
	if err != nil {
		return OpenDocumentResult{}, err
	}
	if path == "" {
		return OpenDocumentResult{}, ErrNoFileSelected
	}
	return s.OpenDocumentAt(path)
}

func (s *Service) OpenDocumentAt(path string) (OpenDocumentResult, error) {
	abs, err := canonicalPath(path)
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
	trustedRoot, err := assetservice.DetectTrustedRoot(abs, "")
	if err != nil {
		return OpenDocumentResult{}, err
	}
	return OpenDocumentResult{
		Path:        abs,
		Contents:    string(bytes),
		DocumentDir: dir,
		TrustedRoot: trustedRoot,
		ModTime:     formatTime(info.ModTime()),
	}, nil
}

func (s *Service) ReadDocument(path string) (DocumentBytes, error) {
	abs, err := canonicalPath(path)
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

func canonicalPath(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	if evaluated, evalErr := filepath.EvalSymlinks(abs); evalErr == nil {
		abs = evaluated
	}
	return filepath.Clean(abs), nil
}

func formatTime(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}
