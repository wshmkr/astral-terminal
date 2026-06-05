import path from "node:path";
import { app, BrowserWindow } from "electron";
import { APP_NAME, DEV_SUFFIX } from "../shared/meta";
import { encodeAppModeArg, INITIAL_WINDOW_BG, IPC } from "../shared/types";
import { APP_MODE, IS_DEV } from "./env";
import {
  attachExternalLinkHandler,
  openInSystemBrowser,
} from "./external-links";
import {
  loadWindowState,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
  trackWindowState,
} from "./window-state";

const DEV_URL = IS_DEV ? process.env.VITE_DEV_SERVER_URL : undefined;
const WINDOW_TITLE = IS_DEV ? `${APP_NAME}${DEV_SUFFIX}` : APP_NAME;
const ICON_BASENAME = IS_DEV ? "icon-dev" : "icon";
const ICON_FILE =
  process.platform === "win32"
    ? `${ICON_BASENAME}.ico`
    : `${ICON_BASENAME}.png`;

let mainWindow: BrowserWindow | null = null;

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

// Bring a window to the front, defeating the Windows foreground-activation lock
// (which denies SetForegroundWindow to non-foreground processes) by briefly
// pinning the window topmost across the focus() call.
export function forceForeground(win: BrowserWindow): void {
  win.show();
  if (process.platform === "win32") {
    win.setAlwaysOnTop(true);
    win.focus();
    win.setAlwaysOnTop(false);
  } else {
    win.focus();
  }
}

export function focusMainWindow(win: BrowserWindow): void {
  if (!win.isFocused()) {
    forceForeground(win);
  }
}

export function createWindow(): void {
  const savedState = loadWindowState();
  mainWindow = new BrowserWindow({
    width: savedState.width,
    height: savedState.height,
    x: savedState.x,
    y: savedState.y,
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    show: false,
    frame: false,
    backgroundColor: INITIAL_WINDOW_BG,
    title: WINDOW_TITLE,
    icon: path.join(app.getAppPath(), "build", ICON_FILE),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [encodeAppModeArg(APP_MODE)],
    },
  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }
  let hasRevealed = false;
  const revealMainWindow = () => {
    if (hasRevealed || !mainWindow) return;
    hasRevealed = true;
    mainWindow.show();
    // After an auto-update the app is launched by Update.exe, which Windows
    // denies foreground activation, so the window comes up unfocused on every
    // post-update start (not just the first). Force it forward only when that
    // happened -- on a normal launch show() already activated it, so we don't
    // steal focus from whatever the user switched to mid-load.
    if (process.platform === "win32" && !mainWindow.isFocused()) {
      forceForeground(mainWindow);
    }
  };
  mainWindow.once("ready-to-show", revealMainWindow);

  trackWindowState(mainWindow);

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
  }

  mainWindow.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.on(
    "did-fail-load",
    (_event, errorCode, errorDescription) => {
      console.error("Failed to load:", errorCode, errorDescription);
    },
  );

  attachExternalLinkHandler(mainWindow.webContents, (url) => {
    openInSystemBrowser(url);
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (DEV_URL && url.startsWith(DEV_URL)) return;
    event.preventDefault();
  });

  mainWindow.on("maximize", () => {
    mainWindow?.webContents.send(IPC.window.maximizedChanged, true);
  });
  mainWindow.on("unmaximize", () => {
    mainWindow?.webContents.send(IPC.window.maximizedChanged, false);
  });

  mainWindow.on("focus", () => {
    mainWindow?.webContents.send(IPC.window.focusChanged, true);
  });
  mainWindow.on("blur", () => {
    mainWindow?.webContents.send(IPC.window.focusChanged, false);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
