package fileservice

import "errors"

var ErrFileDialogNotImplemented = errors.New("native file dialog is not implemented yet")
var ErrNoFileSelected = errors.New("no file was selected")
