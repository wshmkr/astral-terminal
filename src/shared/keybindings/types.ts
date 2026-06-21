export type Scope = "global" | "terminal" | "browser";

export type Platform = "mac" | "other";

export type CommandId =
  | "pane.splitRight"
  | "pane.splitDown"
  | "pane.close"
  | "workspace.new"
  | "workspace.next"
  | "workspace.prev"
  | "workspace.select.1"
  | "workspace.select.2"
  | "workspace.select.3"
  | "workspace.select.4"
  | "workspace.select.5"
  | "workspace.select.6"
  | "workspace.select.7"
  | "workspace.select.8"
  | "workspace.select.9"
  | "tab.new"
  | "tab.newBrowser"
  | "tab.close"
  | "tab.next"
  | "tab.prev"
  | "ui.zoomIn"
  | "ui.zoomOut"
  | "ui.zoomReset"
  | "app.openSettings"
  | "browser.back"
  | "browser.forward"
  | "browser.reload"
  | "browser.focusAddressBar"
  | "browser.devtools"
  | "browser.find"
  | "terminal.copy"
  | "terminal.paste"
  | "terminal.find";

export interface Binding {
  command: CommandId;
  combo: string;
  scope: Scope;
  platform?: Platform; // omitted = every platform
}
