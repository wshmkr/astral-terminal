import type { AgentHookStatus, AgentName } from "./agent-hooks";

export type AppMode = "packaged" | "dev";

const ASTRAL_MODE_ARG_PREFIX = "--astral-mode=";

export function encodeAppModeArg(mode: AppMode): string {
  return `${ASTRAL_MODE_ARG_PREFIX}${mode}`;
}

export function decodeAppModeArg(argv: readonly string[]): AppMode {
  const raw = argv
    .find((a) => a.startsWith(ASTRAL_MODE_ARG_PREFIX))
    ?.slice(ASTRAL_MODE_ARG_PREFIX.length);
  return raw === "dev" ? "dev" : "packaged";
}

export type SplitDirection = "horizontal" | "vertical";

export const DEFAULT_CWD = "~";
export const INITIAL_WINDOW_BG = "#282c34";

export interface BaseSurface {
  id: string;
  name: string;
}

export interface TerminalSurface extends BaseSurface {
  type: "terminal";
  cwd: string;
}

export interface BrowserSurface extends BaseSurface {
  type: "browser";
  initialUrl: string;
}

export type Surface = TerminalSurface | BrowserSurface;
export type SurfaceKind = Surface["type"];

export function isTerminalSurface(s: Surface): s is TerminalSurface {
  return s.type === "terminal";
}

export function isBrowserSurface(s: Surface): s is BrowserSurface {
  return s.type === "browser";
}

function stripUserHostPrefix(name: string): string {
  return name.replace(/^\S+@\S+:\s*/, "");
}

export function surfaceTabLabel(s: Surface): string {
  return s.name;
}

export function surfaceSidebarLabel(s: Surface): string {
  switch (s.type) {
    case "terminal":
      return stripUserHostPrefix(s.name);
    case "browser":
      return s.name;
  }
}

export interface BrowserState {
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

export interface BrowserAnchorOffsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const DEFAULT_BROWSER_URL = "about:blank";

export interface LeafPane {
  kind: "leaf";
  id: string;
  surfaces: Surface[];
  activeSurfaceId: string;
}

export interface SplitPane {
  kind: "split";
  id: string;
  direction: SplitDirection;
  children: PaneNode[];
  sizes?: number[];
}

export type PaneNode = LeafPane | SplitPane;

export interface Notification {
  id: string;
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  layout: PaneNode;
  notifications: Notification[];
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selectionBackground: string;
  selectionForeground: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
  searchHighlight: string;
}

export interface NotificationSettings {
  soundEnabled: boolean;
  osNotificationsEnabled: boolean;
}

export interface UpdateSettings {
  autoEnabled: boolean;
}

export type AppThemeId = "dark" | "light";
export type TerminalThemeId = "one-half-dark" | "one-half-light";
export type FontFamilyId =
  | "jetbrains-mono"
  | "cascadia-code"
  | "consolas"
  | "system-monospace";
export type AccentColorId =
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal";

export interface AppearanceSettings {
  appThemeId: AppThemeId;
  terminalThemeId: TerminalThemeId;
  fontFamily: FontFamilyId;
  fontSize: number;
  uiScale: number;
  accentColorId: AccentColorId;
}

export interface NotificationFirePayload {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  title: string;
  body?: string;
}

export interface AppConfig {
  platform: {
    isWindows: boolean;
    windowsBuild?: number;
  };
}

export type ConfigureAgentHooksResult =
  | { status: "configured" }
  | { status: "already-configured" }
  | { status: "error"; message: string };

export type UninstallAgentHooksResult =
  | { status: "uninstalled" }
  | { status: "not-installed" }
  | { status: "error"; message: string };

export interface PersistedSettings {
  workspaces: Array<Omit<Workspace, "notifications">>;
  activeWorkspaceId: string | null;
  sidebarWidth?: number;
  appearance?: AppearanceSettings;
  notificationSettings?: NotificationSettings;
  updateSettings?: UpdateSettings;
}

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  focusedPaneId: string | null;
  sidebarWidth: number;
  appearance: AppearanceSettings;
  notificationSettings: NotificationSettings;
  updateSettings: UpdateSettings;

  // not persisted:
  agentHookStatuses: Partial<Record<AgentName, AgentHookStatus>>;
  windowFocused: boolean;
  settingsOpen: boolean;
  welcomeOpen: boolean;
}

export const IPC = {
  pty: {
    create: "pty:create",
    write: "pty:write",
    resize: "pty:resize",
    kill: "pty:kill",
    replay: "pty:replay",
    pruneBuffers: "pty:prune-buffers",
  },
  notification: {
    fire: "notification:fire",
    click: "notification:click",
  },
  window: {
    minimize: "window:minimize",
    maximize: "window:maximize",
    close: "window:close",
    maximizedChanged: "window:maximized-changed",
  },
  config: {
    read: "config:read",
  },
  settings: {
    read: "settings:read",
    write: "settings:write",
  },
  agentHooks: {
    configure: "agent-hooks:configure",
    uninstall: "agent-hooks:uninstall",
    status: "agent-hooks:status",
  },
  browser: {
    create: "browser:create",
    destroy: "browser:destroy",
    setAnchorOffsets: "browser:set-anchor-offsets",
    setVisible: "browser:set-visible",
    loadURL: "browser:load-url",
    command: "browser:command",
  },
} as const;

export type BrowserCommand =
  | "goBack"
  | "goForward"
  | "reload"
  | "stop"
  | "focus";

const BROWSER_COMMAND_TABLE: Record<BrowserCommand, true> = {
  goBack: true,
  goForward: true,
  reload: true,
  stop: true,
  focus: true,
};

export function isBrowserCommand(x: unknown): x is BrowserCommand {
  return typeof x === "string" && x in BROWSER_COMMAND_TABLE;
}

export const ptyDataChannel = (ptyId: string) => `pty:data:${ptyId}`;
export const ptyExitChannel = (ptyId: string) => `pty:exit:${ptyId}`;
export const ptyCwdChannel = (ptyId: string) => `pty:cwd:${ptyId}`;
export const browserStateChannel = (surfaceId: string) =>
  `browser:state:${surfaceId}`;
