package commands

import "github.com/spf13/cobra"

var Workspace = newNoun("workspace", "Manage workspaces")

var Pane = newNoun("pane", "Manage panes")

var Tab = newNoun("tab", "Manage tabs")

func newNoun(name, short string) *cobra.Command {
	return &cobra.Command{
		Use:   name,
		Short: short,
		Args:  cobra.NoArgs,
		RunE: func(cmd *cobra.Command, _ []string) error {
			return cmd.Help()
		},
	}
}

func init() {
	Root.AddCommand(Workspace, Pane, Tab)
}
