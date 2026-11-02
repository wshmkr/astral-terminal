package output

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"testing"

	"github.com/spf13/cobra"
)

func TestShortID(t *testing.T) {
	cases := map[string]string{
		"":                                     "",
		"abc":                                  "abc",
		"12345678":                             "12345678",
		"0f8e2c1a-4b6d-4e1f-9a3b-7c2d5e6f8a9b": "0f8e2c1a",
	}
	for in, want := range cases {
		if got := ShortID(in); got != want {
			t.Errorf("ShortID(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestTable(t *testing.T) {
	var buf bytes.Buffer
	Table(&buf, []string{"ID", "NAME"}, [][]string{{"1", "one"}, {"22", "two"}})
	want := "ID  NAME\n1   one\n22  two\n"
	if buf.String() != want {
		t.Errorf("Table = %q, want %q", buf.String(), want)
	}
}

type failAfter struct{ n int }

func (f *failAfter) Write(p []byte) (int, error) {
	if f.n == 0 {
		return 0, errors.New("disk full")
	}
	f.n--
	return len(p), nil
}

func TestPrintReturnsHumanWriteError(t *testing.T) {
	cmd := &cobra.Command{Use: "x"}
	cmd.Flags().Bool("json", false, "")
	w := &failAfter{n: 1}
	cmd.SetOut(w)
	err := Print(cmd, nil, func(out io.Writer) {
		fmt.Fprintln(out, "first")
		fmt.Fprintln(out, "second")
		fmt.Fprintln(out, "third")
	})
	if err == nil || err.Error() != "disk full" {
		t.Errorf("err = %v", err)
	}

	cmd.SetOut(&failAfter{})
	err = Print(cmd, nil, func(out io.Writer) {
		Table(out, []string{"ID"}, [][]string{{"1"}})
	})
	if err == nil {
		t.Error("Table write error dropped")
	}
}

func TestPrint(t *testing.T) {
	newCmd := func(jsonFlag bool) (*cobra.Command, *bytes.Buffer) {
		var buf bytes.Buffer
		cmd := &cobra.Command{Use: "x"}
		cmd.Flags().Bool("json", jsonFlag, "")
		cmd.SetOut(&buf)
		return cmd, &buf
	}
	human := func(w io.Writer) { io.WriteString(w, "human\n") }

	cmd, buf := newCmd(false)
	if err := Print(cmd, map[string]bool{"pong": true}, human); err != nil {
		t.Fatal(err)
	}
	if buf.String() != "human\n" {
		t.Errorf("human output = %q", buf.String())
	}

	cmd, buf = newCmd(true)
	if err := Print(cmd, map[string]bool{"pong": true}, human); err != nil {
		t.Fatal(err)
	}
	if buf.String() != "{\n  \"pong\": true\n}\n" {
		t.Errorf("json output = %q", buf.String())
	}
}
