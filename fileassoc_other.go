//go:build !darwin && !linux

package main

import "errors"

// Windows file association is a planned follow-up (see
// docs/superpowers/specs/2026-06-09-macos-markdown-file-association-design.md).
const markdownHandlerSupported = false

func registerMarkdownHandler() {}

func isDefaultMarkdownHandler() bool {
	return false
}

func setDefaultMarkdownHandler() error {
	return errors.New("setting the default Markdown opener is not supported on this platform yet")
}
