import type { BrowserWindow } from "electron";
import { ipcMain, Notification } from "electron";
import {
  type AgentHookStatus,
  type AgentName,
  agentProviders,
} from "../shared/agent-hooks";
import { isValidSurfaceId } from "../shared/surface-id";
import {
  type AppConfig,
  type BrowserBounds,
  IPC,
  type NotificationFirePayload,
  type PersistedSettings,
  ptyCwdChannel,
  ptyDataChannel,
  ptyExitChannel,
} from "../shared/types";
import {
  configureAgentHooks,
  getAgentHookStatus,
  uninstallAgentHooks,
} from "./agent-hooks/installer";
import type { BrowserManager } from "./browser-manager";
import type { PtyManager } from "./pty-manager";
import { loadSettings, saveSettings } from "./settings-store";
import { focusMainWindow } from "./window";

interface PtyDeps {
  getPtyManager: () => Promise<PtyManager>;
  getConfig: () => AppConfig;
  getMainWindow: () => BrowserWindow | null;
}

export function registerPtyIpc({
  getPtyManager,
  getConfig,
  getMainWindow,
}: PtyDeps): void {
  ipcMain.handle(IPC.config.read, () => getConfig());

  ipcMain.handle(
    IPC.pty.create,
    async (
      _event,
      options: {
        cwd?: string;
        surfaceId: string;
        cols?: number;
        rows?: number;
      },
    ) => {
      if (!isValidSurfaceId(options.surfaceId)) {
        throw new Error("createPty: invalid surfaceId");
      }
      const manager = await getPtyManager();
      return manager.create({
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
          onAgentCwd: (cwd) => {
            getMainWindow()?.webContents.send(ptyCwdChannel(ptyId), cwd);
          },
        }),
      });
    },
  );

  ipcMain.handle(IPC.pty.replay, async (_event, msg: { ptyId: string }) => {
    const manager = await getPtyManager();
    return manager.beginReplay(msg.ptyId);
  });

  ipcMain.handle(
    IPC.pty.pruneBuffers,
    async (_event, msg: { surfaceIds: string[] }) => {
      const valid = new Set<string>();
      for (const id of msg.surfaceIds) {
        if (isValidSurfaceId(id)) valid.add(id);
      }
      const manager = await getPtyManager();
      await manager.pruneBuffers(valid);
    },
  );

  ipcMain.on(IPC.pty.write, (_event, msg: { ptyId: string; data: string }) => {
    getPtyManager().then((m) => {
      m.write(msg.ptyId, msg.data);
    });
  });

  ipcMain.on(
    IPC.pty.resize,
    (_event, msg: { ptyId: string; cols: number; rows: number }) => {
      getPtyManager().then((m) => {
        m.resize(msg.ptyId, msg.cols, msg.rows);
      });
    },
  );

  ipcMain.on(IPC.pty.kill, (_event, msg: { ptyId: string }) => {
    getPtyManager().then((m) => {
      m.kill(msg.ptyId);
    });
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

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC.settings.read, () => loadSettings());
  ipcMain.handle(IPC.settings.write, (_event, settings: PersistedSettings) =>
    saveSettings(settings),
  );
}

export function registerAgentHookIpc(): void {
  ipcMain.handle(
    IPC.agentHooks.configure,
    (_event, { providerName }: { providerName: string }) =>
      configureAgentHooks(providerName),
  );

  ipcMain.handle(
    IPC.agentHooks.uninstall,
    (_event, { providerName }: { providerName: string }) =>
      uninstallAgentHooks(providerName),
  );

  ipcMain.handle(IPC.agentHooks.status, async () => {
    const entries = await Promise.all(
      agentProviders.map(
        async (p) =>
          [p.name, await getAgentHookStatus(p.name)] as [
            AgentName,
            AgentHookStatus,
          ],
      ),
    );
    return Object.fromEntries(entries) as Partial<
      Record<AgentName, AgentHookStatus>
    >;
  });
}

interface BrowserDeps {
  browserManager: BrowserManager;
}

function ensureSurfaceId(value: unknown): string {
  if (!isValidSurfaceId(value)) {
    throw new Error("browser ipc: invalid surfaceId");
  }
  return value;
}

export function registerBrowserIpc({ browserManager }: BrowserDeps): void {
  ipcMain.on(
    IPC.browser.create,
    (_event, msg: { surfaceId: string; initialUrl: string }) => {
      browserManager.create(
        ensureSurfaceId(msg.surfaceId),
        msg.initialUrl ?? "about:blank",
      );
    },
  );

  ipcMain.on(IPC.browser.destroy, (_event, msg: { surfaceId: string }) => {
    browserManager.destroy(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(
    IPC.browser.setBounds,
    (_event, msg: { surfaceId: string; bounds: BrowserBounds }) => {
      browserManager.setBounds(ensureSurfaceId(msg.surfaceId), msg.bounds);
    },
  );

  ipcMain.on(
    IPC.browser.setVisible,
    (_event, msg: { surfaceId: string; visible: boolean }) => {
      browserManager.setVisible(ensureSurfaceId(msg.surfaceId), msg.visible);
    },
  );

  ipcMain.on(
    IPC.browser.loadURL,
    (_event, msg: { surfaceId: string; url: string }) => {
      browserManager.loadURL(ensureSurfaceId(msg.surfaceId), msg.url);
    },
  );

  ipcMain.on(IPC.browser.goBack, (_event, msg: { surfaceId: string }) => {
    browserManager.goBack(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(IPC.browser.goForward, (_event, msg: { surfaceId: string }) => {
    browserManager.goForward(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(IPC.browser.reload, (_event, msg: { surfaceId: string }) => {
    browserManager.reload(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(IPC.browser.stop, (_event, msg: { surfaceId: string }) => {
    browserManager.stop(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(IPC.browser.focus, (_event, msg: { surfaceId: string }) => {
    browserManager.focus(ensureSurfaceId(msg.surfaceId));
  });
}
