package commands

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"net"
	"strings"
	"testing"
	"time"
)

type result struct {
	code   int
	stdout string
	stderr string
}

func run(args ...string) result {
	var out, errOut bytes.Buffer
	code := Execute(context.Background(), args, &out, &errOut)
	return result{code, out.String(), errOut.String()}
}

// fakeApp answers each connection's request line with replies[method]; a method with no entry
// gets no reply.
func fakeApp(t *testing.T, replies map[string]string) <-chan map[string]any {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	_, port, _ := net.SplitHostPort(ln.Addr().String())
	t.Setenv("ASTRAL_PORT", port)
	t.Setenv("ASTRAL_TOKEN", "secret")
	t.Setenv("XDG_RUNTIME_DIR", t.TempDir())
	requests := make(chan map[string]any, 8)
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func() {
				defer conn.Close()
				r := bufio.NewReader(conn)
				if _, err := r.ReadString('\n'); err != nil {
					return
				}
				line, err := r.ReadString('\n')
				if err != nil {
					return
				}
				var req map[string]any
				_ = json.Unmarshal([]byte(line), &req)
				requests <- req
				reply, ok := replies[req["method"].(string)]
				if !ok {
					time.Sleep(time.Second)
					return
				}
				conn.Write([]byte(`{"id":"auth","ok":true,"result":{"authenticated":true}}` + "\n" + reply + "\n"))
			}()
		}
	}()
	return requests
}

func TestUsageErrors(t *testing.T) {
	cases := [][]string{
		{"bogus"},
		{"split"},
		{"split", "left"},
		{"split", "right", "down"},
		{"pane", "split"},
		{"pane", "split", "up"},
		{"pane", "bogus"},
		{"call"},
		{"call", "x.y", "{not json"},
		{"ping", "extra"},
		{"--nope"},
		{"--timeout", "0s", "ping"},
	}
	for _, args := range cases {
		if r := run(args...); r.code != ExitUsage {
			t.Errorf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
	}
}

func TestNotConnected(t *testing.T) {
	t.Setenv("ASTRAL_PORT", "")
	t.Setenv("ASTRAL_TOKEN", "")
	r := run("ping")
	if r.code != ExitUnreachable {
		t.Errorf("code = %d", r.code)
	}
	if r.stderr != "astral: not connected to Astral Terminal\n" {
		t.Errorf("stderr = %q", r.stderr)
	}
}

func TestSplitSendsTargetParams(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"workspaceId":"ws-0123456789","paneId":"pane-0123456789","surfaceId":"surf-0123456789"}}`
	requests := fakeApp(t, map[string]string{"pane.split": reply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	for _, args := range [][]string{
		{"split", "right", "--pane", "abcd"},
		{"pane", "split", "right", "--pane", "abcd"},
	} {
		r := run(args...)
		if r.code != ExitOK {
			t.Fatalf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
		req := <-requests
		params := req["params"].(map[string]any)
		if req["method"] != "pane.split" || params["direction"] != "right" ||
			params["paneId"] != "abcd" || params["callerSurfaceId"] != "caller-1" {
			t.Errorf("%v: request = %v", args, req)
		}
		if _, ok := params["workspaceId"]; ok {
			t.Errorf("%v: unexpected workspaceId", args)
		}
		if !strings.Contains(r.stdout, "pane-012") || strings.Contains(r.stdout, "pane-0123456789") {
			t.Errorf("%v: stdout = %q", args, r.stdout)
		}
	}

	r := run("--json", "split", "down", "--workspace", "2", "--tab", "surf")
	if r.code != ExitOK {
		t.Fatalf("code = %d, stderr = %q", r.code, r.stderr)
	}
	params := (<-requests)["params"].(map[string]any)
	if params["direction"] != "down" || params["workspaceId"] != "2" || params["surfaceId"] != "surf" {
		t.Errorf("params = %v", params)
	}
	if _, ok := params["paneId"]; ok {
		t.Error("--pane leaked from a previous run")
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(r.stdout), &out); err != nil {
		t.Fatalf("stdout is not JSON: %q", r.stdout)
	}
	if out["paneId"] != "pane-0123456789" {
		t.Errorf("json output = %v", out)
	}
}

func TestPingHumanAndJSON(t *testing.T) {
	fakeApp(t, map[string]string{"system.ping": `{"id":"call","ok":true,"result":{"pong":true}}`})
	if r := run("ping"); r.code != ExitOK || r.stdout != "pong\n" {
		t.Errorf("human: %+v", r)
	}
	if r := run("ping", "--json"); r.code != ExitOK || r.stdout != "{\n  \"pong\": true\n}\n" {
		t.Errorf("json: %+v", r)
	}
}

func TestAppErrorExitCode(t *testing.T) {
	fakeApp(t, map[string]string{
		"pane.split": `{"id":"call","ok":false,"error":{"code":"invalid_params","message":"no such pane"}}`,
	})
	r := run("split", "right")
	if r.code != ExitAppError || !strings.Contains(r.stderr, "no such pane") {
		t.Errorf("%+v", r)
	}
}

func TestNoReplyExitCode(t *testing.T) {
	fakeApp(t, map[string]string{})
	r := run("--timeout", "100ms", "ping")
	if r.code != ExitUnreachable || !strings.Contains(r.stderr, "no reply") {
		t.Errorf("%+v", r)
	}
}

func TestUnknownMethodHint(t *testing.T) {
	fakeApp(t, map[string]string{
		"system.ping":         `{"id":"call","ok":false,"error":{"code":"unknown_method","message":"unknown method"}}`,
		"system.capabilities": `{"id":"call","ok":true,"result":{"protocolVersion":1,"methods":["pane.split"]}}`,
	})
	r := run("ping")
	if r.code != ExitAppError || !strings.Contains(r.stderr, "versions differ") {
		t.Errorf("%+v", r)
	}
}

func TestCallPrintsRawReply(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"version":"1.0.0"}}`
	requests := fakeApp(t, map[string]string{"app.identify": reply})
	r := run("call", "app.identify")
	if r.code != ExitOK || r.stdout != reply+"\n" {
		t.Errorf("%+v", r)
	}
	if req := <-requests; req["params"] != nil {
		t.Errorf("params = %v", req["params"])
	}
}

func TestVersion(t *testing.T) {
	Version = "1.2.3"
	t.Cleanup(func() { Version = "dev" })
	fakeApp(t, map[string]string{"app.identify": `{"id":"call","ok":true,"result":{"version":"0.9.0"}}`})
	r := run("version")
	if r.code != ExitOK || r.stdout != "astral CLI 1.2.3\nAstral Terminal 0.9.0\n" {
		t.Errorf("%+v", r)
	}
	if r := run("--version"); r.stdout != "1.2.3\n" {
		t.Errorf("--version: %+v", r)
	}
	t.Setenv("ASTRAL_PORT", "")
	if r := run("version", "--json"); r.code != ExitOK || r.stdout != "{\n  \"cli\": \"1.2.3\",\n  \"app\": null\n}\n" {
		t.Errorf("offline: %+v", r)
	}
}

func TestIdentify(t *testing.T) {
	t.Setenv("ASTRAL_SURFACE_ID", "surf-1")
	t.Setenv("ASTRAL_PID", "0042")
	t.Setenv("ASTRAL_VERSION", "0.9.0")
	r := run("identify")
	want := "{\n  \"surfaceId\": \"surf-1\",\n  \"pid\": 42,\n  \"version\": \"0.9.0\"\n}\n"
	if r.code != ExitOK || r.stdout != want {
		t.Errorf("%+v", r)
	}
	t.Setenv("ASTRAL_SURFACE_ID", "")
	if r := run("identify"); r.code != ExitAppError {
		t.Errorf("outside a shell: %+v", r)
	}
}
