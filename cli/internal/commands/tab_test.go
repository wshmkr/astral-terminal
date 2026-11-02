package commands

import (
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

const (
	tabCreatedReply = `{"id":"call","ok":true,"result":{"workspaceId":"ws-0123456789","paneId":"pane-0123456789","surfaceId":"surf-0123456789"}}`
	tabRefReply     = `{"id":"call","ok":true,"result":{"surfaceId":"surf-0123456789"}}`
	tabMovedReply   = `{"id":"call","ok":true,"result":{"surfaceId":"surf-0123456789","paneId":"pane-0123456789"}}`
	tabListReply    = `{"id":"call","ok":true,"result":{"surfaces":[` +
		`{"surfaceId":"surf-0123456789","paneId":"pane-0123456789","workspaceId":"ws-0123456789","type":"terminal","name":"shell","cwd":"/work","active":true},` +
		`{"surfaceId":"surf-9876543210","paneId":"pane-0123456789","workspaceId":"ws-0123456789","type":"browser","name":"docs","url":"https://example.com","active":false}` +
		`]}}`
)

func tabCheckRequest(t *testing.T, requests <-chan map[string]any, method string, want map[string]any) {
	t.Helper()
	req := <-requests
	if req["method"] != method {
		t.Errorf("method = %v, want %s", req["method"], method)
	}
	if got, _ := req["params"].(map[string]any); !reflect.DeepEqual(got, want) {
		t.Errorf("params = %v, want %v", got, want)
	}
}

func TestTabUsageErrors(t *testing.T) {
	cases := [][]string{
		{"tab", "bogus"},
		{"tab", "list", "extra"},
		{"tab", "list", "--tab", "surf"},
		{"tab", "list", "--pane", "pane", "--workspace", "2"},
		{"tab", "new", "extra"},
		{"tab", "new", "--url", "https://example.com"},
		{"tab", "new", "--browser", "--cwd", "/work"},
		{"tab", "new", "--cwd", ""},
		{"tab", "focus"},
		{"tab", "focus", "a", "b"},
		{"tab", "close", "a", "b"},
		{"tab", "rename"},
		{"tab", "rename", " "},
		{"tab", "rename", "a", "b", "c"},
		{"tab", "move"},
		{"tab", "move", "--pane", "pane"},
		{"tab", "move", "surf"},
		{"tab", "move", "surf", "extra", "--pane", "pane"},
		{"tab", "move", "surf", "--pane", "pane", "--index", "-1"},
		{"tab", "move", "surf", "--pane", "pane", "--index", "first"},
	}
	for _, args := range cases {
		if r := run(args...); r.code != ExitUsage {
			t.Errorf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
	}
}

func TestTabMoveRequiresPaneMessage(t *testing.T) {
	r := run("tab", "move", "surf")
	if !strings.Contains(r.stderr, "requires --pane") {
		t.Errorf("stderr = %q", r.stderr)
	}
}

func TestTabRequests(t *testing.T) {
	cases := []struct {
		name   string
		args   []string
		method string
		reply  string
		want   map[string]any
	}{
		{
			name:   "list",
			args:   []string{"tab", "list", "--workspace", "2"},
			method: "surface.list",
			reply:  tabListReply,
			want:   map[string]any{"workspaceId": "2", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "new terminal",
			args:   []string{"tab", "new", "--pane", "pane", "--cwd", "~/work"},
			method: "surface.create",
			reply:  tabCreatedReply,
			want:   map[string]any{"paneId": "pane", "cwd": "~/work", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "new browser",
			args:   []string{"tab", "new", "--browser", "--url", "https://example.com", "--focus"},
			method: "surface.create",
			reply:  tabCreatedReply,
			want: map[string]any{
				"browser":         true,
				"url":             "https://example.com",
				"focus":           true,
				"callerSurfaceId": "caller-1",
			},
		},
		{
			name:   "focus positional",
			args:   []string{"tab", "focus", "surf"},
			method: "surface.focus",
			reply:  tabRefReply,
			want:   map[string]any{"surfaceId": "surf", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "focus by flag",
			args:   []string{"tab", "focus", "--tab", "surf"},
			method: "surface.focus",
			reply:  tabRefReply,
			want:   map[string]any{"surfaceId": "surf", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "close defaults to caller",
			args:   []string{"tab", "close"},
			method: "surface.close",
			reply:  tabRefReply,
			want:   map[string]any{"callerSurfaceId": "caller-1"},
		},
		{
			name:   "positional overrides flag",
			args:   []string{"tab", "close", "surf", "--tab", "other"},
			method: "surface.close",
			reply:  tabRefReply,
			want:   map[string]any{"surfaceId": "surf", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "rename defaults to caller",
			args:   []string{"tab", "rename", "logs"},
			method: "surface.rename",
			reply:  tabRefReply,
			want:   map[string]any{"name": "logs", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "rename positional",
			args:   []string{"tab", "rename", "surf", "logs"},
			method: "surface.rename",
			reply:  tabRefReply,
			want:   map[string]any{"surfaceId": "surf", "name": "logs", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "move sends pane as destination",
			args:   []string{"tab", "move", "surf", "--pane", "dest"},
			method: "surface.move",
			reply:  tabMovedReply,
			want:   map[string]any{"surfaceId": "surf", "toPaneId": "dest", "callerSurfaceId": "caller-1"},
		},
		{
			name:   "move index zero",
			args:   []string{"tab", "move", "surf", "--pane", "dest", "--index", "0"},
			method: "surface.move",
			reply:  tabMovedReply,
			want:   map[string]any{"surfaceId": "surf", "toPaneId": "dest", "index": float64(0), "callerSurfaceId": "caller-1"},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			requests := fakeApp(t, map[string]string{tc.method: tc.reply})
			t.Setenv("ASTRAL_SURFACE_ID", "caller-1")
			if r := run(tc.args...); r.code != ExitOK {
				t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
			}
			tabCheckRequest(t, requests, tc.method, tc.want)
		})
	}
}

func TestTabNewCwd(t *testing.T) {
	relative, err := filepath.Abs("sub")
	if err != nil {
		t.Fatal(err)
	}
	relativeTilde, err := filepath.Abs("~sub")
	if err != nil {
		t.Fatal(err)
	}
	absolute, err := filepath.Abs(filepath.Join(t.TempDir(), "dir"))
	if err != nil {
		t.Fatal(err)
	}
	requests := fakeApp(t, map[string]string{"surface.create": tabCreatedReply})
	t.Setenv("ASTRAL_SURFACE_ID", "")
	for cwd, want := range map[string]string{
		"sub":    relative,
		absolute: absolute,
		"~":      "~",
		"~/dev":  "~/dev",
		"~sub":   relativeTilde,
	} {
		if r := run("tab", "new", "--cwd", cwd); r.code != ExitOK {
			t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
		}
		tabCheckRequest(t, requests, "surface.create", map[string]any{"cwd": want})
	}
}

func TestTabEmptyTargetDoesNotDefaultToCaller(t *testing.T) {
	requests := fakeApp(t, map[string]string{"surface.close": tabRefReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")
	if r := run("tab", "close", "--tab", ""); r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	tabCheckRequest(t, requests, "surface.close", map[string]any{"surfaceId": "", "callerSurfaceId": "caller-1"})
}

func TestTabFlagsResetBetweenRuns(t *testing.T) {
	requests := fakeApp(t, map[string]string{"surface.move": tabMovedReply})
	t.Setenv("ASTRAL_SURFACE_ID", "")
	if r := run("tab", "move", "surf", "--pane", "dest", "--index", "3"); r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	<-requests
	if r := run("tab", "move", "surf", "--pane", "dest"); r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	tabCheckRequest(t, requests, "surface.move", map[string]any{"surfaceId": "surf", "toPaneId": "dest"})
}

func TestTabListOutput(t *testing.T) {
	fakeApp(t, map[string]string{"surface.list": tabListReply})
	t.Setenv("ASTRAL_SURFACE_ID", "")
	r := run("tab", "list")
	if r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	lines := strings.Split(strings.TrimSpace(r.stdout), "\n")
	if len(lines) != 3 {
		t.Fatalf("stdout = %q", r.stdout)
	}
	for i, want := range [][]string{
		{"TAB", "PANE", "TYPE", "NAME", "ACTIVE", "LOCATION"},
		{"surf-012", "pane-012", "terminal", "shell", "*", "/work"},
		{"surf-987", "pane-012", "browser", "docs", "-", "https://example.com"},
	} {
		if got := strings.Fields(lines[i]); !reflect.DeepEqual(got, want) {
			t.Errorf("line %d = %v, want %v", i, got, want)
		}
	}
}

func TestTabListJSON(t *testing.T) {
	fakeApp(t, map[string]string{"surface.list": tabListReply})
	t.Setenv("ASTRAL_SURFACE_ID", "")
	r := run("tab", "list", "--json")
	if r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	for _, want := range []string{
		`"surfaceId": "surf-0123456789"`,
		`"workspaceId": "ws-0123456789"`,
		`"cwd": "/work"`,
		`"url": "https://example.com"`,
		`"active": true`,
		`"active": false`,
	} {
		if !strings.Contains(r.stdout, want) {
			t.Errorf("stdout missing %s: %q", want, r.stdout)
		}
	}
	if strings.Contains(r.stdout, "null") {
		t.Errorf("stdout has null for an absent field: %q", r.stdout)
	}
}
