package keys

import "testing"

func TestValid(t *testing.T) {
	valid := []string{
		"enter", "tab", "escape", "backspace", "delete", "up", "down", "left",
		"right", "home", "end", "pageup", "pagedown", "f1", "f12", "ctrl-a",
		"ctrl-z", "alt-x", "alt-.", "alt-A",
	}
	for _, k := range valid {
		if !Valid(k) {
			t.Errorf("Valid(%q) = false", k)
		}
		if err := Validate(k); err != nil {
			t.Errorf("Validate(%q) = %v", k, err)
		}
	}
	invalid := []string{
		"", "Enter", "f0", "f13", "ctrl-", "ctrl-1", "ctrl-A", "ctrl-ab",
		"alt-", "alt-ab", "alt- ", "space", "esc",
	}
	for _, k := range invalid {
		if Valid(k) {
			t.Errorf("Valid(%q) = true", k)
		}
		if Validate(k) == nil {
			t.Errorf("Validate(%q) = nil", k)
		}
	}
}

func TestNamesUnique(t *testing.T) {
	seen := map[string]bool{}
	for _, n := range Names {
		if seen[n] {
			t.Errorf("duplicate key name %q", n)
		}
		seen[n] = true
	}
	if len(Names) != 13+12+26 {
		t.Errorf("len(Names) = %d", len(Names))
	}
}
