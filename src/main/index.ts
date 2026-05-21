import path from "node:path";
import { app, BrowserWindow, session } from "electron";
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
  registerWindowIpc,
} from "./ipc";
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

// Warm up rarely-needed child windows + run the update check after the main
// window paints, so they don't compete with first-frame work
const DEFERRED_STARTUP_DELAY_MS = 2000;

function scheduleDeferredStartup(): void {
  setTimeout(() => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;
    initNotificationWindow(win);
    initSettingsWindow(win);
    checkForUpdatesOnStartup();
  }, DEFERRED_STARTUP_DELAY_MS);
}

app.whenReady().then(() => {
  installCsp();
  applyTerminalThemeNative(loadSettings()?.appearance?.terminalThemeId);
  registerPtyIpc({ getPtyManager, getConfig, getMainWindow });
  registerWindowIpc({ getMainWindow });
  registerNotificationIpc({ getMainWindow });
  registerSettingsIpc({ getBrowserManager: () => browserManager });
  registerSettingsWindowIpc({ getMainWindow });
  registerAgentHookIpc();
  registerUpdateIpc();
  initAutoUpdater(getMainWindow);
  createWindow(scheduleDeferredStartup);

  const win = getMainWindow();
  if (win) {
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

app.on("before-quit", () => {
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow(scheduleDeferredStartup);
  }
});
