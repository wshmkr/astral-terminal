package commands

import (
	"io"
	"strings"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

func tabPrintRef(cmd *cobra.Command, result protocol.TabRef) error {
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
	return ""
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
		browser, url, cwd := tabNewFlags(cmd)
		if url != "" && !browser {
			return usageErrorf("--url requires --browser")
		}
		if cwd != "" && browser {
			return usageErrorf("--cwd does not apply with --browser")
		}
		return nil
	},
	RunE: func(cmd *cobra.Command, _ []string) error {
		browser, url, cwd := tabNewFlags(cmd)
		params := TargetParams(cmd)
		if browser {
			params["browser"] = true
		}
		if url != "" {
			params["url"] = url
		}
		if cwd != "" {
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

func tabNewFlags(cmd *cobra.Command) (browser bool, url, cwd string) {
	browser, _ = cmd.Flags().GetBool("browser")
	url, _ = cmd.Flags().GetString("url")
	cwd, _ = cmd.Flags().GetString("cwd")
	return browser, url, cwd
}

func tabActionCmd(use, short, method string) *cobra.Command {
	return &cobra.Command{
		Use:   use + " [tab]",
		Short: short,
		Args: func(cmd *cobra.Command, args []string) error {
			if len(args) > 1 {
				return usageErrorf("usage: %s [tab]", cmd.CommandPath())
			}
			return nil
		},
		RunE: func(cmd *cobra.Command, args []string) error {
			params := TargetParams(cmd)
			if len(args) == 1 {
				params["surfaceId"] = args[0]
			}
			var result protocol.TabRef
			if err := call(cmd, method, params, &result); err != nil {
				return err
			}
			return tabPrintRef(cmd, result)
		},
	}
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
		var result protocol.TabRef
		if err := call(cmd, "surface.rename", params, &result); err != nil {
			return err
		}
		return tabPrintRef(cmd, result)
	},
}

var tabMoveCmd = &cobra.Command{
	Use:   "move [tab] --pane <pane> [--index <n>]",
	Short: "Move a tab to another pane in its workspace, or to a position in its pane",
	Args: func(cmd *cobra.Command, args []string) error {
		if len(args) > 1 {
			return usageErrorf("usage: %s [tab] --pane <pane> [--index <n>]", cmd.CommandPath())
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
		if cmd.Flags().Changed("index") {
			index, err := cmd.Flags().GetInt("index")
			if err != nil {
				return err
			}
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
	newFlags.Bool("focus", false, "make the target pane the workspace's focused pane")
	tabMoveCmd.Flags().Int("index", 0, "zero-based tab position in the destination pane (default: last)")

	Tab.AddCommand(
		tabListCmd,
		tabNewCmd,
		tabActionCmd("focus", "Switch to a tab, its pane and its workspace", "surface.focus"),
		tabActionCmd("close", "Close a tab", "surface.close"),
		tabRenameCmd,
		tabMoveCmd,
	)
}
