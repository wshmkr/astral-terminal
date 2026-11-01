package commands

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"slices"
	"time"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/wshmkr/astral-terminal/cli/internal/client"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

const (
	ExitOK          = 0
	ExitAppError    = 1
	ExitUsage       = 2
	ExitUnreachable = 3
)

const capabilitiesProbeTimeout = 5 * time.Second

var Version = "dev"

var reachedRun bool

var Root = &cobra.Command{
	Use:           "astral",
	Short:         "Control the Astral Terminal instance that spawned this shell",
	SilenceErrors: true,
	SilenceUsage:  true,
	PersistentPreRunE: func(cmd *cobra.Command, _ []string) error {
		reachedRun = true
		timeout, err := cmd.Flags().GetDuration("timeout")
		if err != nil {
			return err
		}
		if timeout <= 0 {
			return usageErrorf("--timeout must be positive")
		}
		cmd.SetContext(client.WithReplyTimeout(cmd.Context(), timeout))
		return nil
	},
}

func init() {
	cobra.EnableTraverseRunHooks = true
	f := Root.PersistentFlags()
	f.Bool("json", false, "print results as JSON")
	f.String("workspace", "", "target workspace (ID, ID prefix, or 1-based index)")
	f.String("pane", "", "target pane (ID or ID prefix)")
	f.String("tab", "", "target tab (surface ID or ID prefix)")
	f.Duration("timeout", client.DefaultReplyTimeout, "how long to wait for the app's reply")
	Root.SetVersionTemplate("{{.Version}}\n")
	Root.SetFlagErrorFunc(func(_ *cobra.Command, err error) error {
		return &UsageError{Err: err}
	})
}

type UsageError struct {
	Err error
}

func (e *UsageError) Error() string { return e.Err.Error() }
func (e *UsageError) Unwrap() error { return e.Err }

func usageErrorf(format string, args ...any) error {
	return &UsageError{Err: fmt.Errorf(format, args...)}
}

type hintError struct {
	err  error
	hint string
}

func (e *hintError) Error() string { return e.err.Error() }
func (e *hintError) Unwrap() error { return e.err }

func ExitCode(err error, ranCommand bool) int {
	if err == nil {
		return ExitOK
	}
	var usage *UsageError
	if errors.As(err, &usage) || !ranCommand {
		return ExitUsage
	}
	if errors.Is(err, client.ErrNotConnected) ||
		errors.Is(err, client.ErrUnreachable) ||
		errors.Is(err, client.ErrNoReply) {
		return ExitUnreachable
	}
	return ExitAppError
}

func Execute(ctx context.Context, args []string, stdout, stderr io.Writer) int {
	resetFlags(Root)
	reachedRun = false
	Root.Version = Version
	Root.SetArgs(args)
	Root.SetOut(stdout)
	Root.SetErr(stderr)
	err := Root.ExecuteContext(ctx)
	if err == nil {
		return ExitOK
	}
	fmt.Fprintf(stderr, "astral: %v\n", err)
	var h *hintError
	if errors.As(err, &h) {
		fmt.Fprintf(stderr, "astral: hint: %s\n", h.hint)
	}
	code := ExitCode(err, reachedRun)
	if code == ExitUsage {
		fmt.Fprintln(stderr, "Run 'astral --help' for usage.")
	}
	return code
}

func resetFlags(cmd *cobra.Command) {
	reset := func(f *pflag.Flag) {
		_ = f.Value.Set(f.DefValue)
		f.Changed = false
	}
	cmd.Flags().VisitAll(reset)
	cmd.PersistentFlags().VisitAll(reset)
	for _, c := range cmd.Commands() {
		resetFlags(c)
	}
}

// TargetParams returns the target IDs given by --workspace, --pane and --tab, plus the calling
// shell's surface from ASTRAL_SURFACE_ID.
func TargetParams(cmd *cobra.Command) map[string]any {
	params := map[string]any{}
	for flag, key := range map[string]string{
		"workspace": "workspaceId",
		"pane":      "paneId",
		"tab":       "surfaceId",
	} {
		if f := cmd.Flag(flag); f != nil && f.Value.String() != "" {
			params[key] = f.Value.String()
		}
	}
	if caller := os.Getenv("ASTRAL_SURFACE_ID"); caller != "" {
		params["callerSurfaceId"] = caller
	}
	return params
}

func call(cmd *cobra.Command, method string, params any, out any) error {
	return withVersionHint(cmd.Context(), method, client.Call(cmd.Context(), method, params, out))
}

func withVersionHint(ctx context.Context, method string, err error) error {
	var appErr *client.AppError
	if !errors.As(err, &appErr) || appErr.Code != protocol.CodeUnknownMethod {
		return err
	}
	if methodAdvertised(ctx, method) {
		return err
	}
	return &hintError{
		err: err,
		hint: fmt.Sprintf("the app does not support %s; the Astral Terminal app and CLI (%s) versions differ",
			method, Version),
	}
}

func methodAdvertised(ctx context.Context, method string) bool {
	ctx, cancel := context.WithTimeout(ctx, capabilitiesProbeTimeout)
	defer cancel()
	var caps protocol.Capabilities
	if err := client.Call(ctx, "system.capabilities", nil, &caps); err != nil {
		return false
	}
	return slices.Contains(caps.Methods, method)
}
