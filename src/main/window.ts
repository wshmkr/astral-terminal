import path from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { APP_NAME, DEV_SUFFIX } from "../shared/meta";
import { encodeAppModeArg, INITIAL_WINDOW_BG, IPC } from "../shared/types";
import { APP_MODE, IS_DEV } from "./env";

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

export function focusMainWindow(win: BrowserWindow): void {
  if (!win.isFocused()) {
    win.show();
    win.focus();
  }
}

export function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.protocol === "http:" || u.protocol === "https:") {
        shell.openExternal(url);
      }
    } catch {}
    return { action: "deny" };
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

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
