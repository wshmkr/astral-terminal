package commands

import (
	"io"
	"path/filepath"
	"strings"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

func tabCallRef(cmd *cobra.Command, method string, params map[string]any) error {
	var result protocol.TabRef
	if err := call(cmd, method, params, &result); err != nil {
		return err
	}
	return output.Print(cmd, result, func(w io.Writer) {
		output.Table(w, []string{"TAB"}, [][]string{{output.ShortID(result.SurfaceID)}})
	})
}

func tabLocation(tab protocol.TabInfo) string {
	switch {
	case tab.Cwd != nil:
		return *tab.Cwd
	case tab.URL != nil:
		return *tab.URL
	}
	return "-"
}

func tabActiveMark(tab protocol.TabInfo) string {
	if tab.Active {
		return "*"
	}
	return "-"
}

var tabListCmd = &cobra.Command{
	Use:   "list",
	Short: "List the tabs in a pane or workspace",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) != 0 {
			return usageErrorf("usage: %s", cmd.CommandPath())
		}
		if cmd.Flag("tab").Changed {
			return usageErrorf("--tab does not apply to %s", cmd.CommandPath())
		}
		if cmd.Flag("pane").Changed && cmd.Flag("workspace").Changed {
			return usageErrorf("--pane and --workspace cannot be combined on %s", cmd.CommandPath())
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, _ []string) error {
		var result protocol.TabList
		if err := call(cmd, "surface.list", TargetParams(cmd), &result); err != nil {
			return err
		}
		return output.Print(cmd, result, func(w io.Writer) {
			rows := make([][]string, 0, len(result.Surfaces))
			for _, tab := range result.Surfaces {
				rows = append(rows, []string{
					output.ShortID(tab.SurfaceID),
					output.ShortID(tab.PaneID),
					tab.Type,
					tab.Name,
					tabActiveMark(tab),
					tabLocation(tab),
				})
			}
			output.Table(w, []string{"TAB", "PANE", "TYPE", "NAME", "ACTIVE", "LOCATION"}, rows)
		})
	},
}

var tabNewCmd = &cobra.Command{
	Use:   "new",
	Short: "Open a new tab in a pane",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) != 0 {
			return usageErrorf("usage: %s", cmd.CommandPath())
		}
		browser, _ := cmd.Flags().GetBool("browser")
		if cmd.Flag("url").Changed && !browser {
			return usageErrorf("--url requires --browser")
		}
		if flag := cmd.Flag("cwd"); flag.Changed && browser {
			return usageErrorf("--cwd does not apply with --browser")
		} else if flag.Changed && flag.Value.String() == "" {
			return usageErrorf("--cwd must not be empty")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, _ []string) error {
		params := TargetParams(cmd)
		if browser, _ := cmd.Flags().GetBool("browser"); browser {
			params["browser"] = true
		}
		if flag := cmd.Flag("url"); flag.Changed {
			params["url"] = flag.Value.String()
		}
		if flag := cmd.Flag("cwd"); flag.Changed {
			cwd, err := tabResolveCwd(flag.Value.String())
			if err != nil {
				return err
			}
			params["cwd"] = cwd
		}
		if focus, _ := cmd.Flags().GetBool("focus"); focus {
			params["focus"] = true
		}
		var result protocol.TabCreated
		if err := call(cmd, "surface.create", params, &result); err != nil {
			return err
		}
		return output.Print(cmd, result, func(w io.Writer) {
			output.Table(w, []string{"WORKSPACE", "PANE", "TAB"}, [][]string{{
				output.ShortID(result.WorkspaceID),
				output.ShortID(result.PaneID),
				output.ShortID(result.SurfaceID),
			}})
		})
	},
}

func tabResolveCwd(cwd string) (string, error) {
	if cwd == "~" || strings.HasPrefix(cwd, "~/") || strings.HasPrefix(cwd, `~\`) {
		return cwd, nil
	}
	return filepath.Abs(cwd)
}

func tabHasTarget(cmd *cobra.Command, args []string) bool {
	return len(args) == 1 || cmd.Flag("tab").Value.String() != ""
}

func tabRunAction(method string) func(*cobra.Command, []string) error {
	return func(cmd *cobra.Command, args []string) error {
		params := TargetParams(cmd)
		if len(args) == 1 {
			params["surfaceId"] = args[0]
		}
		return tabCallRef(cmd, method, params)
	}
}

var tabFocusCmd = &cobra.Command{
	Use:   "focus <tab>",
	Short: "Switch to a tab, its pane and its workspace",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) > 1 || !tabHasTarget(cmd, args) {
			return usageErrorf("usage: %s <tab>", cmd.CommandPath())
		}
		return nil
	},
	RunE: tabRunAction("surface.focus"),
}

var tabCloseCmd = &cobra.Command{
	Use:   "close [tab]",
	Short: "Close a tab",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) > 1 {
			return usageErrorf("usage: %s [tab]", cmd.CommandPath())
		}
		return nil
	},
	RunE: tabRunAction("surface.close"),
}

var tabRenameCmd = &cobra.Command{
	Use:   "rename [tab] <name>",
	Short: "Rename a tab",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) < 1 || len(args) > 2 {
			return usageErrorf("usage: %s [tab] <name>", cmd.CommandPath())
		}
		if strings.TrimSpace(args[len(args)-1]) == "" {
			return usageErrorf("name must not be empty")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		params := TargetParams(cmd)
		if len(args) == 2 {
			params["surfaceId"] = args[0]
		}
		params["name"] = args[len(args)-1]
		return tabCallRef(cmd, "surface.rename", params)
	},
}

var tabMoveCmd = &cobra.Command{
	Use:   "move <tab> --pane <pane> [--index <n>]",
	Short: "Move a tab to another pane in its workspace, or to a position in its pane",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) > 1 || !tabHasTarget(cmd, args) {
			return usageErrorf("usage: %s <tab> --pane <pane> [--index <n>]", cmd.CommandPath())
		}
		if cmd.Flag("pane").Value.String() == "" {
			return usageErrorf("%s requires --pane", cmd.CommandPath())
		}
		if index, _ := cmd.Flags().GetInt("index"); index < 0 {
			return usageErrorf("--index must not be negative")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, args []string) error {
		params := TargetParams(cmd)
		params["toPaneId"] = params["paneId"]
		delete(params, "paneId")
		if len(args) == 1 {
			params["surfaceId"] = args[0]
		}
		if cmd.Flag("index").Changed {
			index, _ := cmd.Flags().GetInt("index")
			params["index"] = index
		}
		var result protocol.TabMoved
		if err := call(cmd, "surface.move", params, &result); err != nil {
			return err
		}
		return output.Print(cmd, result, func(w io.Writer) {
			output.Table(w, []string{"TAB", "PANE"}, [][]string{{
				output.ShortID(result.SurfaceID),
				output.ShortID(result.PaneID),
			}})
		})
	},
}

func init() {
	newFlags := tabNewCmd.Flags()
	newFlags.Bool("browser", false, "open a browser tab instead of a terminal")
	newFlags.String("url", "", "URL to open (requires --browser)")
	newFlags.String("cwd", "", "working directory for the terminal")
	newFlags.Bool("focus", false, "focus the tab's pane, switching workspace if needed")
	tabMoveCmd.Flags().Int("index", 0, "zero-based tab position in the destination pane (default: last)")

	Tab.AddCommand(
		tabListCmd,
		tabNewCmd,
		tabFocusCmd,
		tabCloseCmd,
		tabRenameCmd,
		tabMoveCmd,
	)
}
