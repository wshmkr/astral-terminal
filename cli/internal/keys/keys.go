package keys

import (
	"fmt"
	"strings"
)

var Names = buildNames()

func buildNames() []string {
	names := []string{
		"enter", "tab", "escape", "backspace", "delete",
		"up", "down", "left", "right",
		"home", "end", "pageup", "pagedown",
	}
	for i := 1; i <= 12; i++ {
		names = append(names, fmt.Sprintf("f%d", i))
	}
	for c := 'a'; c <= 'z'; c++ {
		names = append(names, "ctrl-"+string(c))
	}
	return names
}

var named = func() map[string]bool {
	m := make(map[string]bool, len(Names))
	for _, n := range Names {
		m[n] = true
	}
	return m
}()

func Valid(name string) bool {
	if named[name] {
		return true
	}
	if rest, ok := strings.CutPrefix(name, "alt-"); ok {
		return len(rest) == 1 && rest[0] >= 0x21 && rest[0] <= 0x7e
	}
	return false
}

func Validate(name string) error {
	if Valid(name) {
		return nil
	}
	return fmt.Errorf("invalid key name %q (expected one of %s, f1-f12, ctrl-<a-z>, alt-<char>)",
		name, strings.Join(Names[:13], ", "))
}
