import type { BrowserWindow } from "electron";
import { ipcMain, Notification, nativeTheme } from "electron";
import { TERMINAL_THEMES } from "../renderer/theme/terminal-themes";
import {
  type AgentHookStatus,
  type AgentName,
  agentProviders,
} from "../shared/agent-hooks";
import { isValidSurfaceId } from "../shared/surface-id";
import {
  type AppConfig,
  type BrowserAnchorOffsets,
  type BrowserCommand,
  type BrowserFindOptions,
  IPC,
  isBrowserCommand,
  type NotificationFirePayload,
  type NotificationPanelAction,
  type NotificationPanelItem,
  type PersistedSettings,
  ptyCwdChannel,
  ptyDataChannel,
  ptyExitChannel,
  type ScreenRect,
  type SettingsAction,
  type SettingsState,
  type TerminalThemeId,
} from "../shared/types";
import {
  configureAgentHooks,
  getAgentHookStatus,
  uninstallAgentHooks,
} from "./agent-hooks/installer";
import {
  hideBrowserFindWindow,
  resizeBrowserFindWindow,
} from "./browser-find-window";
import type { BrowserManager } from "./browser-manager";
import { openInSystemBrowser, showLinkContextMenu } from "./external-links";
import {
  hideNotificationPanel,
  openNotificationPanel,
  setNotificationPanelItems,
} from "./notification-window";
import type { PtyManager } from "./pty-manager";
import { loadSettings, saveSettings } from "./settings-store";
import {
  applySettingsUiScale,
  hideSettingsWindow,
  openSettingsWindow,
  setSettingsState,
} from "./settings-window";
import { focusMainWindow } from "./window";
import { listWslDistros } from "./wsl-distros";

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
        wslDistro?: string | null;
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
        wslDistro: options.wslDistro,
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

  ipcMain.handle(IPC.wsl.listDistros, () => listWslDistros());
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

  ipcMain.on(IPC.shell.openExternal, (_event, msg: { url: string }) => {
    if (typeof msg?.url === "string") openInSystemBrowser(msg.url);
  });

  ipcMain.on(
    IPC.shell.showLinkMenu,
    (_event, msg: { url: string; sourceSurfaceId: string }) => {
      const win = getMainWindow();
      if (!win) return;
      if (
        typeof msg?.url !== "string" ||
        !isValidSurfaceId(msg.sourceSurfaceId)
      ) {
        return;
      }
      showLinkContextMenu(win, {
        url: msg.url,
        sourceSurfaceId: msg.sourceSurfaceId,
      });
    },
  );
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

  ipcMain.on(
    IPC.notification.openPanel,
    (_event, msg: { anchor: ScreenRect }) => {
      const win = getMainWindow();
      if (!win) return;
      openNotificationPanel(win, msg.anchor);
    },
  );

  ipcMain.on(
    IPC.notification.setPanelItems,
    (_event, msg: { items: NotificationPanelItem[] }) => {
      setNotificationPanelItems(msg.items);
    },
  );

  ipcMain.on(IPC.notification.closePanel, () => {
    hideNotificationPanel();
  });

  ipcMain.on(
    IPC.notification.panelAction,
    (_event, action: NotificationPanelAction) => {
      getMainWindow()?.webContents.send(IPC.notification.panelAction, action);
    },
  );
}

export function applyTerminalThemeNative(
  id: TerminalThemeId | undefined,
): void {
  const theme = id ? TERMINAL_THEMES[id] : undefined;
  nativeTheme.themeSource = theme?.colorScheme ?? "dark";
}

export function registerSettingsIpc(): void {
  ipcMain.handle(IPC.settings.read, () => loadSettings());
  ipcMain.handle(
    IPC.settings.write,
    async (_event, settings: PersistedSettings) => {
      await saveSettings(settings);
      applyTerminalThemeNative(settings.appearance?.terminalThemeId);
    },
  );
}

export function registerSettingsWindowIpc({ getMainWindow }: WindowDeps): void {
  function dispatchToMainRenderer(action: SettingsAction): void {
    getMainWindow()?.webContents.send(IPC.settings.actionApply, action);
  }

  ipcMain.on(IPC.settings.open, async () => {
    const win = getMainWindow();
    if (!win) return;
    openSettingsWindow(win);
    const statuses = await Promise.all(
      agentProviders.map(async (p) => ({
        name: p.name,
        status: await getAgentHookStatus(p.name),
      })),
    );
    for (const { name, status } of statuses) {
      dispatchToMainRenderer({
        kind: "setAgentHookStatus",
        args: [name, status],
      });
    }
  });

  ipcMain.on(IPC.settings.close, () => {
    hideSettingsWindow();
  });

  ipcMain.on(IPC.settings.statePublish, (_event, state: SettingsState) => {
    setSettingsState(state);
  });

  ipcMain.on(IPC.settings.action, (_event, action: SettingsAction) => {
    const win = getMainWindow();
    if (!win) return;
    dispatchToMainRenderer(action);
    if (action.kind === "setUiScale") applySettingsUiScale(win, action.args[0]);
  });

  ipcMain.handle(
    IPC.settings.invokeAgentHook,
    async (
      _event,
      { providerName, enabled }: { providerName: string; enabled: boolean },
    ) => {
      const result = enabled
        ? await configureAgentHooks(providerName)
        : await uninstallAgentHooks(providerName);
      if (result.status !== "error") {
        dispatchToMainRenderer({
          kind: "setAgentHookStatus",
          args: [providerName as AgentName, enabled ? "installed" : "missing"],
        });
      }
      return result;
    },
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
    (_event, msg: { surfaceId: string; url: string }) => {
      browserManager.create(ensureSurfaceId(msg.surfaceId), msg.url);
    },
  );

  ipcMain.on(IPC.browser.destroy, (_event, msg: { surfaceId: string }) => {
    browserManager.destroy(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(
    IPC.browser.setAnchorOffsets,
    (_event, msg: { surfaceId: string; offsets: BrowserAnchorOffsets }) => {
      browserManager.setAnchorOffsets(
        ensureSurfaceId(msg.surfaceId),
        msg.offsets,
      );
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

  ipcMain.on(
    IPC.browser.command,
    (_event, msg: { surfaceId: string; cmd: BrowserCommand }) => {
      if (!isBrowserCommand(msg.cmd)) return;
      browserManager[msg.cmd](ensureSurfaceId(msg.surfaceId));
    },
  );

  ipcMain.on(
    IPC.browser.findRequest,
    (_event, msg: { surfaceId: string; opts: BrowserFindOptions }) => {
      browserManager.findInPage(ensureSurfaceId(msg.surfaceId), msg.opts);
    },
  );

  ipcMain.on(IPC.browser.findStop, (_event, msg: { surfaceId: string }) => {
    browserManager.stopFindInPage(ensureSurfaceId(msg.surfaceId));
  });

  ipcMain.on(IPC.browser.closeFindWindow, () => {
    const previousSurfaceId = hideBrowserFindWindow();
    if (previousSurfaceId) browserManager.focus(previousSurfaceId);
  });

  ipcMain.on(
    IPC.browser.resizeFindWindow,
    (_event, msg: { width: number; height: number }) => {
      resizeBrowserFindWindow(msg.width, msg.height);
    },
  );
}
