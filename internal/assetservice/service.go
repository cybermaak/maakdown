package assetservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// xmlnsDeclaration matches XML namespace declarations (e.g.
// xmlns="http://www.w3.org/2000/svg"). These legitimately carry http(s) URIs
// but are identifiers, not network fetches, so they must not trip the
// remote-reference check below.
var xmlnsDeclaration = regexp.MustCompile(`(?i)xmlns(:[a-z0-9_-]+)?\s*=\s*("[^"]*"|'[^']*')`)

const maxAssetSize int64 = 25 * 1024 * 1024

type Service struct {
	mu       sync.RWMutex
	token    string
	assets   map[string]assetRecord
	server   *http.Server
	listener net.Listener
	baseURL  string
}

type AssetRef struct {
	ID    string `json:"id"`
	URL   string `json:"url"`
	MIME  string `json:"mime"`
	Error string `json:"error,omitempty"`
}

type assetRecord struct {
	path string
	mime string
	size int64
}

func New() *Service {
	return &Service{
		token:  randomToken(),
		assets: make(map[string]assetRecord),
	}
}

func (s *Service) Start(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.server != nil {
		return
	}

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return
	}

	s.listener = listener
	s.baseURL = "http://" + listener.Addr().String()
	mux := http.NewServeMux()
	mux.HandleFunc("/assets/", s.handleAsset)
	s.server = &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 2 * time.Second,
	}

	go func() {
		_ = s.server.Serve(listener)
	}()
}

func (s *Service) Shutdown(ctx context.Context) {
	s.mu.Lock()
	server := s.server
	s.server = nil
	s.listener = nil
	s.baseURL = ""
	s.assets = make(map[string]assetRecord)
	s.mu.Unlock()

	if server != nil {
		shutdownCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		defer cancel()
		_ = server.Shutdown(shutdownCtx)
	}
}

func (s *Service) ResolveAsset(documentPath string, rawRelativePath string) (AssetRef, error) {
	resolved, trustedRoot, err := ResolveAssetPath(documentPath, rawRelativePath, "")
	if err != nil {
		return AssetRef{Error: err.Error()}, err
	}

	info, err := os.Stat(resolved)
	if err != nil {
		return AssetRef{Error: err.Error()}, err
	}
	if info.Size() > maxAssetSize {
		err := fmt.Errorf("asset exceeds max size under %s", trustedRoot)
		return AssetRef{Error: err.Error()}, err
	}

	mime, err := DetectImageMIME(resolved)
	if err != nil {
		return AssetRef{Error: err.Error()}, err
	}

	if mime == "image/svg+xml" {
		if err := ValidateSVG(resolved); err != nil {
			return AssetRef{Error: err.Error()}, err
		}
	}

	id := randomToken()
	s.mu.Lock()
	if s.baseURL == "" {
		s.mu.Unlock()
		return AssetRef{Error: "asset server is not running"}, errors.New("asset server is not running")
	}
	s.assets[id] = assetRecord{path: resolved, mime: mime, size: info.Size()}
	url := s.baseURL + "/assets/" + s.token + "/" + id
	s.mu.Unlock()

	return AssetRef{ID: id, URL: url, MIME: mime}, nil
}

func (s *Service) RevokeAsset(assetID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.assets, assetID)
}

func (s *Service) handleAsset(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/assets/"), "/")
	if len(parts) != 2 {
		http.NotFound(w, r)
		return
	}

	token, id := parts[0], parts[1]
	s.mu.RLock()
	if token != s.token {
		s.mu.RUnlock()
		http.NotFound(w, r)
		return
	}
	record, ok := s.assets[id]
	s.mu.RUnlock()
	if !ok {
		http.NotFound(w, r)
		return
	}

	file, err := os.Open(record.path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer file.Close()

	w.Header().Set("Content-Type", record.mime)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Cache-Control", "private, max-age=300")
	http.ServeContent(w, r, filepath.Base(record.path), time.Now(), file)
}

func DetectTrustedRoot(documentPath string, configuredRoot string) (string, error) {
	if configuredRoot != "" {
		return canonicalDirectory(configuredRoot)
	}

	current, err := canonicalDirectory(filepath.Dir(documentPath))
	if err != nil {
		return "", err
	}

	for {
		if exists(filepath.Join(current, ".git")) {
			return current, nil
		}
		parent := filepath.Dir(current)
		if parent == current {
			return canonicalDirectory(filepath.Dir(documentPath))
		}
		current = parent
	}
}

func ResolveAssetPath(documentPath string, rawRelativePath string, configuredRoot string) (string, string, error) {
	if rawRelativePath == "" {
		return "", "", errors.New("asset path is empty")
	}
	if filepath.IsAbs(rawRelativePath) {
		return "", "", errors.New("absolute asset paths are not allowed")
	}

	trustedRoot, err := DetectTrustedRoot(documentPath, configuredRoot)
	if err != nil {
		return "", "", err
	}

	base, err := canonicalDirectory(filepath.Dir(documentPath))
	if err != nil {
		return "", "", err
	}
	candidate := filepath.Clean(filepath.Join(base, rawRelativePath))
	resolved, err := filepath.EvalSymlinks(candidate)
	if err != nil {
		return "", "", err
	}

	rel, err := filepath.Rel(trustedRoot, resolved)
	if err != nil {
		return "", "", err
	}
	if rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) || filepath.IsAbs(rel) {
		return "", "", errors.New("asset path escapes trusted root")
	}

	return resolved, trustedRoot, nil
}

func DetectImageMIME(path string) (string, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer file.Close()

	var header [512]byte
	n, _ := io.ReadFull(file, header[:])
	mime := http.DetectContentType(header[:n])

	ext := strings.ToLower(filepath.Ext(path))
	if ext == ".svg" {
		return "image/svg+xml", nil
	}
	switch mime {
	case "image/png", "image/jpeg", "image/gif", "image/webp":
		return mime, nil
	default:
		return "", fmt.Errorf("unsupported asset MIME type %q", mime)
	}
}

func ValidateSVG(path string) error {
	bytes, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	// Strip namespace declarations first so the standard SVG/xlink namespace
	// URIs (always http(s)) don't read as remote references.
	scrubbed := xmlnsDeclaration.ReplaceAllString(string(bytes), "")
	lower := strings.ToLower(scrubbed)
	blocked := []string{"<script", "onload=", "onclick=", "onerror=", "<foreignobject", "javascript:", "http://", "https://"}
	for _, pattern := range blocked {
		if strings.Contains(lower, pattern) {
			return fmt.Errorf("blocked unsafe SVG content: %s", pattern)
		}
	}
	return nil
}

func canonicalDirectory(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", err
	}
	resolved, err := filepath.EvalSymlinks(abs)
	if err != nil {
		return "", err
	}
	return resolved, nil
}

func exists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func randomToken() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(b[:])
}
