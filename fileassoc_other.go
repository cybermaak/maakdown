//go:build !darwin && !linux && !windows

package main

import "errors"

const markdownHandlerSupported = false

func registerMarkdownHandler() {}

func isDefaultMarkdownHandler() bool {
	return false
}

func setDefaultMarkdownHandler() error {
	return errors.New("setting the default Markdown opener is not supported on this platform yet")
}
