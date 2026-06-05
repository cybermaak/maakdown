package config

type Service struct {
	current AppConfig
}

type AppConfig struct {
	Theme              string `json:"theme"`
	HighlighterEngine  string `json:"highlighterEngine"`
	FrontmatterDisplay string `json:"frontmatterDisplay"`
}

func New() *Service {
	return &Service{
		current: AppConfig{
			Theme:              "system",
			HighlighterEngine:  "highlightjs",
			FrontmatterDisplay: "panel",
		},
	}
}

func (s *Service) GetConfig() AppConfig {
	return s.current
}

func (s *Service) SetConfig(next AppConfig) AppConfig {
	s.current = next
	return s.current
}
