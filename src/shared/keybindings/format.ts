import { resolveBindings } from "./match";
import type { CommandId } from "./types";

const MAC_MODIFIERS: Record<string, string> = {
  mod: "⌘",
  ctrl: "⌃",
  control: "⌃",
  shift: "⇧",
  alt: "⌥",
  option: "⌥",
};

const MODIFIERS: Record<string, string> = {
  mod: "Ctrl",
  ctrl: "Ctrl",
  control: "Ctrl",
  shift: "Shift",
  alt: "Alt",
  option: "Alt",
};

const KEY_LABELS: Record<string, string> = {
  equal: "=",
  minus: "-",
  arrowleft: "←",
  arrowright: "→",
  arrowup: "↑",
  arrowdown: "↓",
  escape: "Esc",
  enter: "Enter",
  tab: "Tab",
  space: "Space",
  backspace: "Backspace",
  pageup: "PageUp",
  pagedown: "PageDown",
};

function formatKey(token: string): string {
  const lower = token.toLowerCase();
  const named = KEY_LABELS[lower];
  if (named) return named;
  if (/^f\d{1,2}$/.test(lower)) return lower.toUpperCase();
  if (lower.length === 1) return token.toUpperCase();
  return token.charAt(0).toUpperCase() + token.slice(1);
}

export function formatCombo(combo: string, isMac: boolean): string {
  const modifiers = isMac ? MAC_MODIFIERS : MODIFIERS;
  const parts = combo.split("+").map((raw) => {
    const token = raw.trim();
    return modifiers[token.toLowerCase()] ?? formatKey(token);
  });
  return parts.join(isMac ? "" : "+");
}

export function shortcutForCommand(
  command: CommandId,
  isMac: boolean,
): string | null {
  const binding = resolveBindings().find((b) => b.command === command);
  return binding ? formatCombo(binding.combo, isMac) : null;
}
