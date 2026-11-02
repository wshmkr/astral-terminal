package commands

import (
	"encoding/json"
	"path/filepath"
	"testing"
)

const (
	workspaceActionReply = `{"id":"call","ok":true,"result":{"workspaceId":"ws-0123456789"}}`
	workspaceTreeReply   = `{"id":"call","ok":true,"result":{"workspaces":[` +
		`{"id":"ws-0123456789","index":1,"name":"main","active":true,"paneCount":2,"tabCount":3,"layout":` +
		`{"splitId":"split-1","direction":"vertical","sizes":[0.5,0.5],"children":[` +
		`{"paneId":"pane-0123456789","focused":true,"tabs":[` +
		`{"surfaceId":"surf-0123456789","type":"terminal","name":"shell","cwd":"~/dev","active":true},` +
		`{"surfaceId":"surf-1111111111","type":"browser","name":"docs","url":"https://example.com","active":false}]},` +
		`{"paneId":"pane-2222222222","focused":false,"tabs":[` +
		`{"surfaceId":"surf-3333333333","type":"terminal","name":"build","cwd":"/src","active":true}]}]}},` +
		`{"id":"ws-5678901234","index":2,"name":"logs","active":false,"paneCount":1,"tabCount":1,"layout":` +
		`{"paneId":"pane-4444444444","focused":true,"tabs":[` +
		`{"surfaceId":"surf-5555555555","type":"terminal","name":"tail","cwd":"~","active":true}]}}]}}`
)

func workspaceParams(t *testing.T, requests <-chan map[string]any, method string) map[string]any {
	t.Helper()
	req := <-requests
	if req["method"] != method {
		t.Fatalf("method = %v, want %s", req["method"], method)
	}
	params, _ := req["params"].(map[string]any)
	return params
}

func TestWorkspaceUsageErrors(t *testing.T) {
	cases := [][]string{
		{"workspace", "bogus"},
		{"workspace", "list", "x"},
		{"workspace", "current", "x"},
		{"workspace", "new", "a", "b"},
		{"workspace", "select"},
		{"workspace", "select", "1", "2"},
		{"workspace", "rename"},
		{"workspace", "rename", "a", "b", "c"},
		{"workspace", "close", "a", "b"},
		{"workspace", "move"},
		{"workspace", "move", "x"},
		{"workspace", "move", "0"},
		{"workspace", "move", "-1"},
		{"workspace", "move", "a", "b", "c"},
		{"tree", "x"},
	}
	for _, args := range cases {
		if r := run(args...); r.code != ExitUsage {
			t.Errorf("%v: code = %d, stderr = %q", args, r.code, r.stderr)
		}
	}
}

func TestWorkspaceList(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"workspaces":[` +
		`{"id":"ws-0123456789","index":1,"name":"main","active":true,"paneCount":2,"tabCount":3},` +
		`{"id":"ws-5678901234","index":2,"name":"logs","active":false,"paneCount":1,"tabCount":1}]}}`
	requests := fakeApp(t, map[string]string{"workspace.list": reply})

	r := run("workspace", "list")
	want := "INDEX  ID        NAME  PANES  TABS  ACTIVE\n" +
		"1      ws-01234  main  2      3     yes\n" +
		"2      ws-56789  logs  1      1     no\n"
	if r.code != ExitOK || r.stdout != want {
		t.Errorf("%+v", r)
	}
	if params := workspaceParams(t, requests, "workspace.list"); params["layout"] != nil {
		t.Errorf("params = %v", params)
	}
}

func TestWorkspaceCurrent(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"id":"ws-0123456789","index":2,"name":"main","active":false}}`
	requests := fakeApp(t, map[string]string{"workspace.current": reply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("workspace", "current")
	want := "INDEX  ID        NAME  ACTIVE\n2      ws-01234  main  no\n"
	if r.code != ExitOK || r.stdout != want {
		t.Errorf("%+v", r)
	}
	if params := workspaceParams(t, requests, "workspace.current"); params["callerSurfaceId"] != "caller-1" {
		t.Errorf("params = %v", params)
	}
}

func TestWorkspaceNew(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"workspaceId":"ws-0123456789","paneId":"pane-0123456789","surfaceId":"surf-0123456789"}}`
	requests := fakeApp(t, map[string]string{"workspace.create": reply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("workspace", "new")
	want := "WORKSPACE  PANE      TAB\nws-01234   pane-012  surf-012\n"
	if r.code != ExitOK || r.stdout != want {
		t.Errorf("%+v", r)
	}
	if params := workspaceParams(t, requests, "workspace.create"); len(params) != 0 {
		t.Errorf("background create params = %v", params)
	}

	abs := t.TempDir()
	if r := run("workspace", "new", "build", "--cwd", abs, "--focus"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	params := workspaceParams(t, requests, "workspace.create")
	if params["name"] != "build" || params["cwd"] != abs || params["focus"] != true {
		t.Errorf("params = %v", params)
	}

	if r := run("workspace", "new", "--cwd", "~/dev"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	if params := workspaceParams(t, requests, "workspace.create"); params["cwd"] != "~/dev" {
		t.Errorf("params = %v", params)
	}

	if r := run("workspace", "new", "--cwd", "sub"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	wantCwd, err := filepath.Abs("sub")
	if err != nil {
		t.Fatal(err)
	}
	if params := workspaceParams(t, requests, "workspace.create"); params["cwd"] != wantCwd {
		t.Errorf("params = %v, want cwd %s", params, wantCwd)
	}
}

func TestWorkspaceSelect(t *testing.T) {
	requests := fakeApp(t, map[string]string{"workspace.select": workspaceActionReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("workspace", "select", "2")
	if r.code != ExitOK || r.stdout != "Selected workspace ws-01234\n" {
		t.Errorf("%+v", r)
	}
	params := workspaceParams(t, requests, "workspace.select")
	if params["workspaceId"] != "2" || params["callerSurfaceId"] != "caller-1" {
		t.Errorf("params = %v", params)
	}

	if r := run("workspace", "select", "--workspace", "abcd"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	if params := workspaceParams(t, requests, "workspace.select"); params["workspaceId"] != "abcd" {
		t.Errorf("params = %v", params)
	}
}

func TestWorkspaceRename(t *testing.T) {
	requests := fakeApp(t, map[string]string{"workspace.rename": workspaceActionReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("workspace", "rename", "build")
	if r.code != ExitOK || r.stdout != "Renamed workspace ws-01234\n" {
		t.Errorf("%+v", r)
	}
	params := workspaceParams(t, requests, "workspace.rename")
	if _, ok := params["workspaceId"]; ok || params["name"] != "build" || params["callerSurfaceId"] != "caller-1" {
		t.Errorf("params = %v", params)
	}

	if r := run("workspace", "rename", "abcd", "build"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	params = workspaceParams(t, requests, "workspace.rename")
	if params["workspaceId"] != "abcd" || params["name"] != "build" {
		t.Errorf("params = %v", params)
	}
}

func TestWorkspaceClose(t *testing.T) {
	requests := fakeApp(t, map[string]string{"workspace.close": workspaceActionReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("workspace", "close")
	if r.code != ExitOK || r.stdout != "Closed workspace ws-01234\n" {
		t.Errorf("%+v", r)
	}
	params := workspaceParams(t, requests, "workspace.close")
	if _, ok := params["workspaceId"]; ok || params["callerSurfaceId"] != "caller-1" {
		t.Errorf("params = %v", params)
	}

	if r := run("workspace", "close", "3", "--workspace", "2"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	if params := workspaceParams(t, requests, "workspace.close"); params["workspaceId"] != "3" {
		t.Errorf("positional must override --workspace: %v", params)
	}
}

func TestWorkspaceMove(t *testing.T) {
	requests := fakeApp(t, map[string]string{"workspace.reorder": workspaceActionReply})
	t.Setenv("ASTRAL_SURFACE_ID", "caller-1")

	r := run("workspace", "move", "2")
	if r.code != ExitOK || r.stdout != "Moved workspace ws-01234\n" {
		t.Errorf("%+v", r)
	}
	params := workspaceParams(t, requests, "workspace.reorder")
	if _, ok := params["workspaceId"]; ok || params["index"] != float64(2) {
		t.Errorf("params = %v", params)
	}

	if r := run("workspace", "move", "abcd", "1"); r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	params = workspaceParams(t, requests, "workspace.reorder")
	if params["workspaceId"] != "abcd" || params["index"] != float64(1) {
		t.Errorf("params = %v", params)
	}
}

func TestWorkspaceAppError(t *testing.T) {
	fakeApp(t, map[string]string{
		"workspace.select": `{"id":"call","ok":false,"error":{"code":"not_found","message":"workspace not found: #9"}}`,
	})
	r := run("workspace", "select", "9")
	if r.code != ExitAppError || r.stderr != "astral: workspace not found: #9\n" {
		t.Errorf("%+v", r)
	}
}

func TestWorkspaceJSONKeepsUnmodeledFields(t *testing.T) {
	fakeApp(t, map[string]string{
		"workspace.current": `{"id":"call","ok":true,"result":{"id":"ws-0123456789","index":1,"name":"main","active":true,"extra":"kept"}}`,
	})
	r := run("workspace", "current", "--json")
	if r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	var out map[string]any
	if err := json.Unmarshal([]byte(r.stdout), &out); err != nil {
		t.Fatalf("stdout is not JSON: %q", r.stdout)
	}
	if out["id"] != "ws-0123456789" || out["extra"] != "kept" {
		t.Errorf("json output = %v", out)
	}
}

func TestTree(t *testing.T) {
	requests := fakeApp(t, map[string]string{"workspace.list": workspaceTreeReply})
	t.Setenv("ASTRAL_SURFACE_ID", "surf-3333333333")

	r := run("tree")
	want := " > workspace 1 ws-01234 main\n" +
		" >   pane pane-012\n" +
		" >     tab surf-012 terminal shell ~/dev\n" +
		"       tab surf-111 browser docs https://example.com\n" +
		"     pane pane-222\n" +
		"*      tab surf-333 terminal build /src\n" +
		"   workspace 2 ws-56789 logs\n" +
		" >   pane pane-444\n" +
		" >     tab surf-555 terminal tail ~\n"
	if r.code != ExitOK || r.stdout != want {
		t.Errorf("code = %d, stdout =\n%s\nwant\n%s", r.code, r.stdout, want)
	}
	if params := workspaceParams(t, requests, "workspace.list"); params["layout"] != true {
		t.Errorf("params = %v", params)
	}
}

func TestTreeMarksCallerAndFocusTogether(t *testing.T) {
	fakeApp(t, map[string]string{"workspace.list": workspaceTreeReply})
	t.Setenv("ASTRAL_SURFACE_ID", "surf-0123456789")

	r := run("tree")
	want := " > workspace 1 ws-01234 main\n" +
		" >   pane pane-012\n" +
		"*>     tab surf-012 terminal shell ~/dev\n" +
		"       tab surf-111 browser docs https://example.com\n" +
		"     pane pane-222\n" +
		"       tab surf-333 terminal build /src\n" +
		"   workspace 2 ws-56789 logs\n" +
		" >   pane pane-444\n" +
		" >     tab surf-555 terminal tail ~\n"
	if r.code != ExitOK || r.stdout != want {
		t.Errorf("code = %d, stdout =\n%s\nwant\n%s", r.code, r.stdout, want)
	}
}

func TestTreeJSONKeepsLayout(t *testing.T) {
	fakeApp(t, map[string]string{"workspace.list": workspaceTreeReply})
	r := run("tree", "--json")
	if r.code != ExitOK {
		t.Fatalf("%+v", r)
	}
	var out struct {
		Workspaces []struct {
			Layout map[string]any `json:"layout"`
		} `json:"workspaces"`
	}
	if err := json.Unmarshal([]byte(r.stdout), &out); err != nil {
		t.Fatalf("stdout is not JSON: %q", r.stdout)
	}
	if len(out.Workspaces) != 2 || out.Workspaces[0].Layout["splitId"] != "split-1" {
		t.Errorf("json output = %+v", out)
	}
}
