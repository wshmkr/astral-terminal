import path from "node:path";
import { app, BrowserWindow, shell } from "electron";
import { APP_NAME } from "../shared/meta";
import { DEFAULT_TERMINAL_BG, IPC } from "../shared/types";

const DEV_URL = app.isPackaged ? undefined : process.env.VITE_DEV_SERVER_URL;

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
    backgroundColor: DEFAULT_TERMINAL_BG,
    title: APP_NAME,
    icon: path.join(
      app.getAppPath(),
      "build",
      process.platform === "win32" ? "icon.ico" : "icon.png",
    ),
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../index.html"));
  }

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
