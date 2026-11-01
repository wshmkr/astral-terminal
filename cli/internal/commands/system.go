package commands

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/client"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

var identifyCmd = &cobra.Command{
	Use:   "identify",
	Short: "Print this surface's identity as JSON",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		surface := os.Getenv("ASTRAL_SURFACE_ID")
		if surface == "" {
			return errors.New("not running inside an Astral Terminal shell")
		}
		pid, err := strconv.ParseUint(os.Getenv("ASTRAL_PID"), 10, 63)
		if err != nil {
			pid = 0
		}
		line, err := json.Marshal(struct {
			SurfaceID string `json:"surfaceId"`
			PID       uint64 `json:"pid"`
			Version   string `json:"version"`
		}{surface, pid, os.Getenv("ASTRAL_VERSION")})
		if err != nil {
			return err
		}
		fmt.Fprintf(cmd.OutOrStdout(), "%s\n", line)
		return nil
	},
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print the CLI version, and the app version when reachable",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		var app struct {
			Version string `json:"version"`
		}
		result := struct {
			CLI string  `json:"cli"`
			App *string `json:"app"`
		}{CLI: Version}
		if client.Call(cmd.Context(), "app.identify", nil, &app) == nil && app.Version != "" {
			result.App = &app.Version
		}
		return output.Print(cmd, result, func(w io.Writer) {
			fmt.Fprintf(w, "astral CLI %s\n", result.CLI)
			if result.App != nil {
				fmt.Fprintf(w, "Astral Terminal %s\n", *result.App)
			}
		})
	},
}

var pingCmd = &cobra.Command{
	Use:   "ping",
	Short: "Check that the app is reachable",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		var result json.RawMessage
		if err := call(cmd, "system.ping", nil, &result); err != nil {
			return err
		}
		return output.Print(cmd, result, func(w io.Writer) {
			fmt.Fprintln(w, "pong")
		})
	},
}

var capabilitiesCmd = &cobra.Command{
	Use:   "capabilities",
	Short: "List the methods the app supports",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		var caps protocol.Capabilities
		if err := call(cmd, "system.capabilities", nil, &caps); err != nil {
			return err
		}
		return output.Print(cmd, caps, func(w io.Writer) {
			fmt.Fprintf(w, "protocol version %d\n", caps.ProtocolVersion)
			for _, m := range caps.Methods {
				fmt.Fprintln(w, m)
			}
		})
	},
}

var callCmd = &cobra.Command{
	Use:   "call <method> [json-params]",
	Short: "Call a method on the running app and print the raw reply",
	Args: func(_ *cobra.Command, args []string) error {
		if len(args) < 1 || len(args) > 2 {
			return usageErrorf("usage: astral call <method> [json-params]")
		}
		if strings.TrimSpace(args[0]) == "" {
			return usageErrorf("method must not be empty")
		}
		if len(args) == 2 && !json.Valid([]byte(args[1])) {
			return usageErrorf("params are not valid JSON: %s", args[1])
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		var params any
		if len(args) == 2 {
			params = json.RawMessage(args[1])
		}
		line, err := client.CallRaw(cmd.Context(), args[0], params)
		if line != nil {
			fmt.Fprintf(cmd.OutOrStdout(), "%s\n", line)
		}
		return withVersionHint(cmd.Context(), args[0], err, false)
	},
}

func init() {
	Root.AddCommand(identifyCmd, versionCmd, pingCmd, capabilitiesCmd, callCmd)
}
