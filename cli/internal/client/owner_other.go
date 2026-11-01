//go:build !unix

package client

import "os"

func fileOwner(os.FileInfo) (int, bool) {
	return os.Getuid(), true
}
