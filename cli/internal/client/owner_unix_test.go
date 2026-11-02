//go:build unix

package client

import (
	"os"
	"path/filepath"
	"syscall"
	"testing"
)

func TestHostCacheRefusesSymlinkedDir(t *testing.T) {
	target := t.TempDir()
	if err := os.Chmod(target, 0o755); err != nil {
		t.Fatal(err)
	}
	victim := filepath.Join(target, "host-1")
	if err := os.WriteFile(victim, []byte("keep\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	link := filepath.Join(t.TempDir(), "astral")
	if err := os.Symlink(target, link); err != nil {
		t.Fatal(err)
	}

	c := NewHostCache(link, "4000")
	if got := c.Load(); got != "" {
		t.Errorf("Load through symlink = %q", got)
	}
	c.Store("1.2.3.4")

	if _, err := os.Stat(victim); err != nil {
		t.Errorf("Store removed a file through the symlink: %v", err)
	}
	info, err := os.Stat(target)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o755 {
		t.Errorf("symlink target mode = %o, want 755", info.Mode().Perm())
	}
}

func TestHostCacheForeignOwnerKeepsMode(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	c := NewHostCache(dir, "4000")
	c.owner = func(os.FileInfo) (int, bool) { return c.uid + 1, true }
	c.Load()
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatal(err)
	}
	if info.Mode().Perm() != 0o755 {
		t.Errorf("mode = %o, want 755", info.Mode().Perm())
	}
}

func TestHostCacheRepairsOpenDir(t *testing.T) {
	dir := t.TempDir()
	if err := os.Chmod(dir, 0o777); err != nil {
		t.Fatal(err)
	}
	c := NewHostCache(dir, "4000")
	c.Store("1.2.3.4")
	if got := NewHostCache(dir, "4000").Load(); got != "1.2.3.4" {
		t.Errorf("Load = %q", got)
	}
}

func TestHostCacheRejectsUntrustedEntry(t *testing.T) {
	const planted = "6.6.6.6\n"
	plantFile := func(mode os.FileMode) func(t *testing.T, path string) {
		return func(t *testing.T, path string) {
			if err := os.WriteFile(path, []byte(planted), mode); err != nil {
				t.Fatal(err)
			}
			if err := os.Chmod(path, mode); err != nil {
				t.Fatal(err)
			}
		}
	}
	foreignFile := func(c *HostCache) {
		c.owner = func(info os.FileInfo) (int, bool) {
			if info.IsDir() {
				return c.uid, true
			}
			return c.uid + 1, true
		}
	}
	cases := []struct {
		name  string
		plant func(t *testing.T, path string)
		setup func(c *HostCache)
	}{
		{name: "group or world access", plant: plantFile(0o644)},
		{name: "foreign owner", plant: plantFile(0o600), setup: foreignFile},
		{name: "symlink", plant: func(t *testing.T, path string) {
			target := filepath.Join(t.TempDir(), "target")
			if err := os.WriteFile(target, []byte(planted), 0o600); err != nil {
				t.Fatal(err)
			}
			if err := os.Symlink(target, path); err != nil {
				t.Fatal(err)
			}
		}},
		{name: "fifo", plant: func(t *testing.T, path string) {
			if err := syscall.Mkfifo(path, 0o600); err != nil {
				t.Fatal(err)
			}
		}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			tc.plant(t, filepath.Join(dir, "host-4000"))
			c := NewHostCache(dir, "4000")
			if tc.setup != nil {
				tc.setup(c)
			}
			if got := c.Load(); got != "" {
				t.Errorf("Load = %q", got)
			}
			c.Store("1.2.3.4")
			if got := NewHostCache(dir, "4000").Load(); got != "1.2.3.4" {
				t.Errorf("Load after Store = %q", got)
			}
		})
	}
}

func TestAccessIsPrivate(t *testing.T) {
	dir := t.TempDir()
	for mode, want := range map[os.FileMode]bool{0o700: true, 0o750: false, 0o707: false} {
		if err := os.Chmod(dir, mode); err != nil {
			t.Fatal(err)
		}
		info, err := os.Lstat(dir)
		if err != nil {
			t.Fatal(err)
		}
		if got := accessIsPrivate(info); got != want {
			t.Errorf("accessIsPrivate(%o) = %v, want %v", mode, got, want)
		}
	}
}
