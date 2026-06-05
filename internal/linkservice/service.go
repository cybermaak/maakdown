package linkservice

import (
	"context"
	"errors"
	"net/url"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type Service struct {
	ctx context.Context
}

func New() *Service {
	return &Service{}
}

func (s *Service) SetContext(ctx context.Context) {
	s.ctx = ctx
}

func (s *Service) OpenExternal(rawURL string) error {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return err
	}

	switch parsed.Scheme {
	case "http", "https", "mailto":
	default:
		return errors.New("unsupported external link scheme")
	}

	if s.ctx == nil {
		return errors.New("link service is not initialized")
	}

	runtime.BrowserOpenURL(s.ctx, rawURL)
	return nil
}
