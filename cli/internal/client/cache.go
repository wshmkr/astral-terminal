package client

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

type HostCache struct {
	Dir  string
	Port string

	uid   int
	owner func(os.FileInfo) (int, bool)
	state int
}

const (
	cacheUnchecked = iota
	cacheOK
	cacheBad
)

func DefaultCacheDir() string {
	if xdg := os.Getenv("XDG_RUNTIME_DIR"); xdg != "" {
		return filepath.Join(xdg, "astral")
	}
	tmp := os.Getenv("TMPDIR")
	if tmp == "" {
		tmp = "/tmp"
	}
	return filepath.Join(tmp, "astral-"+strconv.Itoa(os.Getuid()))
}

func NewHostCache(dir, port string) *HostCache {
	return &HostCache{Dir: dir, Port: port, uid: os.Getuid(), owner: fileOwner}
}

func (c *HostCache) path() string {
	return filepath.Join(c.Dir, "host-"+c.Port)
}

func (c *HostCache) usable() bool {
	if c.state == cacheUnchecked {
		c.state = cacheBad
		if os.MkdirAll(c.Dir, 0o700) == nil {
			_ = os.Chmod(c.Dir, 0o700)
			if info, err := os.Stat(c.Dir); err == nil && info.IsDir() {
				if uid, ok := c.owner(info); ok && uid == c.uid {
					c.state = cacheOK
				}
			}
		}
	}
	return c.state == cacheOK
}

func (c *HostCache) Load() string {
	if !c.usable() {
		return ""
	}
	data, err := os.ReadFile(c.path())
	if err != nil {
		return ""
	}
	line, _, _ := strings.Cut(string(data), "\n")
	return strings.TrimSpace(line)
}

// Store records host as the working host; the port changes each launch, so other ports' entries
// are removed first.
func (c *HostCache) Store(host string) {
	if !c.usable() {
		return
	}
	if stale, err := filepath.Glob(filepath.Join(c.Dir, "host-*")); err == nil {
		for _, p := range stale {
			_ = os.Remove(p)
		}
	}
	_ = os.WriteFile(c.path(), []byte(host+"\n"), 0o600)
}
