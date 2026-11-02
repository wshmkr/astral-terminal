package commands

import (
	"fmt"
	"io"
	"slices"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

const (
	paneMinSizePercent = 5
	paneMaxSizePercent = 95
)

var paneSplitDirections = []string{"left", "right", "up", "down"}

func splitArgs(cmd *cobra.Command, args []string) error {
	directions := strings.Join(paneSplitDirections, "|")
	if len(args) != 1 {
		return usageErrorf("usage: %s <%s>", cmd.CommandPath(), directions)
	}
	if !slices.Contains(paneSplitDirections, args[0]) {
		return usageErrorf("invalid direction: %s (expected %s)", args[0], directions)
	}
	browser, err := cmd.Flags().GetBool("browser")
	if err != nil {
		return err
	}
	if !cmd.Flags().Changed("url") {
		return nil
	}
	if !browser {
		return usageErrorf("--url requires --browser")
	}
	url, err := cmd.Flags().GetString("url")
	if err != nil {
		return err
	}
	if url == "" {
		return usageErrorf("--url must not be empty")
	}
	return nil
}

func runSplit(cmd *cobra.Command, args []string) error {
	params := TargetParams(cmd)
	params["direction"] = args[0]
	flags := cmd.Flags()
	for _, name := range []string{"browser", "focus"} {
		enabled, err := flags.GetBool(name)
		if err != nil {
			return err
		}
		if enabled {
			params[name] = true
		}
	}
	if flags.Changed("url") {
		url, err := flags.GetString("url")
		if err != nil {
			return err
		}
		params["url"] = url
	}
	var result protocol.PaneSplitResult
	if err := call(cmd, "pane.split", params, &result); err != nil {
		return err
	}
	return output.Print(cmd, result, func(w io.Writer) {
		output.Table(w, []string{"WORKSPACE", "PANE", "TAB"}, [][]string{{
			shortOrDash(result.WorkspaceID),
			shortOrDash(result.PaneID),
			shortOrDash(result.SurfaceID),
		}})
	})
}

func shortOrDash(id *string) string {
	if id == nil || *id == "" {
		return "-"
	}
	return output.ShortID(*id)
}

func newSplitCmd(short string) *cobra.Command {
	cmd := &cobra.Command{
		Use:   "split <" + strings.Join(paneSplitDirections, "|") + ">",
		Short: short,
		Args:  splitArgs,
		RunE:  runSplit,
	}
	f := cmd.Flags()
	f.Bool("browser", false, "open a browser tab in the new pane instead of a terminal")
	f.String("url", "", "URL for the browser tab (requires --browser)")
	f.Bool("focus", false, "focus the new pane, switching workspace if needed")
	return cmd
}

func paneTargetParams(cmd *cobra.Command, args []string) map[string]any {
	params := TargetParams(cmd)
	if len(args) == 1 {
		params["paneId"] = args[0]
	}
	return params
}

func paneFormatSizes(sizes []float64) string {
	parts := make([]string, len(sizes))
	for i, size := range sizes {
		parts[i] = strconv.FormatFloat(size*100, 'f', 1, 64) + "%"
	}
	return strings.Join(parts, " ")
}

func paneBoolMark(value bool) string {
	if value {
		return "*"
	}
	return ""
}

func paneListArgs(cmd *cobra.Command, args []string) error {
	if err := cobra.NoArgs(cmd, args); err != nil {
		return err
	}
	for _, name := range []string{"pane", "tab"} {
		if cmd.Flags().Changed(name) {
			return usageErrorf("--%s does not apply to %s; use --workspace", name, cmd.CommandPath())
		}
	}
	return nil
}

var paneListCmd = &cobra.Command{
	Use:   "list",
	Short: "List the panes in a workspace",
	Args:  paneListArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		var result protocol.PaneListResult
		if err := call(cmd, "pane.list", TargetParams(cmd), &result); err != nil {
			return err
		}
		return output.Print(cmd, result, func(w io.Writer) {
			rows := make([][]string, len(result.Panes))
			for i, pane := range result.Panes {
				rows[i] = []string{
					paneBoolMark(pane.Focused),
					output.ShortID(pane.PaneID),
					output.ShortID(pane.WorkspaceID),
					shortOrDash(pane.ActiveSurfaceID),
					strconv.Itoa(pane.TabCount),
				}
			}
			output.Table(w, []string{"", "PANE", "WORKSPACE", "ACTIVE TAB", "TABS"}, rows)
		})
	},
}

func paneFocusArgs(cmd *cobra.Command, args []string) error {
	paneID, _ := paneTargetParams(cmd, args)["paneId"].(string)
	if len(args) > 1 || paneID == "" {
		return usageErrorf("usage: %s <pane>", cmd.CommandPath())
	}
	return nil
}

func paneRefCmd(use, method, short, verb string, validateArgs cobra.PositionalArgs) *cobra.Command {
	return &cobra.Command{
		Use:   use,
		Short: short,
		Args:  validateArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			var result protocol.PaneRefResult
			if err := call(cmd, method, paneTargetParams(cmd, args), &result); err != nil {
				return err
			}
			return output.Print(cmd, result, func(w io.Writer) {
				fmt.Fprintf(w, "%s pane %s\n", verb, shortOrDash(result.PaneID))
			})
		},
	}
}

func paneResizeArgs(cmd *cobra.Command, args []string) error {
	if err := cobra.MaximumNArgs(1)(cmd, args); err != nil {
		return err
	}
	if !cmd.Flags().Changed("size") {
		return usageErrorf("--size is required")
	}
	size, err := cmd.Flags().GetFloat64("size")
	if err != nil {
		return err
	}
	if !(size >= paneMinSizePercent && size <= paneMaxSizePercent) {
		return usageErrorf("--size must be between %d and %d", paneMinSizePercent, paneMaxSizePercent)
	}
	return nil
}

func paneResizeCmd() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "resize [pane] --size <percent>",
		Short: "Set a pane's share of its parent split",
		Args:  paneResizeArgs,
		RunE: func(cmd *cobra.Command, args []string) error {
			size, err := cmd.Flags().GetFloat64("size")
			if err != nil {
				return err
			}
			params := paneTargetParams(cmd, args)
			params["size"] = size
			var result protocol.PaneResizeResult
			if err := call(cmd, "pane.resize", params, &result); err != nil {
				return err
			}
			return output.Print(cmd, result, func(w io.Writer) {
				output.Table(w, []string{"PANE", "SIZES"}, [][]string{{
					shortOrDash(result.PaneID),
					paneFormatSizes(result.Sizes),
				}})
			})
		},
	}
	cmd.Flags().Float64("size", 0, fmt.Sprintf("percent of the parent split, %d to %d", paneMinSizePercent, paneMaxSizePercent))
	return cmd
}

func init() {
	Pane.AddCommand(
		paneListCmd,
		newSplitCmd("Split a pane"),
		paneRefCmd("focus <pane>", "pane.focus", "Focus a pane, switching workspace if needed", "focused", paneFocusArgs),
		paneRefCmd("close [pane]", "pane.close", "Close a pane", "closed", cobra.MaximumNArgs(1)),
		paneResizeCmd(),
	)
	Root.AddCommand(newSplitCmd("Split a pane (alias for pane split)"))
}
