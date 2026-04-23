import path from "node:path";
import { app, BrowserWindow, session } from "electron";
import squirrelStartup from "electron-squirrel-startup";
import type { AppConfig } from "../shared/types";
import { loadConfig } from "./config";
import {
  registerAgentHookIpc,
  registerNotificationIpc,
  registerPtyIpc,
  registerWindowIpc,
} from "./ipc";
import { PtyManager } from "./pty-manager";
import { createWindow, focusMainWindow, getMainWindow } from "./window";

if (!app.isPackaged) {
  const devName = `${app.getName()} (dev)`;
  app.setName(devName);
  app.setPath("userData", path.join(app.getPath("appData"), devName));
  app.setAppUserModelId("net.wshmkr.terminal.dev");
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

let ptyManager: PtyManager;

let cachedConfig: AppConfig | null = null;
function getConfig(): AppConfig {
  if (!cachedConfig) cachedConfig = loadConfig();
  return cachedConfig;
}

function installCsp() {
  const csp = !app.isPackaged
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

app.whenReady().then(() => {
  installCsp();
  ptyManager = new PtyManager(
    path.join(app.getPath("userData"), "terminal-buffers"),
  );
  registerPtyIpc({ ptyManager, getConfig, getMainWindow });
  registerWindowIpc({ getMainWindow });
  registerNotificationIpc({ getMainWindow });
  registerAgentHookIpc();
  createWindow();
});

app.on("before-quit", () => {
  ptyManager?.saveAndKillAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
