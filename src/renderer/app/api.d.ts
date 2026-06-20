import type { AgentHookStatus, AgentName } from "../../shared/agent-hooks";
import type { CommandId } from "../../shared/keybindings/types";
import type { PersistedSettings } from "../../shared/settings-types";
import type {
  ActiveRef,
  AppConfig,
  AppMode,
  BrowserAnchorOffsets,
  BrowserCommand,
  BrowserFindOptions,
  BrowserFindResult,
  BrowserOpenNewTabPayload,
  BrowserState,
  ConfigureAgentHooksResult,
  NotificationFirePayload,
  NotificationPanelAction,
  NotificationPanelState,
  PersistedWorkspaces,
  ScreenRect,
  SettingsAction,
  SettingsState,
  UninstallAgentHooksResult,
  UpdateStatus,
  UsageData,
  WslDistro,
} from "../../shared/types";

export interface AppAPI {
  mode: AppMode;
  platform: { isMac: boolean; isWindows: boolean };
  readConfig: () => Promise<AppConfig>;
  readSettings: () => Promise<PersistedSettings | null>;
  writeSettings: (settings: PersistedSettings) => Promise<void>;
  readWorkspaces: () => Promise<PersistedWorkspaces | null>;
  writeWorkspaces: (value: PersistedWorkspaces) => Promise<void>;
  createPty: (options: {
    cwd?: string;
    surfaceId: string;
    cols?: number;
    rows?: number;
    wslDistro?: string | null;
  }) => Promise<string>;
  listWslDistros: () => Promise<WslDistro[]>;
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
  setBrowserSplitPreview: (
    rect: ScreenRect | null,
    fill: string,
    stroke: string,
  ) => void;
  loadBrowserURL: (surfaceId: string, url: string) => void;
  browserCommand: (surfaceId: string, cmd: BrowserCommand) => void;
  onBrowserState: (
    surfaceId: string,
    callback: (state: BrowserState) => void,
  ) => () => void;
  onBrowserOpenNewTab: (
    callback: (payload: BrowserOpenNewTabPayload) => void,
  ) => () => void;
  browserFindRequest: (surfaceId: string, opts: BrowserFindOptions) => void;
  browserFindStop: (surfaceId: string) => void;
  closeBrowserFindWindow: () => void;
  onBrowserFindTargetChanged: (
    callback: (payload: { surfaceId: string }) => void,
  ) => () => void;
  onBrowserFindResult: (
    callback: (result: BrowserFindResult) => void,
  ) => () => void;
  onBrowserFocusAddressBar: (
    callback: (payload: { surfaceId: string }) => void,
  ) => () => void;
  clearBrowsingData: () => Promise<void>;
  onRunCommand: (
    callback: (payload: { command: CommandId }) => void,
  ) => () => void;

  openNotificationPanel: (anchor: ScreenRect) => void;
  closeNotificationPanel: () => void;
  onNotificationPanelOpened: (callback: () => void) => () => void;
  onNotificationPanelClosed: (callback: () => void) => () => void;
  publishNotificationPanelState: (state: NotificationPanelState) => void;
  onNotificationPanelStateChanged: (
    callback: (state: NotificationPanelState) => void,
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
  onSettingsFade: (callback: (visible: boolean) => void) => () => void;
  invokeSettingsAgentHook: (params: {
    providerName: string;
    enabled: boolean;
  }) => Promise<ConfigureAgentHooksResult | UninstallAgentHooksResult>;

  readUpdateStatus: () => Promise<UpdateStatus>;
  requestUpdateCheck: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;

  readUsage: () => Promise<UsageData>;
  onUsage: (callback: (usage: UsageData) => void) => () => void;

  sendCliActiveRef: (ref: ActiveRef) => void;
}

declare global {
  interface Window {
    app: AppAPI;
  }
}
