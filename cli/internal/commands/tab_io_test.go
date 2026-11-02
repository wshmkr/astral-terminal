package commands

import (
	"encoding/json"
	"errors"
	"io"
	"reflect"
	"strings"
	"testing"
	"testing/iotest"
)

const (
	tabIOSendReply  = `{"id":"call","ok":true,"result":{"surfaceId":"surf-1","bytes":3}}`
	tabIOPlainReply = `{"id":"call","ok":true,"result":{"surfaceId":"surf-1"}}`
)

func tabIOSetStdin(t *testing.T, r io.Reader) {
	t.Helper()
	Root.SetIn(r)
	t.Cleanup(func() { Root.SetIn(nil) })
}

func tabIOSendApp(t *testing.T) <-chan map[string]any {
	t.Helper()
	return fakeApp(t, map[string]string{"surface.sendText": tabIOSendReply})
}

func tabIOParams(t *testing.T, requests <-chan map[string]any, method string) map[string]any {
	t.Helper()
	req := <-requests
	if req["method"] != method {
		t.Fatalf("method = %v, want %s", req["method"], method)
	}
	params, ok := req["params"].(map[string]any)
	if !ok {
		t.Fatalf("params = %#v", req["params"])
	}
	return params
}

func TestTabIOSendUsageErrors(t *testing.T) {
	cases := [][]string{
		{"tab", "send"},
		{"tab", "send", "a", "b"},
		{"tab", "send-key"},
		{"tab", "send-key", "bogus"},
		{"tab", "send-key", "up", "Enter"},
		{"tab", "read", "extra"},
		{"tab", "read", "--lines", "0"},
		{"tab", "read", "--lines", "-1"},
		{"tab", "read", "--lines", "abc"},
		{"tab", "clear-history", "a", "b"},
	}
	for _, args := range cases {
		if got := run(args...); got.code != ExitUsage {
			t.Errorf("%v: code = %d, stderr = %q", args, got.code, got.stderr)
		}
	}
}

func TestTabIOSendVerbatim(t *testing.T) {
	requests := tabIOSendApp(t)
	text := "echo \"$(x)\" \x1b[A\t\n é"
	if got := run("tab", "send", "--tab", "surf", text); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	} else if got.stdout != "" {
		t.Errorf("stdout = %q", got.stdout)
	}
	params := tabIOParams(t, requests, "surface.sendText")
	if params["text"] != text {
		t.Errorf("text = %q", params["text"])
	}
	if params["surfaceId"] != "surf" {
		t.Errorf("surfaceId = %v", params["surfaceId"])
	}
	if _, ok := params["paste"]; ok {
		t.Errorf("paste = %v", params["paste"])
	}
}

func TestTabIOSendStdin(t *testing.T) {
	requests := tabIOSendApp(t)
	tabIOSetStdin(t, strings.NewReader("line one\nline two\n"))
	if got := run("tab", "send", "-"); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	params := tabIOParams(t, requests, "surface.sendText")
	if params["text"] != "line one\nline two\n" {
		t.Errorf("text = %q", params["text"])
	}
}

func TestTabIOSendStdinEnter(t *testing.T) {
	requests := tabIOSendApp(t)
	tabIOSetStdin(t, strings.NewReader("ls"))
	if got := run("tab", "send", "-", "--enter"); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	params := tabIOParams(t, requests, "surface.sendText")
	if params["text"] != "ls\r" {
		t.Errorf("text = %q", params["text"])
	}
}

func TestTabIOSendStdinInvalidUTF8(t *testing.T) {
	tabIOSetStdin(t, strings.NewReader("a\xffb"))
	if got := run("tab", "send", "-"); got.code != ExitUsage {
		t.Errorf("code = %d, stderr = %q", got.code, got.stderr)
	}
}

func TestTabIOSendStdinReadError(t *testing.T) {
	tabIOSetStdin(t, iotest.ErrReader(errors.New("boom")))
	got := run("tab", "send", "-")
	if got.code != ExitAppError || !strings.Contains(got.stderr, "boom") {
		t.Errorf("code = %d, stderr = %q", got.code, got.stderr)
	}
}

func TestTabIOSendEnter(t *testing.T) {
	requests := tabIOSendApp(t)
	if got := run("tab", "send", "ls", "--enter"); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	params := tabIOParams(t, requests, "surface.sendText")
	if params["text"] != "ls\r" {
		t.Errorf("text = %q", params["text"])
	}
}

func TestTabIOSendPasteEnterSubmitsAfterPaste(t *testing.T) {
	requests := tabIOSendApp(t)
	got := run("--json", "tab", "send", "--pane", "pane", "ls", "--paste", "--enter")
	if got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	first := tabIOParams(t, requests, "surface.sendText")
	if first["text"] != "ls" || first["paste"] != true || first["paneId"] != "pane" {
		t.Errorf("first = %v", first)
	}
	second := tabIOParams(t, requests, "surface.sendText")
	want := map[string]any{"surfaceId": "surf-1", "text": "\r"}
	if !reflect.DeepEqual(second, want) {
		t.Errorf("second = %v", second)
	}
	var out struct {
		SurfaceID string `json:"surfaceId"`
		Bytes     int    `json:"bytes"`
	}
	if err := json.Unmarshal([]byte(got.stdout), &out); err != nil {
		t.Fatalf("stdout = %q: %v", got.stdout, err)
	}
	if out.SurfaceID != "surf-1" || out.Bytes != 6 {
		t.Errorf("out = %+v", out)
	}
}

func TestTabIOSendKey(t *testing.T) {
	requests := fakeApp(t, map[string]string{"surface.sendKey": tabIOPlainReply})
	if got := run("tab", "send-key", "up", "ctrl-c", "alt-."); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	} else if got.stdout != "" {
		t.Errorf("stdout = %q", got.stdout)
	}
	params := tabIOParams(t, requests, "surface.sendKey")
	want := []any{"up", "ctrl-c", "alt-."}
	if !reflect.DeepEqual(params["keys"], want) {
		t.Errorf("keys = %v", params["keys"])
	}
}

func TestTabIOReadPrintsTextVerbatim(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"surfaceId":"surf-1","text":"100%d\n\u001b[31m  red  \n\n end"}}`
	requests := fakeApp(t, map[string]string{"surface.read": reply})
	got := run("tab", "read")
	if got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	if want := "100%d\n\x1b[31m  red  \n\n end"; got.stdout != want {
		t.Errorf("stdout = %q, want %q", got.stdout, want)
	}
	params := tabIOParams(t, requests, "surface.read")
	for _, key := range []string{"lines", "scrollback", "ansi"} {
		if _, ok := params[key]; ok {
			t.Errorf("%s = %v", key, params[key])
		}
	}
}

func TestTabIOReadFlagsAndJSON(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"surfaceId":"surf-1","text":"x"}}`
	requests := fakeApp(t, map[string]string{"surface.read": reply})
	got := run("--json", "tab", "read", "--scrollback", "--lines", "5", "--ansi")
	if got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(got.stdout), &out); err != nil {
		t.Fatalf("stdout = %q: %v", got.stdout, err)
	}
	if want := map[string]any{"surfaceId": "surf-1", "text": "x"}; !reflect.DeepEqual(out, want) {
		t.Errorf("out = %v", out)
	}
	params := tabIOParams(t, requests, "surface.read")
	if params["lines"] != float64(5) || params["scrollback"] != true || params["ansi"] != true {
		t.Errorf("params = %v", params)
	}
}

func TestTabIOClearHistory(t *testing.T) {
	requests := fakeApp(t, map[string]string{"surface.clearHistory": tabIOPlainReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller")
	if got := run("tab", "clear-history"); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	params := tabIOParams(t, requests, "surface.clearHistory")
	if params["callerSurfaceId"] != "caller" {
		t.Errorf("params = %v", params)
	}
}

func TestTabIOClearHistoryPositional(t *testing.T) {
	requests := fakeApp(t, map[string]string{"surface.clearHistory": tabIOPlainReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller")
	if got := run("tab", "clear-history", "--tab", "flag", "positional"); got.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", got.code, got.stderr)
	}
	params := tabIOParams(t, requests, "surface.clearHistory")
	if params["surfaceId"] != "positional" {
		t.Errorf("params = %v", params)
	}
}
