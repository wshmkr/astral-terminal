package commands

import (
	"fmt"
	"io"
	"unicode/utf8"

	"github.com/spf13/cobra"
	"github.com/wshmkr/astral-terminal/cli/internal/keys"
	"github.com/wshmkr/astral-terminal/cli/internal/output"
	"github.com/wshmkr/astral-terminal/cli/internal/protocol"
)

const tabIOEnter = "\r"

func tabIOSendArgs(cmd *cobra.Command, args []string) error {
	if len(args) != 1 {
		return usageErrorf("usage: %s <text|-> [--enter] [--paste]", cmd.CommandPath())
	}
	return nil
}

func tabIOSendText(cmd *cobra.Command, args []string) (string, error) {
	text := args[0]
	if text == "-" {
		data, err := io.ReadAll(cmd.InOrStdin())
		if err != nil {
			return "", fmt.Errorf("read stdin: %w", err)
		}
		text = string(data)
	}
	if !utf8.ValidString(text) {
		return "", usageErrorf("text is not valid UTF-8")
	}
	return text, nil
}

func tabIORunSend(cmd *cobra.Command, args []string) error {
	text, err := tabIOSendText(cmd, args)
	if err != nil {
		return err
	}
	enter, err := cmd.Flags().GetBool("enter")
	if err != nil {
		return err
	}
	paste, err := cmd.Flags().GetBool("paste")
	if err != nil {
		return err
	}
	params := TargetParams(cmd)
	if paste {
		params["paste"] = true
	} else if enter {
		text += tabIOEnter
	}
	params["text"] = text
	var result protocol.TabIOSendTextResult
	if err := call(cmd, "surface.sendText", params, &result); err != nil {
		return err
	}
	// A carriage return inside the paste brackets would not submit the line.
	if paste && enter {
		var enterResult protocol.TabIOSendTextResult
		enterParams := map[string]any{"surfaceId": result.SurfaceID, "text": tabIOEnter}
		if err := call(cmd, "surface.sendText", enterParams, &enterResult); err != nil {
			return err
		}
		result.Bytes += enterResult.Bytes
	}
	return output.Print(cmd, result, func(io.Writer) {})
}

func tabIOSendKeyArgs(cmd *cobra.Command, args []string) error {
	if len(args) == 0 {
		return usageErrorf("usage: %s <key>...", cmd.CommandPath())
	}
	for _, name := range args {
		if err := keys.Validate(name); err != nil {
			return &UsageError{Err: err}
		}
	}
	return nil
}

func tabIORunSendKey(cmd *cobra.Command, args []string) error {
	params := TargetParams(cmd)
	params["keys"] = args
	var result protocol.TabIOSurfaceResult
	if err := call(cmd, "surface.sendKey", params, &result); err != nil {
		return err
	}
	return output.Print(cmd, result, func(io.Writer) {})
}

func tabIORunRead(cmd *cobra.Command, _ []string) error {
	params := TargetParams(cmd)
	if cmd.Flags().Changed("lines") {
		lines, err := cmd.Flags().GetInt("lines")
		if err != nil {
			return err
		}
		if lines <= 0 {
			return usageErrorf("--lines must be a positive integer")
		}
		params["lines"] = lines
	}
	for _, flag := range []string{"scrollback", "ansi"} {
		set, err := cmd.Flags().GetBool(flag)
		if err != nil {
			return err
		}
		if set {
			params[flag] = true
		}
	}
	var result protocol.TabIOReadResult
	if err := call(cmd, "surface.read", params, &result); err != nil {
		return err
	}
	return output.Print(cmd, result, func(w io.Writer) {
		fmt.Fprint(w, result.Text)
	})
}

func tabIOClearHistoryArgs(cmd *cobra.Command, args []string) error {
	if len(args) > 1 {
		return usageErrorf("usage: %s [tab]", cmd.CommandPath())
	}
	return nil
}

func tabIORunClearHistory(cmd *cobra.Command, args []string) error {
	params := TargetParams(cmd)
	if len(args) == 1 {
		params["surfaceId"] = args[0]
	}
	var result protocol.TabIOSurfaceResult
	if err := call(cmd, "surface.clearHistory", params, &result); err != nil {
		return err
	}
	return output.Print(cmd, result, func(io.Writer) {})
}

func init() {
	sendCmd := &cobra.Command{
		Use:   "send <text|->",
		Short: "Send text to a terminal tab; - reads the text from stdin",
		Args:  tabIOSendArgs,
		RunE:  tabIORunSend,
	}
	sendCmd.Flags().Bool("enter", false, "press Enter after the text")
	sendCmd.Flags().Bool("paste", false, "send as a bracketed paste when the terminal has it enabled")

	sendKeyCmd := &cobra.Command{
		Use:   "send-key <key>...",
		Short: "Send named keys to a terminal tab",
		Args:  tabIOSendKeyArgs,
		RunE:  tabIORunSendKey,
	}

	readCmd := &cobra.Command{
		Use:   "read",
		Short: "Print a terminal tab's screen",
		Args:  cobra.NoArgs,
		RunE:  tabIORunRead,
	}
	readCmd.Flags().Bool("scrollback", false, "include the scrollback")
	readCmd.Flags().Int("lines", 0, "print only the last N lines, looking back through the scrollback")
	readCmd.Flags().Bool("ansi", false, "include colors and styles as escape sequences")

	clearHistoryCmd := &cobra.Command{
		Use:   "clear-history [tab]",
		Short: "Clear a terminal tab's screen and scrollback, keeping the cursor line",
		Args:  tabIOClearHistoryArgs,
		RunE:  tabIORunClearHistory,
	}

	Tab.AddCommand(sendCmd, sendKeyCmd, readCmd, clearHistoryCmd)
}
