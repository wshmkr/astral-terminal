import path from "node:path";
import { app, BrowserWindow, session } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import { APP_ID, DEV_SUFFIX } from "../shared/meta";
import { type AppConfig, browserStateChannel, IPC } from "../shared/types";
import { checkForUpdatesOnStartup } from "./auto-update";
import { BrowserManager } from "./browser-manager";
import { loadConfig } from "./config";
import { IS_DEV } from "./env";
import {
  applyTerminalThemeNative,
  registerAgentHookIpc,
  registerBrowserIpc,
  registerNotificationIpc,
  registerPtyIpc,
  registerSettingsIpc,
  registerWindowIpc,
} from "./ipc";
import { destroyNotificationWindow } from "./notification-window";
import type { PtyManager } from "./pty-manager";
import { loadSettings } from "./settings-store";
import { createWindow, focusMainWindow, getMainWindow } from "./window";

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

applyTerminalThemeNative(loadSettings()?.appearance?.terminalThemeId);

app.whenReady().then(() => {
  installCsp();
  registerPtyIpc({ getPtyManager, getConfig, getMainWindow });
  registerWindowIpc({ getMainWindow });
  registerNotificationIpc({ getMainWindow });
  registerSettingsIpc();
  registerAgentHookIpc();
  createWindow();
  checkForUpdatesOnStartup();

  const win = getMainWindow();
  if (win) {
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
    });
    registerBrowserIpc({ browserManager });
  }
});

app.on("before-quit", () => {
  ptyManager?.saveAndKillAll();
  browserManager?.destroyAll();
  destroyNotificationWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
