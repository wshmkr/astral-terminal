import type { AgentHookStatus, AgentName } from "../../shared/agent-hooks";
import type {
  AppConfig,
  AppMode,
  BrowserAnchorOffsets,
  BrowserCommand,
  BrowserOpenNewTabPayload,
  BrowserState,
  ConfigureAgentHooksResult,
  NotificationFirePayload,
  NotificationPanelAction,
  NotificationPanelItem,
  PersistedSettings,
  ScreenRect,
  SettingsAction,
  SettingsState,
  UninstallAgentHooksResult,
} from "../../shared/types";

export interface AppAPI {
  mode: AppMode;
  readConfig: () => Promise<AppConfig>;
  readSettings: () => Promise<PersistedSettings | null>;
  writeSettings: (settings: PersistedSettings) => Promise<void>;
  createPty: (options: {
    cwd?: string;
    surfaceId: string;
    cols?: number;
    rows?: number;
  }) => Promise<string>;
  writePty: (ptyId: string, data: string) => void;
  resizePty: (ptyId: string, cols: number, rows: number) => void;
  killPty: (ptyId: string) => void;
  replayPty: (
    ptyId: string,
  ) => Promise<{ cols: number; rows: number; content: string }>;
  pruneTerminalBuffers: (surfaceIds: string[]) => Promise<void>;
  getPathForFile: (file: File) => string;
  onPtyData: (ptyId: string, callback: (data: string) => void) => () => void;
  onPtyExit: (
    ptyId: string,
    callback: (exitCode: number, signal?: number) => void,
  ) => () => void;
  onPtyCwd: (ptyId: string, callback: (cwd: string) => void) => () => void;
  configureAgentHooks: (params: {
    providerName: string;
  }) => Promise<ConfigureAgentHooksResult>;
  uninstallAgentHooks: (params: {
    providerName: string;
  }) => Promise<UninstallAgentHooksResult>;
  getAgentHookStatuses: () => Promise<
    Partial<Record<AgentName, AgentHookStatus>>
  >;
  fireNotification: (payload: NotificationFirePayload) => void;
  onNotificationClick: (
    callback: (data: {
      workspaceId: string;
      paneId: string;
      surfaceId: string;
    }) => void,
  ) => () => void;
  openExternal: (url: string) => void;
  showLinkMenu: (payload: { url: string; sourceSurfaceId: string }) => void;
  setUiZoom: (factor: number) => void;
  windowMinimize: () => void;
  windowMaximize: () => void;
  windowClose: () => void;
  onWindowMaximizedChange: (
    callback: (maximized: boolean) => void,
  ) => () => void;
  onWindowFocusChange: (callback: (focused: boolean) => void) => () => void;

  createBrowser: (surfaceId: string, url: string) => void;
  destroyBrowser: (surfaceId: string) => void;
  setBrowserAnchorOffsets: (
    surfaceId: string,
    offsets: BrowserAnchorOffsets,
  ) => void;
  setBrowserVisible: (surfaceId: string, visible: boolean) => void;
  loadBrowserURL: (surfaceId: string, url: string) => void;
  browserCommand: (surfaceId: string, cmd: BrowserCommand) => void;
  onBrowserState: (
    surfaceId: string,
    callback: (state: BrowserState) => void,
  ) => () => void;
  onBrowserOpenNewTab: (
    callback: (payload: BrowserOpenNewTabPayload) => void,
  ) => () => void;

  openNotificationPanel: (anchor: ScreenRect) => void;
  setNotificationPanelItems: (items: NotificationPanelItem[]) => void;
  closeNotificationPanel: () => void;
  onNotificationPanelClosed: (callback: () => void) => () => void;
  onNotificationPanelItems: (
    callback: (items: NotificationPanelItem[]) => void,
  ) => () => void;
  sendNotificationPanelAction: (action: NotificationPanelAction) => void;
  onNotificationPanelAction: (
    callback: (action: NotificationPanelAction) => void,
  ) => () => void;

  openSettingsWindow: () => void;
  closeSettingsWindow: () => void;
  onSettingsStateChanged: (
    callback: (state: SettingsState) => void,
  ) => () => void;
  sendSettingsAction: (action: SettingsAction) => void;
  onSettingsActionApply: (
    callback: (action: SettingsAction) => void,
  ) => () => void;
  publishSettingsState: (state: SettingsState) => void;
  invokeSettingsAgentHook: (params: {
    providerName: string;
    enabled: boolean;
  }) => Promise<ConfigureAgentHooksResult | UninstallAgentHooksResult>;
}

declare global {
  interface Window {
    app: AppAPI;
  }
}
