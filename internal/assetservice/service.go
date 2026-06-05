package assetservice

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"path/filepath"
	"sync"
)

type Service struct {
	mu     sync.Mutex
	token  string
	assets map[string]assetRecord
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
}

func New() *Service {
	return &Service{
		token:  randomToken(),
		assets: make(map[string]assetRecord),
	}
}

func (s *Service) Start(ctx context.Context) {
	// P3 will start the loopback-only HTTP asset server here.
}

func (s *Service) Shutdown(ctx context.Context) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.assets = make(map[string]assetRecord)
}

func (s *Service) ResolveAsset(documentPath string, rawRelativePath string) (AssetRef, error) {
	if filepath.IsAbs(rawRelativePath) {
		return AssetRef{Error: "absolute paths are not allowed"}, errors.New("absolute asset paths are not allowed")
	}

	base := filepath.Dir(documentPath)
	cleaned := filepath.Clean(filepath.Join(base, rawRelativePath))
	id := randomToken()

	s.mu.Lock()
	s.assets[id] = assetRecord{path: cleaned}
	s.mu.Unlock()

	return AssetRef{
		ID:  id,
		URL: "http://127.0.0.1:0/assets/" + s.token + "/" + id,
	}, nil
}

func (s *Service) RevokeAsset(assetID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.assets, assetID)
}

func randomToken() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "uninitialized"
	}
	return hex.EncodeToString(b[:])
}
