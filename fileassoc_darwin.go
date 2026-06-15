//go:build darwin

package main

/*
// LaunchServices' UTI/handler calls are deprecated since macOS 12 in favor of
// the UTType/NSWorkspace Objective-C APIs, but remain functional and are the
// simplest C-callable surface (per the design spec); silence the noise.
#cgo CFLAGS: -Wno-deprecated-declarations
#cgo LDFLAGS: -framework CoreServices -framework CoreFoundation
#include <CoreServices/CoreServices.h>
#include <stdlib.h>

// Resolve the UTI the system currently maps to the "md" filename extension.
// Caller must CFRelease the returned ref.
static CFStringRef maakResolveMarkdownUTI(void) {
	return UTTypeCreatePreferredIdentifierForTag(kUTTagClassFilenameExtension, CFSTR("md"), NULL);
}

// Returns a copy of the default handler bundle id for the md UTI, or NULL.
// Caller must free the returned C string.
static char *maakCopyDefaultMarkdownHandler(void) {
	CFStringRef uti = maakResolveMarkdownUTI();
	if (uti == NULL) {
		return NULL;
	}
	CFStringRef handler = LSCopyDefaultRoleHandlerForContentType(uti, kLSRolesAll);
	CFRelease(uti);
	if (handler == NULL) {
		return NULL;
	}
	CFIndex length = CFStringGetMaximumSizeForEncoding(CFStringGetLength(handler), kCFStringEncodingUTF8) + 1;
	char *buffer = malloc(length);
	if (buffer == NULL || !CFStringGetCString(handler, buffer, length, kCFStringEncodingUTF8)) {
		free(buffer);
		buffer = NULL;
	}
	CFRelease(handler);
	return buffer;
}

// Sets this bundle id as the default handler for the md UTI. Returns OSStatus.
static int maakSetDefaultMarkdownHandler(const char *bundleID) {
	CFStringRef uti = maakResolveMarkdownUTI();
	if (uti == NULL) {
		return -1;
	}
	CFStringRef bundle = CFStringCreateWithCString(NULL, bundleID, kCFStringEncodingUTF8);
	if (bundle == NULL) {
		CFRelease(uti);
		return -1;
	}
	OSStatus status = LSSetDefaultRoleHandlerForContentType(uti, kLSRolesAll, bundle);
	CFRelease(bundle);
	CFRelease(uti);
	return (int)status;
}
*/
import "C"

import (
	"fmt"
	"strings"
	"unsafe"
)

const markdownHandlerSupported = true

func registerMarkdownHandler() {}

// isDefaultMarkdownHandler reports whether this bundle is the system default
// opener for the UTI the OS currently maps to the "md" extension.
func isDefaultMarkdownHandler() bool {
	handler := C.maakCopyDefaultMarkdownHandler()
	if handler == nil {
		return false
	}
	defer C.free(unsafe.Pointer(handler))
	return strings.EqualFold(C.GoString(handler), appBundleID)
}

// setDefaultMarkdownHandler makes this bundle the default Markdown opener.
// Silent at the OS level, so callers must gate it behind explicit user intent.
func setDefaultMarkdownHandler() error {
	bundleID := C.CString(appBundleID)
	defer C.free(unsafe.Pointer(bundleID))
	if status := C.maakSetDefaultMarkdownHandler(bundleID); status != 0 {
		return fmt.Errorf("LSSetDefaultRoleHandlerForContentType failed with OSStatus %d", int(status))
	}
	return nil
}
