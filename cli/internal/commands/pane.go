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

func splitArgs(cmd *cobra.Command, args []string) error {
	if len(args) != 1 {
		return usageErrorf("usage: %s <right|down>", cmd.CommandPath())
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

func newSplitCmd(short string) *cobra.Command {
	return &cobra.Command{
		Use:   "split <right|down>",
		Short: short,
		Args:  splitArgs,
		RunE:  runSplit,
	}
}

func init() {
	Pane.AddCommand(newSplitCmd("Split a pane right or down"))
	Root.AddCommand(newSplitCmd("Split a pane right or down (alias for pane split)"))
}
