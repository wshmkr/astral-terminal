import type { BrowserWindow } from "electron";
import { ipcMain, Notification } from "electron";
import {
  type AppConfig,
  IPC,
  type NotificationFirePayload,
  ptyDataChannel,
  ptyExitChannel,
} from "../shared/types";
import { configureAgentHooks, detectAgentHooks } from "./agent-hook-installer";
import { PtyManager } from "./pty-manager";
import { focusMainWindow } from "./window";

interface PtyDeps {
  ptyManager: PtyManager;
  getConfig: () => AppConfig;
  getMainWindow: () => BrowserWindow | null;
}

export function registerPtyIpc({
  ptyManager,
  getConfig,
  getMainWindow,
}: PtyDeps): void {
  ipcMain.handle(IPC.config.read, () => getConfig());

  ipcMain.handle(
    IPC.pty.create,
    (
      _event,
      options: {
        cwd?: string;
        surfaceId: string;
        cols?: number;
        rows?: number;
      },
    ) => {
      if (!PtyManager.isValidSurfaceId(options.surfaceId)) {
        throw new Error("createPty: invalid surfaceId");
      }
      return ptyManager.create({
        surfaceId: options.surfaceId,
        cwd: options.cwd,
        cols: options.cols,
        rows: options.rows,
        config: getConfig(),
        callbacks: (ptyId) => ({
          onData: (data) => {
            getMainWindow()?.webContents.send(ptyDataChannel(ptyId), data);
          },
          onExit: (exitCode, signal) => {
            getMainWindow()?.webContents.send(
              ptyExitChannel(ptyId),
              exitCode,
              signal,
            );
          },
        }),
      });
    },
  );

  ipcMain.handle(IPC.pty.replay, (_event, msg: { ptyId: string }) => {
    return ptyManager.beginReplay(msg.ptyId);
  });

  ipcMain.handle(
    IPC.pty.pruneBuffers,
    (_event, msg: { surfaceIds: string[] }) => {
      const valid = new Set<string>();
      for (const id of msg.surfaceIds) {
        if (PtyManager.isValidSurfaceId(id)) valid.add(id);
      }
      ptyManager.pruneBuffers(valid);
    },
  );

  ipcMain.on(IPC.pty.write, (_event, msg: { ptyId: string; data: string }) => {
    ptyManager.write(msg.ptyId, msg.data);
  });

  ipcMain.on(
    IPC.pty.resize,
    (_event, msg: { ptyId: string; cols: number; rows: number }) => {
      ptyManager.resize(msg.ptyId, msg.cols, msg.rows);
    },
  );

  ipcMain.on(IPC.pty.kill, (_event, msg: { ptyId: string }) => {
    ptyManager.kill(msg.ptyId);
  });
}

interface WindowDeps {
  getMainWindow: () => BrowserWindow | null;
}

export function registerWindowIpc({ getMainWindow }: WindowDeps): void {
  ipcMain.on(IPC.window.minimize, () => {
    getMainWindow()?.minimize();
  });

  ipcMain.on(IPC.window.maximize, () => {
    const win = getMainWindow();
    if (!win) return;
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  });

  ipcMain.on(IPC.window.close, () => {
    getMainWindow()?.close();
  });
}

export function registerNotificationIpc({ getMainWindow }: WindowDeps): void {
  ipcMain.on(IPC.notification.fire, (_event, msg: NotificationFirePayload) => {
    if (!Notification.isSupported()) return;

    const notif = new Notification({ title: msg.title, body: msg.body ?? "" });
    notif.on("click", () => {
      const win = getMainWindow();
      if (win) focusMainWindow(win);
      win?.webContents.send(IPC.notification.click, {
        workspaceId: msg.workspaceId,
        paneId: msg.paneId,
        surfaceId: msg.surfaceId,
      });
    });
    notif.show();
  });
}

export function registerAgentHookIpc(): void {
  ipcMain.handle(
    IPC.agentHooks.detect,
    (_event, { providerName }: { providerName: string }) =>
      detectAgentHooks(providerName),
  );

  ipcMain.handle(
    IPC.agentHooks.configure,
    (_event, { providerName }: { providerName: string }) =>
      configureAgentHooks(providerName),
  );
}
