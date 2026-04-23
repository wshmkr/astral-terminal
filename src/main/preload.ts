import { contextBridge, ipcRenderer } from "electron";
import type { NotificationFirePayload } from "../shared/types";
import {
  decodeAppModeArg,
  IPC,
  ptyDataChannel,
  ptyExitChannel,
} from "../shared/types";

const mode = decodeAppModeArg(process.argv);

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
  replayPty: (ptyId: string): Promise<string> =>
    ipcRenderer.invoke(IPC.pty.replay, { ptyId }),
  pruneTerminalBuffers: (surfaceIds: string[]): Promise<void> =>
    ipcRenderer.invoke(IPC.pty.pruneBuffers, { surfaceIds }),
  onPtyData: (ptyId: string, callback: (data: string) => void) =>
    subscribe<[string]>(ptyDataChannel(ptyId), callback),
  onPtyExit: (
    ptyId: string,
    callback: (exitCode: number, signal?: number) => void,
  ) => subscribe<[number, number | undefined]>(ptyExitChannel(ptyId), callback),

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

  detectAgentHooks: (params: { providerName: string }) =>
    ipcRenderer.invoke(IPC.agentHooks.detect, params) as Promise<boolean>,
  configureAgentHooks: (params: { providerName: string }) =>
    ipcRenderer.invoke(IPC.agentHooks.configure, params),
});
