import { contextBridge, ipcRenderer, webFrame, webUtils } from "electron";
import type {
  BrowserBounds,
  BrowserState,
  NotificationFirePayload,
  PersistedSettings,
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
  }) => ipcRenderer.invoke(IPC.pty.create, options),
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

  windowMinimize: () => ipcRenderer.send(IPC.window.minimize),
  windowMaximize: () => ipcRenderer.send(IPC.window.maximize),
  windowClose: () => ipcRenderer.send(IPC.window.close),
  onWindowMaximizedChange: (callback: (maximized: boolean) => void) =>
    subscribe<[boolean]>(IPC.window.maximizedChanged, callback),

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

  configureAgentHooks: (params: { providerName: string }) =>
    ipcRenderer.invoke(IPC.agentHooks.configure, params),
  uninstallAgentHooks: (params: { providerName: string }) =>
    ipcRenderer.invoke(IPC.agentHooks.uninstall, params),
  getAgentHookStatuses: () => ipcRenderer.invoke(IPC.agentHooks.status),

  createBrowserView: (surfaceId: string, initialUrl: string) =>
    ipcRenderer.send(IPC.browser.create, { surfaceId, initialUrl }),
  destroyBrowserView: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.destroy, { surfaceId }),
  setBrowserBounds: (surfaceId: string, bounds: BrowserBounds) =>
    ipcRenderer.send(IPC.browser.setBounds, { surfaceId, bounds }),
  setBrowserVisible: (surfaceId: string, visible: boolean) =>
    ipcRenderer.send(IPC.browser.setVisible, { surfaceId, visible }),
  loadBrowserURL: (surfaceId: string, url: string) =>
    ipcRenderer.send(IPC.browser.loadURL, { surfaceId, url }),
  browserGoBack: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.goBack, { surfaceId }),
  browserGoForward: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.goForward, { surfaceId }),
  browserReload: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.reload, { surfaceId }),
  browserStop: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.stop, { surfaceId }),
  focusBrowser: (surfaceId: string) =>
    ipcRenderer.send(IPC.browser.focus, { surfaceId }),
  onBrowserState: (
    surfaceId: string,
    callback: (state: BrowserState) => void,
  ) => subscribe<[BrowserState]>(browserStateChannel(surfaceId), callback),
});
