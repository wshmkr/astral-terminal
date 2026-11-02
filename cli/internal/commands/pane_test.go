package commands

import (
	"encoding/json"
	"strings"
	"testing"
)

const paneSplitReply = `{"id":"call","ok":true,"result":{"workspaceId":"ws-0123456789","paneId":"pane-0123456789","surfaceId":"surf-0123456789"}}`

func paneParams(t *testing.T, requests <-chan map[string]any, method string) map[string]any {
	t.Helper()
	req := <-requests
	if req["method"] != method {
		t.Fatalf("method = %v, want %s", req["method"], method)
	}
	return req["params"].(map[string]any)
}

func paneArgs(prefix []string, rest ...string) []string {
	return append(append([]string{}, prefix...), rest...)
}

func TestPaneSplitDirections(t *testing.T) {
	requests := fakeApp(t, map[string]string{"pane.split": paneSplitReply})
	for _, prefix := range [][]string{{"split"}, {"pane", "split"}} {
		for _, direction := range []string{"left", "right", "up", "down"} {
			args := paneArgs(prefix, direction)
			if r := run(args...); r.code != ExitOK {
				t.Fatalf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
			}
			if params := paneParams(t, requests, "pane.split"); params["direction"] != direction {
				t.Errorf("%v: params = %v", args, params)
			}
		}
	}
}

func TestPaneSplitUsageErrors(t *testing.T) {
	requests := fakeApp(t, map[string]string{"pane.split": paneSplitReply})
	for _, prefix := range [][]string{{"split"}, {"pane", "split"}} {
		for _, rest := range [][]string{
			{},
			{"sideways"},
			{"left", "right"},
			{"left", "--url", "https://example.com"},
			{"left", "--browser=false", "--url", "https://example.com"},
			{"left", "--browser", "--url", ""},
			{"left", "--nope"},
		} {
			args := paneArgs(prefix, rest...)
			if r := run(args...); r.code != ExitUsage {
				t.Errorf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
			}
		}
	}
	if len(requests) != 0 {
		t.Errorf("usage errors reached the app: %d requests", len(requests))
	}
}

func TestPaneSplitFlags(t *testing.T) {
	requests := fakeApp(t, map[string]string{"pane.split": paneSplitReply})
	for _, prefix := range [][]string{{"split"}, {"pane", "split"}} {
		args := paneArgs(prefix, "up", "--browser", "--url", "https://example.com", "--focus")
		if r := run(args...); r.code != ExitOK {
			t.Fatalf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
		params := paneParams(t, requests, "pane.split")
		if params["browser"] != true || params["url"] != "https://example.com" || params["focus"] != true {
			t.Errorf("%v: params = %v", args, params)
		}

		args = paneArgs(prefix, "up")
		if r := run(args...); r.code != ExitOK {
			t.Fatalf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
		params = paneParams(t, requests, "pane.split")
		for _, key := range []string{"browser", "url", "focus"} {
			if _, ok := params[key]; ok {
				t.Errorf("%v: %s leaked from a previous run: %v", args, key, params)
			}
		}
	}
}

func TestPaneList(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"panes":[` +
		`{"paneId":"pane-0123456789","workspaceId":"ws-0123456789","focused":true,"activeSurfaceId":"surf-0123456789","tabCount":2},` +
		`{"paneId":"pane-9876543210","workspaceId":"ws-0123456789","focused":false,"activeSurfaceId":"surf-9876543210","tabCount":1}]}}`
	requests := fakeApp(t, map[string]string{"pane.list": reply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("pane", "list", "--workspace", "2")
	if r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	params := paneParams(t, requests, "pane.list")
	if params["workspaceId"] != "2" || params["callerSurfaceId"] != "caller-1" {
		t.Errorf("params = %v", params)
	}
	want := "   PANE      WORKSPACE  ACTIVE TAB  TABS\n" +
		"*  pane-012  ws-01234   surf-012    2\n" +
		"   pane-987  ws-01234   surf-987    1\n"
	if r.stdout != want {
		t.Errorf("stdout = %q, want %q", r.stdout, want)
	}

	r = run("--json", "pane", "list")
	if r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	<-requests
	var out struct {
		Panes []map[string]any `json:"panes"`
	}
	if err := json.Unmarshal([]byte(r.stdout), &out); err != nil {
		t.Fatalf("stdout is not JSON: %q", r.stdout)
	}
	if len(out.Panes) != 2 || out.Panes[0]["paneId"] != "pane-0123456789" ||
		out.Panes[0]["workspaceId"] != "ws-0123456789" || out.Panes[0]["focused"] != true ||
		out.Panes[0]["activeSurfaceId"] != "surf-0123456789" || out.Panes[0]["tabCount"] != float64(2) {
		t.Errorf("json output = %v", out)
	}

	for _, args := range [][]string{
		{"pane", "list", "extra"},
		{"pane", "list", "--pane", "abcd"},
		{"pane", "list", "--tab", "abcd"},
	} {
		if r := run(args...); r.code != ExitUsage {
			t.Errorf("%v: %+v", args, r)
		}
	}
	if len(requests) != 0 {
		t.Errorf("usage errors reached the app: %d requests", len(requests))
	}
}

func TestPaneFocus(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"paneId":"pane-0123456789"}}`
	requests := fakeApp(t, map[string]string{"pane.focus": reply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("pane", "focus", "abcd")
	if r.code != ExitOK || r.stdout != "focused pane pane-012\n" {
		t.Errorf("positional: %+v", r)
	}
	if params := paneParams(t, requests, "pane.focus"); params["paneId"] != "abcd" {
		t.Errorf("positional: params = %v", params)
	}

	if r := run("pane", "focus", "--pane", "wxyz"); r.code != ExitOK {
		t.Errorf("--pane: %+v", r)
	}
	if params := paneParams(t, requests, "pane.focus"); params["paneId"] != "wxyz" {
		t.Errorf("--pane: params = %v", params)
	}

	if r := run("pane", "focus", "abcd", "--pane", "wxyz"); r.code != ExitOK {
		t.Errorf("both: %+v", r)
	}
	if params := paneParams(t, requests, "pane.focus"); params["paneId"] != "abcd" {
		t.Errorf("both: params = %v", params)
	}

	for _, args := range [][]string{
		{"pane", "focus"},
		{"pane", "focus", ""},
		{"pane", "focus", "--pane", ""},
		{"pane", "focus", "--tab", "abcd"},
		{"pane", "focus", "--workspace", "2"},
		{"pane", "focus", "abcd", "efgh"},
	} {
		if r := run(args...); r.code != ExitUsage {
			t.Errorf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
	}
	if r := run("pane", "focus"); !strings.HasPrefix(r.stderr, "astral: usage: astral pane focus <pane>\n") {
		t.Errorf("usage: %q", r.stderr)
	}
	if len(requests) != 0 {
		t.Errorf("usage errors reached the app: %d requests", len(requests))
	}
}

func TestPaneClose(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"paneId":"pane-0123456789"}}`
	requests := fakeApp(t, map[string]string{"pane.close": reply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("pane", "close")
	if r.code != ExitOK || r.stdout != "closed pane pane-012\n" {
		t.Errorf("no argument: %+v", r)
	}
	params := paneParams(t, requests, "pane.close")
	if _, ok := params["paneId"]; ok || params["callerSurfaceId"] != "caller-1" {
		t.Errorf("no argument: params = %v", params)
	}

	if r := run("pane", "close", "abcd", "--pane", "wxyz"); r.code != ExitOK {
		t.Errorf("positional: %+v", r)
	}
	if params := paneParams(t, requests, "pane.close"); params["paneId"] != "abcd" {
		t.Errorf("positional: params = %v", params)
	}

	if r := run("pane", "close", "--pane", ""); r.code != ExitOK {
		t.Errorf("empty --pane: %+v", r)
	}
	if params := paneParams(t, requests, "pane.close"); params["paneId"] != "" {
		t.Errorf("empty --pane: params = %v", params)
	}

	if r := run("pane", "close", "abcd", "efgh"); r.code != ExitUsage {
		t.Errorf("two arguments: %+v", r)
	}
}

func TestPaneResize(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"paneId":"pane-0123456789","sizes":[0.3,0.7]}}`
	requests := fakeApp(t, map[string]string{"pane.resize": reply})

	r := run("pane", "resize", "abcd", "--size", "30")
	if r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	params := paneParams(t, requests, "pane.resize")
	if params["paneId"] != "abcd" || params["size"] != float64(30) {
		t.Errorf("params = %v", params)
	}
	if !strings.Contains(r.stdout, "pane-012") || !strings.Contains(r.stdout, "30.0% 70.0%") {
		t.Errorf("stdout = %q", r.stdout)
	}

	for _, size := range []string{"5", "95"} {
		if r := run("pane", "resize", "--size", size); r.code != ExitOK {
			t.Errorf("--size %s: %+v", size, r)
		}
		<-requests
	}

	for _, args := range [][]string{
		{"pane", "resize"},
		{"pane", "resize", "--size", "4.9"},
		{"pane", "resize", "--size", "95.1"},
		{"pane", "resize", "--size", "NaN"},
		{"pane", "resize", "--size", "big"},
		{"pane", "resize", "abcd", "efgh", "--size", "30"},
	} {
		if r := run(args...); r.code != ExitUsage {
			t.Errorf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
	}
	if len(requests) != 0 {
		t.Errorf("usage errors reached the app: %d requests", len(requests))
	}
}
