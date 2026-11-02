package commands

import (
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

func treeMark(on bool, mark string) string {
	if on {
		return mark
	}
	return " "
}

func treeLine(w io.Writer, caller, focused bool, depth int, fields ...string) {
	fmt.Fprintf(w, "%s%s %s%s\n",
		treeMark(caller, "*"),
		treeMark(focused, ">"),
		strings.Repeat("  ", depth),
		strings.Join(fields, " "))
}

func treePrintNode(w io.Writer, node *protocol.WorkspaceNode, callerSurfaceID string) {
	if node.PaneID == "" {
		for i := range node.Children {
			treePrintNode(w, &node.Children[i], callerSurfaceID)
		}
		return
	}
	treeLine(w, false, node.Focused, 1, "pane", output.ShortID(node.PaneID))
	for _, tab := range node.Tabs {
		fields := []string{"tab", output.ShortID(tab.SurfaceID), tab.Type, tab.Name}
		switch {
		case tab.Cwd != "":
			fields = append(fields, tab.Cwd)
		case tab.URL != "":
			fields = append(fields, tab.URL)
		}
		isCaller := callerSurfaceID != "" && tab.SurfaceID == callerSurfaceID
		treeLine(w, isCaller, node.Focused && tab.Active, 2, fields...)
	}
}

var treeCmd = &cobra.Command{
	Use:   "tree",
	Short: "Print workspaces, panes and tabs, marking the caller (*) and focus (>)",
	Args:  cobra.NoArgs,
	RunE: func(cmd *cobra.Command, _ []string) error {
		params := map[string]any{"layout": true}
		return workspaceCall(cmd, "workspace.list", params, func(w io.Writer, r protocol.WorkspaceList) {
			caller := os.Getenv("ASTRAL_SURFACE_ID")
			for _, ws := range r.Workspaces {
				treeLine(w, false, ws.Active, 0, "workspace", strconv.Itoa(ws.Index), output.ShortID(ws.ID), ws.Name)
				if ws.Layout != nil {
					treePrintNode(w, ws.Layout, caller)
				}
			}
		})
	},
}

func init() {
	Root.AddCommand(treeCmd)
}
