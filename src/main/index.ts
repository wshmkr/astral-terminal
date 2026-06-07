import path from "node:path";
import { app, BrowserWindow, dialog, session } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { APP_ID, DEV_SUFFIX } from "../shared/meta";
import { DEFAULT_BROWSER_SETTINGS } from "../shared/settings-types";
import { type AppConfig, browserStateChannel, IPC } from "../shared/types";
import { checkForUpdatesOnStartup, initAutoUpdater } from "./auto-update";
import {
  destroyBrowserFindWindow,
  hideBrowserFindWindow,
  initBrowserFindWindow,
  openBrowserFindWindow,
  sendBrowserFindResult,
  updateBrowserFindAnchor,
} from "./browser-find-window";
import { BrowserManager } from "./browser-manager";
import { registerActiveRefIpc } from "./cli/active-ref";
import { registerAppIdentify } from "./cli/methods/app-identify";
import { getCliServer } from "./cli/server";
import { loadConfig } from "./config";
import { IS_DEV } from "./env";
import {
  applyTerminalThemeNative,
  registerAgentHookIpc,
  registerBrowserIpc,
  registerNotificationIpc,
  registerPtyIpc,
  registerSettingsIpc,
  registerSettingsWindowIpc,
  registerUpdateIpc,
  registerUsageIpc,
  registerWindowIpc,
} from "./ipc";
import { installAppMenu } from "./menu";
import {
  destroyNotificationWindow,
  initNotificationWindow,
} from "./notification-window";
import type { PtyManager } from "./pty-manager";
import { loadSettings } from "./settings-store";
import {
  destroySettingsWindow,
  initSettingsWindow,
  onSettingsVisibilityChange,
} from "./settings-window";
import { initUsageMonitor } from "./usage/monitor";
import {
  createWindow,
  focusMainWindow,
  getMainWindow,
  onMainWindowFocus,
} from "./window";

if (IS_DEV) {
  const devName = `${app.getName()}${DEV_SUFFIX}`;
  app.setName(devName);
  app.setPath("userData", path.join(app.getPath("appData"), devName));
  app.setAppUserModelId(`${APP_ID}.dev`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

app.on("second-instance", () => {
  const win = getMainWindow();
  if (win) {
    if (win.isMinimized()) win.restore();
    focusMainWindow(win);
  }
});

if (squirrelStartup) {
  app.quit();
}

let ptyManager: PtyManager | null = null;
let ptyManagerPromise: Promise<PtyManager> | null = null;
let browserManager: BrowserManager | null = null;
let cleanupUsageMonitor: (() => void) | null = null;

function getPtyManager(): Promise<PtyManager> {
  ptyManagerPromise ??= (async () => {
    const { PtyManager } = await import("./pty-manager");
    ptyManager = new PtyManager(
      path.join(app.getPath("userData"), "terminal-buffers"),
    );
    return ptyManager;
  })();
  return ptyManagerPromise;
}

let cachedConfig: AppConfig | null = null;
function getConfig(): AppConfig {
  if (!cachedConfig) cachedConfig = loadConfig();
  return cachedConfig;
}

function installCsp() {
  const csp = IS_DEV
    ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss: http://localhost:* http://127.0.0.1:*;"
    : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';";

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
}

const startup = app.whenReady().then(() => {
  installAppMenu();
  installCsp();
  applyTerminalThemeNative(loadSettings()?.appearance?.terminalThemeId);
  registerPtyIpc({ getPtyManager, getConfig, getMainWindow });
  registerWindowIpc({ getMainWindow });
  registerNotificationIpc({ getMainWindow });
  registerSettingsIpc({ getBrowserManager: () => browserManager });
  registerSettingsWindowIpc({ getMainWindow });
  registerAgentHookIpc();
  registerUpdateIpc();
  registerUsageIpc();
  registerActiveRefIpc();
  const cliServer = getCliServer();
  registerAppIdentify(cliServer);
  cliServer.start().catch((err) => {
    console.error("[cli] listen failed", err);
  });
  initAutoUpdater(getMainWindow);
  createWindow();
  checkForUpdatesOnStartup();

  const win = getMainWindow();
  if (win) {
    initNotificationWindow(win);
    cleanupUsageMonitor = initUsageMonitor(getMainWindow, onMainWindowFocus);
    initSettingsWindow(win);
    initBrowserFindWindow(win);
    browserManager = new BrowserManager(win, {
      onState: (surfaceId, state) => {
        getMainWindow()?.webContents.send(
          browserStateChannel(surfaceId),
          state,
        );
      },
      onOpenNewTab: (payload) => {
        getMainWindow()?.webContents.send(IPC.browser.openNewTab, payload);
      },
      onFindRequested: (surfaceId, anchor) => {
        const parent = getMainWindow();
        if (parent) openBrowserFindWindow(parent, anchor, surfaceId);
      },
      onFindResult: (surfaceId, result) => {
        sendBrowserFindResult(surfaceId, result);
      },
      onFocusAddressBar: (surfaceId) => {
        const win = getMainWindow();
        win?.webContents.focus();
        win?.webContents.send(IPC.browser.focusAddressBar, {
          surfaceId,
        });
      },
      onRunGlobalCommand: (command) => {
        getMainWindow()?.webContents.send(IPC.keymap.runCommand, { command });
      },
      onSurfaceHidden: (surfaceId) => {
        hideBrowserFindWindow(surfaceId);
      },
      onSurfaceAnchorChanged: (surfaceId, anchor) => {
        updateBrowserFindAnchor(surfaceId, anchor);
      },
    });
    browserManager.setBrowserSettings({
      ...DEFAULT_BROWSER_SETTINGS,
      ...loadSettings()?.browserSettings,
    });
    registerBrowserIpc({ browserManager });
    onSettingsVisibilityChange((visible) => {
      browserManager?.setDimmed(visible);
    });
  }
});

startup.catch((error) => {
  console.error("Failed to initialize Electron main process", error);
  dialog.showErrorBox(
    "Astral Terminal failed to start",
    error instanceof Error ? (error.stack ?? error.message) : String(error),
  );
  app.quit();
});

app.on("before-quit", () => {
  cleanupUsageMonitor?.();
  void getCliServer().close();
  ptyManager?.saveAndKillAll();
  browserManager?.destroyAll();
  destroyNotificationWindow();
  destroySettingsWindow();
  destroyBrowserFindWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
