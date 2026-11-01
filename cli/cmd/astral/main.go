package main

import (
	"context"
	"os"

	"github.com/wshmkr/astral-terminal/cli/internal/commands"
)

var version = "dev"

func main() {
	commands.Version = version
	os.Exit(commands.Execute(context.Background(), os.Args[1:], os.Stdout, os.Stderr))
}
