import type { Binding } from "./types";

// Combo token grammar: parts joined by "+".
//   Mod   -> Cmd on macOS, Ctrl elsewhere
//   Ctrl  -> literal Control on every platform
//   Shift / Alt -> literal modifiers
//   final token -> a key, matched against the physical key (see match.ts keyId)
export const DEFAULT_KEYBINDINGS: Binding[] = [
  { command: "pane.splitRight", combo: "Mod+Shift+D", scope: "global" },
  { command: "pane.splitDown", combo: "Mod+Shift+E", scope: "global" },
  { command: "pane.close", combo: "Mod+Shift+W", scope: "global" },

  { command: "workspace.new", combo: "Mod+N", scope: "global" },
  { command: "workspace.next", combo: "Alt+ArrowDown", scope: "global" },
  { command: "workspace.prev", combo: "Alt+ArrowUp", scope: "global" },
  { command: "workspace.select.1", combo: "Mod+1", scope: "global" },
  { command: "workspace.select.2", combo: "Mod+2", scope: "global" },
  { command: "workspace.select.3", combo: "Mod+3", scope: "global" },
  { command: "workspace.select.4", combo: "Mod+4", scope: "global" },
  { command: "workspace.select.5", combo: "Mod+5", scope: "global" },
  { command: "workspace.select.6", combo: "Mod+6", scope: "global" },
  { command: "workspace.select.7", combo: "Mod+7", scope: "global" },
  { command: "workspace.select.8", combo: "Mod+8", scope: "global" },
  { command: "workspace.select.9", combo: "Mod+9", scope: "global" },

  { command: "tab.new", combo: "Mod+T", scope: "global" },
  { command: "tab.newBrowser", combo: "Mod+Shift+T", scope: "global" },
  { command: "tab.close", combo: "Mod+W", scope: "global" },
  { command: "tab.next", combo: "Ctrl+Tab", scope: "global" },
  { command: "tab.prev", combo: "Ctrl+Shift+Tab", scope: "global" },

  { command: "ui.zoomIn", combo: "Mod+Equal", scope: "global" },
  { command: "ui.zoomIn", combo: "Mod+Shift+Equal", scope: "global" },
  { command: "ui.zoomOut", combo: "Mod+Minus", scope: "global" },
  { command: "ui.zoomOut", combo: "Mod+Shift+Minus", scope: "global" },
  { command: "ui.zoomReset", combo: "Mod+0", scope: "global" },

  { command: "app.openSettings", combo: "Mod+,", scope: "global" },

  { command: "browser.back", combo: "Alt+ArrowLeft", scope: "browser" },
  { command: "browser.forward", combo: "Alt+ArrowRight", scope: "browser" },
  { command: "browser.reload", combo: "Mod+R", scope: "browser" },
  { command: "browser.reload", combo: "F5", scope: "browser" },
  { command: "browser.focusAddressBar", combo: "Mod+L", scope: "browser" },
  { command: "browser.devtools", combo: "F12", scope: "browser" },
  { command: "browser.find", combo: "Mod+F", scope: "browser" },

  { command: "terminal.copy", combo: "Mod+Shift+C", scope: "terminal" },
  {
    command: "terminal.copy",
    combo: "Ctrl+C",
    scope: "terminal",
    platform: "other",
  },
  { command: "terminal.paste", combo: "Mod+Shift+V", scope: "terminal" },
  { command: "terminal.paste", combo: "Mod+V", scope: "terminal" },
  { command: "terminal.find", combo: "Mod+F", scope: "terminal" },
];
