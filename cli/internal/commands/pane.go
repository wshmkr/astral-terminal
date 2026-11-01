package commands

import (
	"io"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
)

type splitResult struct {
	WorkspaceID *string `json:"workspaceId"`
	PaneID      *string `json:"paneId"`
	SurfaceID   *string `json:"surfaceId"`
}

func splitArgs(_ *cobra.Command, args []string) error {
	if len(args) != 1 {
		return usageErrorf("usage: astral pane split <right|down>")
	}
	switch args[0] {
	case "right", "down":
		return nil
	}
	return usageErrorf("invalid direction: %s (expected right or down)", args[0])
}

func runSplit(cmd *cobra.Command, args []string) error {
	params := TargetParams(cmd)
	params["direction"] = args[0]
	var result splitResult
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

var paneSplitCmd = &cobra.Command{
	Use:   "split <right|down>",
	Short: "Split a pane right or down",
	Args:  splitArgs,
	RunE:  runSplit,
}

var splitCmd = &cobra.Command{
	Use:   "split <right|down>",
	Short: "Split a pane right or down (alias for pane split)",
	Args:  splitArgs,
	RunE:  runSplit,
}

func init() {
	Pane.AddCommand(paneSplitCmd)
	Root.AddCommand(splitCmd)
}
