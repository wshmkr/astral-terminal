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

	uid    int
	owner  func(os.FileInfo) (int, bool)
	state  int
	loaded string
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
	return filepath.Join(os.TempDir(), "astral-"+strconv.Itoa(os.Getuid()))
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
		if c.checkDir() {
			c.state = cacheOK
		}
	}
	return c.state == cacheOK
}

func (c *HostCache) checkDir() bool {
	if os.MkdirAll(c.Dir, 0o700) != nil {
		return false
	}
	_ = os.Chmod(c.Dir, 0o700)
	info, err := os.Stat(c.Dir)
	if err != nil || !info.IsDir() {
		return false
	}
	uid, ok := c.owner(info)
	return ok && uid == c.uid
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
	c.loaded = strings.TrimSpace(line)
	return c.loaded
}

// Store records host as the working host; the port changes each launch, so other ports' entries
// are removed first.
func (c *HostCache) Store(host string) {
	if host == c.loaded || !c.usable() {
		return
	}
	if stale, err := filepath.Glob(filepath.Join(c.Dir, "host-*")); err == nil {
		for _, p := range stale {
			_ = os.Remove(p)
		}
	}
	_ = os.WriteFile(c.path(), []byte(host+"\n"), 0o600)
}
