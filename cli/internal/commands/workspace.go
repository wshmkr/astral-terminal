package commands

import (
	"encoding/json"
	"fmt"
	"io"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

// workspaceCall prints the raw result for --json, so fields this CLI does not model survive.
func workspaceCall[T any](cmd *cobra.Command, method string, params any, human func(io.Writer, T)) error {
	var raw json.RawMessage
	if err := call(cmd, method, params, &raw); err != nil {
		return err
	}
	var result T
	if err := json.Unmarshal(raw, &result); err != nil {
		return err
	}
	return output.Print(cmd, raw, func(w io.Writer) { human(w, result) })
}

func workspaceAction(cmd *cobra.Command, method string, params map[string]any, verb string) error {
	return workspaceCall(cmd, method, params, func(w io.Writer, r protocol.WorkspaceAction) {
		fmt.Fprintf(w, "%s workspace %s\n", verb, output.ShortID(r.WorkspaceID))
	})
}

func workspaceYesNo(v bool) string {
	if v {
		return "yes"
	}
	return "no"
}

func workspaceParseIndex(arg string) (int, error) {
	index, err := strconv.Atoi(arg)
	if err != nil || index < 1 {
		return 0, usageErrorf("invalid index: %s (expected a positive integer)", arg)
	}
	return index, nil
}

var workspaceListCmd = &cobra.Command{
	Use:   "list",
	Short: "List workspaces",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		return workspaceCall(cmd, "workspace.list", nil, func(w io.Writer, r protocol.WorkspaceList) {
			rows := make([][]string, 0, len(r.Workspaces))
			for _, ws := range r.Workspaces {
				rows = append(rows, []string{
					strconv.Itoa(ws.Index),
					output.ShortID(ws.ID),
					ws.Name,
					strconv.Itoa(ws.PaneCount),
					strconv.Itoa(ws.TabCount),
					workspaceYesNo(ws.Active),
				})
			}
			output.Table(w, []string{"INDEX", "ID", "NAME", "PANES", "TABS", "ACTIVE"}, rows)
		})
	},
}

var workspaceCurrentCmd = &cobra.Command{
	Use:   "current",
	Short: "Show the caller's workspace",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		return workspaceCall(cmd, "workspace.current", TargetParams(cmd), func(w io.Writer, ws protocol.WorkspaceInfo) {
			output.Table(w, []string{"INDEX", "ID", "NAME", "ACTIVE"}, [][]string{{
				strconv.Itoa(ws.Index),
				output.ShortID(ws.ID),
				ws.Name,
				workspaceYesNo(ws.Active),
			}})
		})
	},
}

// workspaceResolveCwd makes a relative path absolute here, since the app does not share the
// caller's working directory. Paths under ~ are left for the app's shell to expand.
func workspaceResolveCwd(cwd string) (string, error) {
	if strings.HasPrefix(cwd, "~") {
		return cwd, nil
	}
	return filepath.Abs(cwd)
}

func newWorkspaceNewCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "new [<name>]",
		Short: "Create a workspace, in the background unless --focus is given",
		Args: func(cmd *cobra.Command, args []string) error {
			if len(args) > 1 {
				return usageErrorf("usage: %s [<name>] [--cwd <dir>] [--focus]", cmd.CommandPath())
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			params := map[string]any{}
			if len(args) == 1 {
				params["name"] = args[0]
			}
			if flag := cmd.Flag("cwd"); flag.Changed {
				cwd, err := workspaceResolveCwd(flag.Value.String())
				if err != nil {
					return err
				}
				params["cwd"] = cwd
			}
			if cmd.Flag("focus").Changed {
				focus, err := cmd.Flags().GetBool("focus")
				if err != nil {
					return err
				}
				params["focus"] = focus
			}
			return workspaceCall(cmd, "workspace.create", params, func(w io.Writer, r protocol.WorkspaceCreated) {
				output.Table(w, []string{"WORKSPACE", "PANE", "TAB"}, [][]string{{
					output.ShortID(r.WorkspaceID),
					output.ShortID(r.PaneID),
					output.ShortID(r.SurfaceID),
				}})
			})
		},
	}
	cmd.Flags().String("cwd", "", "working directory of the new workspace's terminal")
	cmd.Flags().Bool("focus", false, "switch to the new workspace")
	return cmd
}

var workspaceSelectCmd = &cobra.Command{
	Use:   "select [<workspace>]",
	Short: "Switch to a workspace (by positional argument or --workspace)",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) > 1 || (len(args) == 0 && cmd.Flag("workspace").Value.String() == "") {
			return usageErrorf("usage: %s <workspace>", cmd.CommandPath())
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		params := TargetParams(cmd)
		if len(args) == 1 {
			params["workspaceId"] = args[0]
		}
		return workspaceAction(cmd, "workspace.select", params, "Selected")
	},
}

var workspaceRenameCmd = &cobra.Command{
	Use:   "rename [<workspace>] <name>",
	Short: "Rename a workspace, by default the caller's",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) < 1 || len(args) > 2 {
			return usageErrorf("usage: %s [<workspace>] <name>", cmd.CommandPath())
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		params := TargetParams(cmd)
		if len(args) == 2 {
			params["workspaceId"] = args[0]
		}
		params["name"] = args[len(args)-1]
		return workspaceAction(cmd, "workspace.rename", params, "Renamed")
	},
}

var workspaceCloseCmd = &cobra.Command{
	Use:   "close [<workspace>]",
	Short: "Close a workspace, by default the caller's",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) > 1 {
			return usageErrorf("usage: %s [<workspace>]", cmd.CommandPath())
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		params := TargetParams(cmd)
		if len(args) == 1 {
			params["workspaceId"] = args[0]
		}
		return workspaceAction(cmd, "workspace.close", params, "Closed")
	},
}

var workspaceMoveCmd = &cobra.Command{
	Use:   "move [<workspace>] <index>",
	Short: "Move a workspace, by default the caller's, to a 1-based position",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) < 1 || len(args) > 2 {
			return usageErrorf("usage: %s [<workspace>] <index>", cmd.CommandPath())
		}
		_, err := workspaceParseIndex(args[len(args)-1])
		return err
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		index, err := workspaceParseIndex(args[len(args)-1])
		if err != nil {
			return err
		}
		params := TargetParams(cmd)
		if len(args) == 2 {
			params["workspaceId"] = args[0]
		}
		params["index"] = index
		return workspaceAction(cmd, "workspace.reorder", params, "Moved")
	},
}

func init() {
	Workspace.AddCommand(
		workspaceListCmd,
		workspaceCurrentCmd,
		newWorkspaceNewCmd(),
		workspaceSelectCmd,
		workspaceRenameCmd,
		workspaceCloseCmd,
		workspaceMoveCmd,
	)
}
