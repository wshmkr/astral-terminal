import { DEFAULT_KEYBINDINGS } from "./defaults";
import type { Binding, CommandId, Scope } from "./types";

export interface KeyEventLike {
  key: string;
  code: string;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

export function fromDomEvent(e: KeyboardEvent): KeyEventLike {
  return {
    key: e.key,
    code: e.code,
    ctrl: e.ctrlKey,
    meta: e.metaKey,
    alt: e.altKey,
    shift: e.shiftKey,
  };
}

interface ElectronInputLike {
  key: string;
  code: string;
  control: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

export function fromElectronInput(input: ElectronInputLike): KeyEventLike {
  return {
    key: input.key,
    code: input.code,
    ctrl: input.control,
    meta: input.meta,
    alt: input.alt,
    shift: input.shift,
  };
}

// Layout-independent key identity derived from the physical key, so combos
// survive Shift mutating the produced character (Equal stays Equal, not "+").
function keyId(code: string, key: string): string {
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) {
    const rest = code.slice(6);
    if (/^\d$/.test(rest)) return rest;
    if (rest === "Enter") return "enter";
  }
  if (/^F\d{1,2}$/.test(code)) return code.toLowerCase();
  switch (code) {
    case "Minus":
      return "minus";
    case "Equal":
      return "equal";
    case "Tab":
      return "tab";
    case "Enter":
      return "enter";
    case "Escape":
      return "escape";
    case "Space":
      return "space";
    case "Backspace":
      return "backspace";
    case "ArrowLeft":
      return "arrowleft";
    case "ArrowRight":
      return "arrowright";
    case "ArrowUp":
      return "arrowup";
    case "ArrowDown":
      return "arrowdown";
    case "PageUp":
      return "pageup";
    case "PageDown":
      return "pagedown";
    default:
      return key.toLowerCase();
  }
}

interface ParsedCombo {
  keyId: string;
  mod: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

const comboCache = new Map<string, ParsedCombo>();

function parseCombo(combo: string): ParsedCombo {
  const cached = comboCache.get(combo);
  if (cached) return cached;
  const parsed: ParsedCombo = {
    keyId: "",
    mod: false,
    ctrl: false,
    shift: false,
    alt: false,
  };
  combo.split("+").forEach((raw) => {
    const token = raw.trim();
    switch (token.toLowerCase()) {
      case "mod":
        parsed.mod = true;
        break;
      case "ctrl":
      case "control":
        parsed.ctrl = true;
        break;
      case "shift":
        parsed.shift = true;
        break;
      case "alt":
      case "option":
        parsed.alt = true;
        break;
      default:
        parsed.keyId = token.toLowerCase();
    }
  });
  comboCache.set(combo, parsed);
  return parsed;
}

function matches(
  event: KeyEventLike,
  combo: ParsedCombo,
  isMac: boolean,
): boolean {
  const requireCtrl = combo.ctrl || (!isMac && combo.mod);
  const requireMeta = isMac && combo.mod;
  return (
    event.ctrl === requireCtrl &&
    event.meta === requireMeta &&
    event.alt === combo.alt &&
    event.shift === combo.shift &&
    keyId(event.code, event.key) === combo.keyId
  );
}

export function matchBinding(
  event: KeyEventLike,
  bindings: Binding[],
  isMac: boolean,
  scope: Scope,
): CommandId | null {
  for (const binding of bindings) {
    if (binding.scope !== scope) continue;
    if (matches(event, parseCombo(binding.combo), isMac))
      return binding.command;
  }
  return null;
}

// Single resolution point: today the defaults, later defaults merged with the
// user's persisted overrides.
export function resolveBindings(): Binding[] {
  return DEFAULT_KEYBINDINGS;
}
