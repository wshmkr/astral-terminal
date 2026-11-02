//go:build unix

package client

import (
	"os"
	"path/filepath"
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
