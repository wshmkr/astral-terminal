export type SplitDirection = "horizontal" | "vertical";

export const DEFAULT_CWD = "~";
export const DEFAULT_TERMINAL_BG = "#282c34";

export interface TerminalSurface {
  type: "terminal";
  id: string;
  name: string;
  cwd: string;
  startupCommand?: string;
  branch?: string;
  agentCwd?: string;
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
}

export interface NotificationSettings {
  soundEnabled: boolean;
  osNotificationsEnabled: boolean;
}

export interface NotificationFirePayload {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  title: string;
  body?: string;
}

export interface AppConfig {
  terminalTheme: TerminalTheme;
  platform: {
    isWindows: boolean;
    windowsBuild?: number;
  };
}

export const DEFAULT_TERMINAL_THEME: TerminalTheme = {
  background: DEFAULT_TERMINAL_BG,
  foreground: "#dcdfe4",
  cursor: "#dcdfe4",
  cursorAccent: DEFAULT_TERMINAL_BG,
  selectionBackground: "#264f78",
  selectionForeground: "#ffffff",
  black: DEFAULT_TERMINAL_BG,
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#dcdfe4",
  brightBlack: "#5a6374",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#dcdfe4",
};

export type ConfigureAgentHooksResult =
  | { status: "configured" }
  | { status: "already-configured" }
  | { status: "error"; message: string };

export interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  focusedPaneId: string | null;
  sidebarWidth: number;
  terminalBackground: string;
  notificationSettings: NotificationSettings;
  windowFocused: boolean;
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
  },
  git: {
    getBranch: "git:getBranch",
  },
} as const;

export const ptyDataChannel = (ptyId: string) => `pty:data:${ptyId}`;
export const ptyExitChannel = (ptyId: string) => `pty:exit:${ptyId}`;
