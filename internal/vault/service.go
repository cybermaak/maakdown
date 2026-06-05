package vault

type Service struct{}

type VaultIndex struct {
	Version string            `json:"version"`
	Notes   map[string]string `json:"notes"`
}

func New() *Service {
	return &Service{}
}

func (s *Service) GetVaultIndex(root string) (VaultIndex, error) {
	return VaultIndex{
		Version: "empty",
		Notes:   map[string]string{},
	}, nil
}
