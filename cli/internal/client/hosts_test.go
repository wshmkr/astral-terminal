package client

import (
	"os"
	"path/filepath"
	"reflect"
	"strconv"
	"testing"
)

func writeFile(t *testing.T, name, content string) string {
	t.Helper()
	p := filepath.Join(t.TempDir(), name)
	if err := os.WriteFile(p, []byte(content), 0o600); err != nil {
		t.Fatal(err)
	}
	return p
}

const routeTable = "Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT\n" +
	"eth0\t0010A8C0\t00000000\t0001\t0\t0\t0\t00F0FFFF\t0\t0\t0\n" +
	"eth0\t00000000\t0110A8C0\t0003\t0\t0\t0\t00000000\t0\t0\t0\n"

func TestCandidatesOrder(t *testing.T) {
	route := writeFile(t, "route", routeTable)
	resolv := writeFile(t, "resolv.conf", "# generated\nsearch lan\nnameserver 10.255.255.254\nnameserver 8.8.8.8\n")
	got := Candidates("172.20.0.1", route, resolv)
	want := []string{"172.20.0.1", "127.0.0.1", "192.168.16.1", "10.255.255.254"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Candidates = %v, want %v", got, want)
	}
}

func TestCandidatesDeduplicates(t *testing.T) {
	route := writeFile(t, "route", routeTable)
	resolv := writeFile(t, "resolv.conf", "nameserver 192.168.16.1\n")
	got := Candidates("192.168.16.1", route, resolv)
	want := []string{"192.168.16.1", "127.0.0.1"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Candidates = %v, want %v", got, want)
	}
}

func TestCandidatesMissingSources(t *testing.T) {
	missing := filepath.Join(t.TempDir(), "missing")
	got := Candidates("", missing, missing)
	if !reflect.DeepEqual(got, []string{"127.0.0.1"}) {
		t.Errorf("Candidates = %v", got)
	}
}

func TestHostCacheReadWrite(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "astral")
	c := NewHostCache(dir, "4000")
	if got := c.Load(); got != "" {
		t.Fatalf("Load on empty cache = %q", got)
	}
	info, err := os.Stat(dir)
	if err != nil {
		t.Fatal(err)
	}
	if perm := info.Mode().Perm(); perm != 0o700 {
		t.Errorf("cache dir mode = %o", perm)
	}
	if err := os.WriteFile(filepath.Join(dir, "host-3999"), []byte("10.0.0.1\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	c.Store("172.20.0.1")
	if _, err := os.Stat(filepath.Join(dir, "host-3999")); !os.IsNotExist(err) {
		t.Errorf("stale cache entry not removed: %v", err)
	}
	if got := NewHostCache(dir, "4000").Load(); got != "172.20.0.1" {
		t.Errorf("Load = %q", got)
	}
}

func TestHostCacheRefusesForeignOwner(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "astral")
	if err := os.MkdirAll(dir, 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "host-4000"), []byte("6.6.6.6\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	c := NewHostCache(dir, "4000")
	c.owner = func(os.FileInfo) (int, bool) { return c.uid + 1, true }
	if got := c.Load(); got != "" {
		t.Errorf("Load from foreign-owned dir = %q", got)
	}
	c.Store("1.2.3.4")
	data, err := os.ReadFile(filepath.Join(dir, "host-4000"))
	if err != nil || string(data) != "6.6.6.6\n" {
		t.Errorf("foreign-owned cache modified: %q, %v", data, err)
	}
}

func TestDefaultCacheDir(t *testing.T) {
	t.Setenv("XDG_RUNTIME_DIR", "/run/user/1000")
	if got := DefaultCacheDir(); got != "/run/user/1000/astral" {
		t.Errorf("DefaultCacheDir = %q", got)
	}
	t.Setenv("XDG_RUNTIME_DIR", "")
	t.Setenv("TMPDIR", "/var/tmp")
	if got, want := DefaultCacheDir(), filepath.Join("/var/tmp", "astral-"+strconv.Itoa(os.Getuid())); got != want {
		t.Errorf("DefaultCacheDir = %q, want %q", got, want)
	}
}
