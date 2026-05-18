import { contextBridge, ipcRenderer, webFrame, webUtils } from "electron";
import type {
  BrowserAnchorOffsets,
  BrowserCommand,
  BrowserFindOptions,
  BrowserFindResult,
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
} from "../shared/types";
import {
  browserStateChannel,
  decodeAppModeArg,
  IPC,
  ptyCwdChannel,
  ptyDataChannel,
  ptyExitChannel,
} from "../shared/types";

const mode = decodeAppModeArg(process.argv);

let prefetchedSettings: Promise<PersistedSettings | null> | null =
  ipcRenderer.invoke(IPC.settings.read);

function subscribe<Args extends unknown[]>(
  channel: string,
  callback: (...args: Args) => void,
): () => void {
  const listener = (_event: Electron.IpcRendererEvent, ...args: Args) =>
    callback(...args);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("app", {
  mode,

  readConfig: () => ipcRenderer.invoke(IPC.config.read),

  readSettings: (): Promise<PersistedSettings | null> => {
    const p = prefetchedSettings ?? ipcRenderer.invoke(IPC.settings.read);
    prefetchedSettings = null;
    return p;
  },
  writeSettings: (settings: PersistedSettings): Promise<void> =>
    ipcRenderer.invoke(IPC.settings.write, settings),

  createPty: (options: {
    cwd?: string;
    surfaceId: string;
    cols?: number;
    rows?: number;
    wslDistro?: string | null;
  }) => ipcRenderer.invoke(IPC.pty.create, options),
  listWslDistros: () => ipcRenderer.invoke(IPC.wsl.listDistros),
  writePty: (ptyId: string, data: string) =>
    ipcRenderer.send(IPC.pty.write, { ptyId, data }),
  resizePty: (ptyId: string, cols: number, rows: number) =>
    ipcRenderer.send(IPC.pty.resize, { ptyId, cols, rows }),
  killPty: (ptyId: string) => ipcRenderer.send(IPC.pty.kill, { ptyId }),
  replayPty: (
    ptyId: string,
  ): Promise<{ cols: number; rows: number; content: string }> =>
    ipcRenderer.invoke(IPC.pty.replay, { ptyId }),
  pruneTerminalBuffers: (surfaceIds: string[]): Promise<void> =>
    ipcRenderer.invoke(IPC.pty.pruneBuffers, { surfaceIds }),
  onPtyData: (ptyId: string, callback: (data: string) => void) =>
    subscribe<[string]>(ptyDataChannel(ptyId), callback),
  onPtyExit: (
    ptyId: string,
    callback: (exitCode: number, signal?: number) => void,
  ) => subscribe<[number, number | undefined]>(ptyExitChannel(ptyId), callback),
  onPtyCwd: (ptyId: string, callback: (cwd: string) => void) =>
    subscribe<[string]>(ptyCwdChannel(ptyId), callback),

  getPathForFile: (file: File): string => webUtils.getPathForFile(file),

  setUiZoom: (factor: number) => webFrame.setZoomFactor(factor),

  openExternal: (url: string) =>
    ipcRenderer.send(IPC.shell.openExternal, { url }),
  showLinkMenu: (payload: { url: string; sourceSurfaceId: string }) =>
    ipcRenderer.send(IPC.shell.showLinkMenu, payload),

  windowMinimize: () => ipcRenderer.send(IPC.window.minimize),
  windowMaximize: () => ipcRenderer.send(IPC.window.maximize),
  windowClose: () => ipcRenderer.send(IPC.window.close),
  onWindowMaximizedChange: (callback: (maximized: boolean) => void) =>
    subscribe<[boolean]>(IPC.window.maximizedChanged, callback),
  onWindowFocusChange: (callback: (focused: boolean) => void) =>
    subscribe<[boolean]>(IPC.window.focusChanged, callback),

  fireNotification: (payload: NotificationFirePayload) =>
    ipcRenderer.send(IPC.notification.fire, payload),
  onNotificationClick: (
    callback: (data: {
      workspaceId: string;
      paneId: string;
      surfaceId: string;
    }) => void,
  ) =>
    subscribe<[{ workspaceId: string; paneId: string; surfaceId: string }]>(
      IPC.notification.click,
      callback,
    ),

  openNotificationPanel: (anchor: ScreenRect) =>
    ipcRenderer.send(IPC.notification.openPanel, { anchor }),
  setNotificationPanelItems: (items: NotificationPanelItem[]) =>
    ipcRenderer.send(IPC.notification.setPanelItems, { items }),
  closeNotificationPanel: () => ipcRenderer.send(IPC.notification.closePanel),
  onNotificationPanelClosed: (callback: () => void) =>
    subscribe<[]>(IPC.notification.panelClosed, callback),
  onNotificationPanelItems: (
    callback: (items: NotificationPanelItem[]) => void,
  ) =>
    subscribe<[NotificationPanelItem[]]>(
      IPC.notification.panelItemsChanged,
      callback,
    ),
  sendNotificationPanelAction: (action: NotificationPanelAction) =>
    ipcRenderer.send(IPC.notification.panelAction, action),
  onNotificationPanelAction: (
    callback: (action: NotificationPanelAction) => void,
  ) =>
    subscribe<[NotificationPanelAction]>(
      IPC.notification.panelAction,
      callback,
    ),

  openSettingsWindow: () => ipcRenderer.send(IPC.settings.open),
  closeSettingsWindow: () => ipcRenderer.send(IPC.settings.close),
  onSettingsStateChanged: (callback: (state: SettingsState) => void) =>
    subscribe<[SettingsState]>(IPC.settings.stateChanged, callback),
  sendSettingsAction: (action: SettingsAction) =>
    ipcRenderer.send(IPC.settings.action, action),
  onSettingsActionApply: (callback: (action: SettingsAction) => void) =>
    subscribe<[SettingsAction]>(IPC.settings.actionApply, callback),
  publishSettingsState: (state: SettingsState) =>
    ipcRenderer.send(IPC.settings.statePublish, state),
  onSettingsFade: (callback: (visible: boolean) => void) =>
    subscribe<[boolean]>(IPC.settings.fade, callback),
  invokeSettingsAgentHook: (params: {
    providerName: string;
    enabled: boolean;
  }): Promise<ConfigureAgentHooksResult | UninstallAgentHooksResult> =>
    ipcRenderer.invoke(IPC.settings.invokeAgentHook, params),

  configureAgentHooks: (params: { providerName: string }) =>
    ipcRenderer.invoke(IPC.agentHooks.configure, params),
  uninstallAgentHooks: (params: { providerName: string }) =>
    ipcRenderer.invoke(IPC.agentHooks.uninstall, params),
  getAgentHookStatuses: () => ipcRenderer.invoke(IPC.agentHooks.status),

  createBrowser: (surfaceId: string, url: string) =>
    ipcRenderer.send(IPC.browser.create, { surfaceId, url }),
  destroyBrowser: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.destroy, { surfaceId }),
  setBrowserAnchorOffsets: (surfaceId: string, offsets: BrowserAnchorOffsets) =>
    ipcRenderer.send(IPC.browser.setAnchorOffsets, { surfaceId, offsets }),
  setBrowserVisible: (surfaceId: string, visible: boolean) =>
    ipcRenderer.send(IPC.browser.setVisible, { surfaceId, visible }),
  loadBrowserURL: (surfaceId: string, url: string) =>
    ipcRenderer.send(IPC.browser.loadURL, { surfaceId, url }),
  browserCommand: (surfaceId: string, cmd: BrowserCommand) =>
    ipcRenderer.send(IPC.browser.command, { surfaceId, cmd }),
  onBrowserState: (
    surfaceId: string,
    callback: (state: BrowserState) => void,
  ) => subscribe<[BrowserState]>(browserStateChannel(surfaceId), callback),
  onBrowserOpenNewTab: (
    callback: (payload: BrowserOpenNewTabPayload) => void,
  ) => subscribe<[BrowserOpenNewTabPayload]>(IPC.browser.openNewTab, callback),
  browserFindRequest: (surfaceId: string, opts: BrowserFindOptions) =>
    ipcRenderer.send(IPC.browser.findRequest, { surfaceId, opts }),
  browserFindStop: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.findStop, { surfaceId }),
  closeBrowserFindWindow: () => ipcRenderer.send(IPC.browser.closeFindWindow),
  resizeBrowserFindWindow: (width: number, height: number) =>
    ipcRenderer.send(IPC.browser.resizeFindWindow, { width, height }),
  onBrowserFindTargetChanged: (
    callback: (payload: { surfaceId: string }) => void,
  ) =>
    subscribe<[{ surfaceId: string }]>(IPC.browser.findTargetChanged, callback),
  onBrowserFindResult: (callback: (result: BrowserFindResult) => void) =>
    subscribe<[BrowserFindResult]>(IPC.browser.findResultChanged, callback),
});
