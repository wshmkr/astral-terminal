package output

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"text/tabwriter"

	"github.com/spf13/cobra"
)

const shortIDLen = 8

func JSONEnabled(cmd *cobra.Command) bool {
	f := cmd.Flag("json")
	return f != nil && f.Value.String() == "true"
}

func Print(cmd *cobra.Command, result any, human func(w io.Writer)) error {
	w := cmd.OutOrStdout()
	if JSONEnabled(cmd) || human == nil {
		return WriteJSON(w, result)
	}
	human(w)
	return nil
}

func WriteJSON(w io.Writer, v any) error {
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	enc.SetIndent("", "  ")
	return enc.Encode(v)
}

func ShortID(id string) string {
	if len(id) <= shortIDLen {
		return id
	}
	return id[:shortIDLen]
}

func Table(w io.Writer, headers []string, rows [][]string) {
	tw := tabwriter.NewWriter(w, 0, 0, 2, ' ', 0)
	if len(headers) > 0 {
		fmt.Fprintln(tw, strings.Join(headers, "\t"))
	}
	for _, row := range rows {
		fmt.Fprintln(tw, strings.Join(row, "\t"))
	}
	tw.Flush()
}
