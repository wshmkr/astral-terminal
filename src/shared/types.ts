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
export const DEFAULT_TERMINAL_BG = "#282c34";

export interface TerminalSurface {
  type: "terminal";
  id: string;
  name: string;
  cwd: string;
}

export type Surface = TerminalSurface;

export function isTerminalSurface(s: Surface): s is TerminalSurface {
  return s.type === "terminal";
}

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
  agentHooks: Record<string, boolean>;
}

export type AppThemeId = "dark" | "light";
export type TerminalThemeId = "one-dark" | "one-light";
export type FontFamilyId =
  | "jetbrains-mono"
  | "cascadia-code"
  | "consolas"
  | "system-monospace";

export interface AppearanceSettings {
  appThemeId: AppThemeId;
  terminalThemeId: TerminalThemeId;
  fontFamily: FontFamilyId;
  fontSize: number;
  uiScale: number;
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

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  focusedPaneId: string | null;
  sidebarWidth: number;
  appearance: AppearanceSettings;
  notificationSettings: NotificationSettings;
  windowFocused: boolean;
  settingsOpen: boolean;
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
  agentHooks: {
    configure: "agent-hooks:configure",
    detect: "agent-hooks:detect",
    uninstall: "agent-hooks:uninstall",
  },
} as const;

export const ptyDataChannel = (ptyId: string) => `pty:data:${ptyId}`;
export const ptyExitChannel = (ptyId: string) => `pty:exit:${ptyId}`;
