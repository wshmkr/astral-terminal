import type { AgentHookStatus, AgentName } from "./agent-hooks";
import type {
  AccentColorId,
  AppearanceSettings,
  AppThemeId,
  BrowserSettings,
  FontFamilyId,
  NotificationSettings,
  TerminalSettings,
  TerminalThemeId,
  UpdateSettings,
} from "./settings-types";

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
export const INITIAL_WINDOW_BG = "#262624";
export const SETTINGS_FADE_MS = 200;
export const SETTINGS_FADE_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

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
  url: string;
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

export function surfaceSidebarLabel(s: Surface): string {
  switch (s.type) {
    case "terminal":
      return stripUserHostPrefix(s.name);
    case "browser":
      return `🌐︎ ${s.name}`;
  }
}

export interface BrowserState {
  url: string;
  title: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  favicon: string | null;
}

export interface BrowserAnchorOffsets {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export const DEFAULT_BROWSER_URL = "about:blank";

export function defaultBrowserState(url: string): BrowserState {
  return {
    url,
    title: "",
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    favicon: null,
  };
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

export interface PersistedWorkspaces {
  workspaces: Array<Omit<Workspace, "notifications">>;
  activeWorkspaceId: string | null;
  sidebarWidth?: number;
}

export interface TerminalTheme {
  colorScheme: "dark" | "light";
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

export interface WslDistro {
  name: string;
  isDefault: boolean;
  isSystem: boolean;
  version: number | null;
}

export type UpdateState =
  | "idle"
  | "checking"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

export interface UpdateStatus {
  state: UpdateState;
  lastCheckedAt: number | null;
  errorMessage?: string;
  version?: string;
}

export interface NotificationFirePayload {
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  title: string;
  body?: string;
}

export interface NotificationPanelItem {
  id: string;
  workspaceId: string;
  paneId: string;
  surfaceId: string;
  read: boolean;
  timestamp: number;
  title: string;
  body: string;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NotificationPanelState {
  appearance: AppearanceSettings;
  items: NotificationPanelItem[];
}

export type NotificationPanelActionMap = {
  select: (
    workspaceId: string,
    paneId: string,
    surfaceId: string,
    notifId: string,
  ) => void;
  dismiss: (workspaceId: string, notifId: string) => void;
  clearAll: () => void;
};

export type NotificationPanelAction = {
  [K in keyof NotificationPanelActionMap]: {
    kind: K;
    args: Parameters<NotificationPanelActionMap[K]>;
  };
}[keyof NotificationPanelActionMap];

export interface SettingsState {
  appearance: AppearanceSettings;
  notificationSettings: NotificationSettings;
  updateSettings: UpdateSettings;
  terminalSettings: TerminalSettings;
  browserSettings: BrowserSettings;
  agentHookStatuses: Partial<Record<AgentName, AgentHookStatus>>;
  updateStatus: UpdateStatus;
}

export type SettingsActionMap = {
  setAppTheme: (id: AppThemeId) => void;
  setTerminalTheme: (id: TerminalThemeId) => void;
  setAccentColor: (id: AccentColorId) => void;
  setFontFamily: (id: FontFamilyId) => void;
  setFontSize: (n: number) => void;
  setTerminalLineHeight: (n: number) => void;
  setUiScale: (n: number) => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  updateUpdateSettings: (patch: Partial<UpdateSettings>) => void;
  setWslDistro: (distro: string | null) => void;
  updateBrowserSettings: (patch: Partial<BrowserSettings>) => void;
  setAgentHookStatus: (name: AgentName, status: AgentHookStatus) => void;
};

export type SettingsAction = {
  [K in keyof SettingsActionMap]: {
    kind: K;
    args: Parameters<SettingsActionMap[K]>;
  };
}[keyof SettingsActionMap];

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
  updateSettings: UpdateSettings;
  terminalSettings: TerminalSettings;
  browserSettings: BrowserSettings;

  // not persisted:
  agentHookStatuses: Partial<Record<AgentName, AgentHookStatus>>;
  updateStatus: UpdateStatus;
  windowFocused: boolean;
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
    openPanel: "notification:open-panel",
    closePanel: "notification:close-panel",
    panelOpened: "notification:panel-opened",
    panelClosed: "notification:panel-closed",
    stateChanged: "notification:state-changed",
    statePublish: "notification:state-publish",
    action: "notification:action",
  },
  window: {
    minimize: "window:minimize",
    maximize: "window:maximize",
    close: "window:close",
    maximizedChanged: "window:maximized-changed",
    focusChanged: "window:focus-changed",
  },
  config: {
    read: "config:read",
  },
  workspaces: {
    read: "workspaces:read",
    write: "workspaces:write",
  },
  settings: {
    read: "settings:read",
    write: "settings:write",
    open: "settings:open",
    close: "settings:close",
    stateChanged: "settings:state-changed",
    statePublish: "settings:state-publish",
    action: "settings:action",
    actionApply: "settings:action-apply",
    invokeAgentHook: "settings:invoke-agent-hook",
    fade: "settings:fade",
  },
  agentHooks: {
    configure: "agent-hooks:configure",
    uninstall: "agent-hooks:uninstall",
    status: "agent-hooks:status",
  },
  shell: {
    openExternal: "shell:open-external",
    showLinkMenu: "shell:show-link-menu",
  },
  wsl: {
    listDistros: "wsl:list-distros",
  },
  browser: {
    create: "browser:create",
    destroy: "browser:destroy",
    setAnchorOffsets: "browser:set-anchor-offsets",
    setVisible: "browser:set-visible",
    loadURL: "browser:load-url",
    command: "browser:command",
    openNewTab: "browser:open-new-tab",
    findRequest: "browser:find-request",
    findStop: "browser:find-stop",
    closeFindWindow: "browser:close-find-window",
    findTargetChanged: "browser:find-target-changed",
    findResultChanged: "browser:find-result-changed",
  },
  update: {
    getStatus: "update:get-status",
    check: "update:check",
    install: "update:install",
    status: "update:status",
  },
} as const;

export interface BrowserOpenNewTabPayload {
  sourceSurfaceId: string;
  url: string;
  background: boolean;
}

const BROWSER_COMMANDS = [
  "goBack",
  "goForward",
  "reload",
  "stop",
  "focus",
] as const;
export type BrowserCommand = (typeof BROWSER_COMMANDS)[number];
const BROWSER_COMMAND_SET: ReadonlySet<string> = new Set(BROWSER_COMMANDS);

export function isBrowserCommand(x: unknown): x is BrowserCommand {
  return typeof x === "string" && BROWSER_COMMAND_SET.has(x);
}

export interface BrowserFindOptions {
  text: string;
  forward: boolean;
  matchCase: boolean;
  findNext: boolean;
}

export interface BrowserFindResult {
  activeMatchOrdinal: number;
  matches: number;
  finalUpdate: boolean;
}

export const ptyDataChannel = (ptyId: string) => `pty:data:${ptyId}`;
export const ptyExitChannel = (ptyId: string) => `pty:exit:${ptyId}`;
export const ptyCwdChannel = (ptyId: string) => `pty:cwd:${ptyId}`;
export const browserStateChannel = (surfaceId: string) =>
  `browser:state:${surfaceId}`;
