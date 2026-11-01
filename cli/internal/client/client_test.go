package client

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"net"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

type fakeServer struct {
	addr     string
	requests chan []string
}

// startServer accepts connections, reads the auth and request lines, and answers with
// reply(authLine, requestLine); an empty reply sends nothing back.
func startServer(t *testing.T, reply func(auth, req string) []string) *fakeServer {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	s := &fakeServer{addr: ln.Addr().String(), requests: make(chan []string, 8)}
	go func() {
		for {
			conn, err := ln.Accept()
			if err != nil {
				return
			}
			go func() {
				defer conn.Close()
				r := bufio.NewReader(conn)
				auth, err := r.ReadString('\n')
				if err != nil {
					return
				}
				req, err := r.ReadString('\n')
				if err != nil {
					return
				}
				s.requests <- []string{auth, req}
				lines := reply(auth, req)
				if lines == nil {
					time.Sleep(2 * time.Second)
					return
				}
				for _, l := range lines {
					conn.Write([]byte(l + "\n"))
				}
			}()
		}
	}()
	return s
}

const authOK = `{"id":"auth","ok":true,"result":{"authenticated":true}}`

func newTestClient(t *testing.T, s *fakeServer, hosts ...string) *Client {
	t.Helper()
	_, port, _ := net.SplitHostPort(s.addr)
	return &Client{
		Port:         port,
		Token:        "secret",
		Hosts:        hosts,
		Cache:        NewHostCache(filepath.Join(t.TempDir(), "astral"), port),
		ReplyTimeout: 300 * time.Millisecond,
		Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
			host, _, _ := net.SplitHostPort(address)
			if host == "refused" {
				return nil, errors.New("connection refused")
			}
			var d net.Dialer
			return d.DialContext(ctx, network, s.addr)
		},
	}
}

func TestCallAuthThenReply(t *testing.T) {
	s := startServer(t, func(_, _ string) []string {
		return []string{authOK, `{"id":"call","ok":true,"result":{"pong":true}}`}
	})
	c := newTestClient(t, s, "good")
	var out struct {
		Pong bool `json:"pong"`
	}
	if err := c.Call(context.Background(), "system.ping", nil, &out); err != nil {
		t.Fatal(err)
	}
	if !out.Pong {
		t.Error("pong = false")
	}
	got := <-s.requests
	var auth, req map[string]any
	if err := json.Unmarshal([]byte(got[0]), &auth); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal([]byte(got[1]), &req); err != nil {
		t.Fatal(err)
	}
	if auth["method"] != "auth.hello" || auth["id"] != "auth" ||
		auth["params"].(map[string]any)["token"] != "secret" {
		t.Errorf("auth line = %s", got[0])
	}
	if req["method"] != "system.ping" || req["params"] != nil {
		t.Errorf("request line = %s", got[1])
	}
}

func TestCallFallsBackToNextHost(t *testing.T) {
	s := startServer(t, func(_, _ string) []string {
		return []string{authOK, `{"id":"call","ok":true,"result":null}`}
	})
	c := newTestClient(t, s, "refused", "good")
	if err := c.Call(context.Background(), "system.ping", nil, nil); err != nil {
		t.Fatal(err)
	}
	if got := NewHostCache(c.Cache.Dir, c.Port).Load(); got != "good" {
		t.Errorf("cached host = %q", got)
	}
}

func TestCallAllHostsUnreachable(t *testing.T) {
	s := startServer(t, func(_, _ string) []string { return nil })
	c := newTestClient(t, s, "refused")
	err := c.Call(context.Background(), "system.ping", nil, nil)
	if !errors.Is(err, ErrUnreachable) {
		t.Errorf("err = %v, want ErrUnreachable", err)
	}
}

func TestCallNoReplyStops(t *testing.T) {
	s := startServer(t, func(_, _ string) []string { return nil })
	c := newTestClient(t, s, "good", "other")
	err := c.Call(context.Background(), "pane.split", nil, nil)
	if !errors.Is(err, ErrNoReply) {
		t.Fatalf("err = %v, want ErrNoReply", err)
	}
	<-s.requests
	select {
	case r := <-s.requests:
		t.Errorf("second host was tried after no reply: %v", r)
	case <-time.After(100 * time.Millisecond):
	}
}

func TestCallReplyTimeoutFromContext(t *testing.T) {
	s := startServer(t, func(_, _ string) []string { return nil })
	c := newTestClient(t, s, "good")
	c.ReplyTimeout = time.Minute
	start := time.Now()
	err := c.Call(WithReplyTimeout(context.Background(), 100*time.Millisecond), "system.ping", nil, nil)
	if !errors.Is(err, ErrNoReply) {
		t.Fatalf("err = %v", err)
	}
	if time.Since(start) > 5*time.Second {
		t.Error("reply timeout from context ignored")
	}
}

func TestCallAppError(t *testing.T) {
	s := startServer(t, func(_, _ string) []string {
		return []string{authOK, `{"id":"call","ok":false,"error":{"code":"invalid_params","message":"bad direction"}}`}
	})
	c := newTestClient(t, s, "good")
	err := c.Call(context.Background(), "pane.split", nil, nil)
	var appErr *AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("err = %v, want *AppError", err)
	}
	if appErr.Code != "invalid_params" || appErr.Message != "bad direction" {
		t.Errorf("AppError = %+v", appErr)
	}
}

func TestCallUnauthorized(t *testing.T) {
	s := startServer(t, func(_, _ string) []string {
		return []string{
			`{"id":"auth","ok":false,"error":{"code":"unauthorized","message":"invalid token"}}`,
			`{"id":"call","ok":false,"error":{"code":"unauthorized","message":"not authenticated"}}`,
		}
	})
	c := newTestClient(t, s, "good")
	var appErr *AppError
	if err := c.Call(context.Background(), "system.ping", nil, nil); !errors.As(err, &appErr) || appErr.Code != "unauthorized" {
		t.Errorf("err = %v", err)
	}
	line, err := c.CallRaw(context.Background(), "system.ping", nil)
	if !errors.As(err, &appErr) || !strings.Contains(string(line), "invalid token") {
		t.Errorf("CallRaw = %s, %v", line, err)
	}
}

func TestCallRawReturnsReplyLine(t *testing.T) {
	reply := `{"id":"call","ok":true,"result":{"a":1}}`
	s := startServer(t, func(_, _ string) []string { return []string{authOK, reply} })
	c := newTestClient(t, s, "good")
	line, err := c.CallRaw(context.Background(), "x.y", json.RawMessage(`{"k":"v"}`))
	if err != nil {
		t.Fatal(err)
	}
	if string(line) != reply {
		t.Errorf("line = %s", line)
	}
	if got := <-s.requests; !strings.Contains(got[1], `"params":{"k":"v"}`) {
		t.Errorf("request line = %s", got[1])
	}
}

func TestFromEnvNotConnected(t *testing.T) {
	t.Setenv("ASTRAL_PORT", "")
	t.Setenv("ASTRAL_TOKEN", "x")
	if _, err := FromEnv(); !errors.Is(err, ErrNotConnected) {
		t.Errorf("err = %v", err)
	}
}
