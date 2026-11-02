package main

import (
	"context"
	"fmt"
	"os"

	"github.com/wshmkr/astral-terminal/cli/internal/commands"
)

var (
	version = "dev"
	marker  = "astral-terminal:cli:dev"
)

func main() {
	if len(os.Args) == 2 && os.Args[1] == "--marker" {
		fmt.Println(marker)
		return
	}
	commands.Version = version
	os.Exit(commands.Execute(context.Background(), os.Args[1:], os.Stdout, os.Stderr))
}
