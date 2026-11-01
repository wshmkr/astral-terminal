package client

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"time"

	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

const (
	DefaultConnectTimeout = 3 * time.Second
	DefaultReplyTimeout   = 10 * time.Second
	maxReplyBytes         = 64 << 20
)

var (
	ErrNotConnected = errors.New("not connected to Astral Terminal")
	ErrUnreachable  = errors.New("could not reach Astral Terminal")
	ErrNoReply      = errors.New("no reply from Astral Terminal")
)

type AppError struct {
	Code    string
	Message string
}

func (e *AppError) Error() string {
	return e.Message + " (" + e.Code + ")"
}

type DialFunc func(ctx context.Context, network, address string) (net.Conn, error)

type Client struct {
	Port           string
	Token          string
	Hosts          []string
	Cache          *HostCache
	ConnectTimeout time.Duration
	ReplyTimeout   time.Duration
	Dial           DialFunc
}

func FromEnv() (*Client, error) {
	port := os.Getenv("ASTRAL_PORT")
	token := os.Getenv("ASTRAL_TOKEN")
	if port == "" || token == "" {
		return nil, ErrNotConnected
	}
	cache := NewHostCache(DefaultCacheDir(), port)
	return &Client{
		Port:  port,
		Token: token,
		Hosts: Candidates(cache.Load(), routeFile, resolvFile),
		Cache: cache,
	}, nil
}

type replyTimeoutKey struct{}

func WithReplyTimeout(ctx context.Context, d time.Duration) context.Context {
	return context.WithValue(ctx, replyTimeoutKey{}, d)
}

func replyTimeoutFrom(ctx context.Context) (time.Duration, bool) {
	d, ok := ctx.Value(replyTimeoutKey{}).(time.Duration)
	return d, ok && d > 0
}

func Call(ctx context.Context, method string, params any, out any) error {
	c, err := FromEnv()
	if err != nil {
		return err
	}
	return c.Call(ctx, method, params, out)
}

func CallRaw(ctx context.Context, method string, params any) ([]byte, error) {
	c, err := FromEnv()
	if err != nil {
		return nil, err
	}
	return c.CallRaw(ctx, method, params)
}

func (c *Client) Call(ctx context.Context, method string, params any, out any) error {
	_, resp, err := c.exchange(ctx, method, params)
	if err != nil {
		return err
	}
	if out == nil || len(resp.Result) == 0 {
		return nil
	}
	if err := json.Unmarshal(resp.Result, out); err != nil {
		return fmt.Errorf("decode %s result: %w", method, err)
	}
	return nil
}

// CallRaw returns the reply line as received (the auth reply when authentication fails), along
// with an *AppError when that reply is not ok.
func (c *Client) CallRaw(ctx context.Context, method string, params any) ([]byte, error) {
	line, _, err := c.exchange(ctx, method, params)
	return line, err
}

func (c *Client) exchange(ctx context.Context, method string, params any) ([]byte, *protocol.Response, error) {
	auth, err := encodeLine(protocol.Request{
		ID:     "auth",
		Method: protocol.AuthMethod,
		Params: map[string]string{"token": c.Token},
	})
	if err != nil {
		return nil, nil, err
	}
	req, err := encodeLine(protocol.Request{ID: "call", Method: method, Params: params})
	if err != nil {
		return nil, nil, fmt.Errorf("encode %s params: %w", method, err)
	}
	for _, host := range c.Hosts {
		line, resp, err := c.exchangeWith(ctx, host, auth, req)
		if errors.Is(err, ErrUnreachable) {
			continue
		}
		if err != nil {
			return line, nil, err
		}
		if c.Cache != nil {
			c.Cache.Store(host)
		}
		if !resp.OK {
			return line, resp, appError(resp)
		}
		return line, resp, nil
	}
	return nil, nil, fmt.Errorf("%w on port %s", ErrUnreachable, c.Port)
}

func (c *Client) exchangeWith(ctx context.Context, host string, auth, req []byte) ([]byte, *protocol.Response, error) {
	addr := net.JoinHostPort(host, c.Port)
	conn, err := c.dial(ctx, addr)
	if err != nil {
		return nil, nil, ErrUnreachable
	}
	defer conn.Close()

	noReply := fmt.Errorf("%w on %s (the request may have run)", ErrNoReply, addr)
	deadline := time.Now().Add(c.replyTimeout(ctx))
	if d, ok := ctx.Deadline(); ok && d.Before(deadline) {
		deadline = d
	}
	_ = conn.SetDeadline(deadline)
	stop := context.AfterFunc(ctx, func() { _ = conn.SetDeadline(time.Now()) })
	defer stop()

	if _, err := (&net.Buffers{auth, req}).WriteTo(conn); err != nil {
		return nil, nil, noReply
	}
	r := bufio.NewReader(conn)
	authLine, authResp, err := readResponse(r, addr, noReply)
	if err != nil {
		return nil, nil, err
	}
	if !authResp.OK {
		return authLine, nil, appError(authResp)
	}
	return readResponse(r, addr, noReply)
}

func readResponse(r *bufio.Reader, addr string, noReply error) ([]byte, *protocol.Response, error) {
	line, err := readLine(r)
	if err != nil {
		return nil, nil, noReply
	}
	var resp protocol.Response
	if err := json.Unmarshal(line, &resp); err != nil {
		return nil, nil, fmt.Errorf("malformed reply from %s: %w", addr, err)
	}
	return line, &resp, nil
}

func (c *Client) dial(ctx context.Context, addr string) (net.Conn, error) {
	timeout := c.ConnectTimeout
	if timeout <= 0 {
		timeout = DefaultConnectTimeout
	}
	dctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	if c.Dial != nil {
		return c.Dial(dctx, "tcp", addr)
	}
	var d net.Dialer
	return d.DialContext(dctx, "tcp", addr)
}

func (c *Client) replyTimeout(ctx context.Context) time.Duration {
	if d, ok := replyTimeoutFrom(ctx); ok {
		return d
	}
	if c.ReplyTimeout > 0 {
		return c.ReplyTimeout
	}
	return DefaultReplyTimeout
}

func encodeLine(v any) ([]byte, error) {
	b, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	return append(b, '\n'), nil
}

func readLine(r *bufio.Reader) ([]byte, error) {
	var buf []byte
	for {
		chunk, isPrefix, err := r.ReadLine()
		if err != nil {
			return nil, err
		}
		buf = append(buf, chunk...)
		if len(buf) > maxReplyBytes {
			return nil, errors.New("reply too large")
		}
		if !isPrefix {
			return buf, nil
		}
	}
}

func appError(resp *protocol.Response) *AppError {
	if resp.Error == nil {
		return &AppError{Code: protocol.CodeInternalError, Message: "request failed"}
	}
	return &AppError{Code: resp.Error.Code, Message: resp.Error.Message}
}
