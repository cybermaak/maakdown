package watcher

type Service struct {
	path string
}

func New() *Service {
	return &Service{}
}

func (s *Service) StartWatch(path string) error {
	s.path = path
	return nil
}

func (s *Service) StopWatch() {
	s.path = ""
}

func (s *Service) WatchedPath() string {
	return s.path
}
