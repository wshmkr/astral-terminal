import path from "node:path";
import { BrowserWindow } from "electron";
import { encodeAppModeArg, IPC, type SettingsState } from "../shared/types";
import { APP_MODE, IS_DEV } from "./env";

const DEV_URL = IS_DEV ? process.env.VITE_DEV_SERVER_URL : undefined;

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 520;
const PARENT_PADDING_X = 48;
const PARENT_PADDING_Y = 80;

let settingsWindow: BrowserWindow | null = null;
let settingsReady = false;
let pendingState: SettingsState | null = null;
let pendingShow = false;

function pushState(): void {
  if (
    !settingsReady ||
    !settingsWindow ||
    settingsWindow.isDestroyed() ||
    !settingsWindow.isVisible() ||
    !pendingState
  )
    return;
  settingsWindow.webContents.send(IPC.settings.stateChanged, pendingState);
}

function applyZoom(parent: BrowserWindow, zoom: number): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  const parentBounds = parent.getContentBounds();
  const maxWidth = Math.max(200, parentBounds.width - PARENT_PADDING_X);
  const maxHeight = Math.max(200, parentBounds.height - PARENT_PADDING_Y);
  const width = Math.min(Math.round(PANEL_WIDTH * zoom), maxWidth);
  const height = Math.min(Math.round(PANEL_HEIGHT * zoom), maxHeight);
  const x = Math.round(parentBounds.x + (parentBounds.width - width) / 2);
  const y = Math.round(parentBounds.y + (parentBounds.height - height) / 2);
  settingsWindow.webContents.setZoomFactor(zoom);
  settingsWindow.setBounds({ x, y, width, height });
}

function placeAndShow(parent: BrowserWindow): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  applyZoom(parent, parent.webContents.getZoomFactor());
  settingsWindow.show();
  settingsWindow.focus();
  pushState();
}

export function applySettingsUiScale(
  parent: BrowserWindow,
  scale: number,
): void {
  if (!settingsWindow?.isVisible()) return;
  applyZoom(parent, scale);
}

function createSettingsWindow(parent: BrowserWindow): BrowserWindow {
  const win = new BrowserWindow({
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    show: false,
    frame: false,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    parent,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [encodeAppModeArg(APP_MODE)],
    },
  });

  if (DEV_URL) {
    win.loadURL(`${DEV_URL}#settings`);
  } else {
    win.loadFile(path.join(__dirname, "../index.html"), {
      hash: "settings",
    });
  }

  win.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  win.once("ready-to-show", () => {
    settingsReady = true;
    if (pendingShow) {
      placeAndShow(parent);
      pendingShow = false;
    }
  });

  win.on("blur", () => {
    setTimeout(() => {
      if (!settingsWindow || settingsWindow.isDestroyed()) return;
      if (!settingsWindow.isVisible()) return;
      if (parent.isFocused()) hideSettingsWindow();
    }, 0);
  });

  win.on("closed", () => {
    if (settingsWindow === win) {
      settingsWindow = null;
      settingsReady = false;
      pendingShow = false;
    }
  });

  return win;
}

export function initSettingsWindow(parent: BrowserWindow): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) return;
  settingsWindow = createSettingsWindow(parent);
}

export function openSettingsWindow(parent: BrowserWindow): void {
  settingsWindow ??= createSettingsWindow(parent);
  if (!settingsReady) {
    pendingShow = true;
    return;
  }
  placeAndShow(parent);
}

export function hideSettingsWindow(): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  if (!settingsWindow.isVisible()) return;
  settingsWindow.hide();
}

export function setSettingsState(state: SettingsState): void {
  pendingState = state;
  pushState();
}

export function destroySettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.destroy();
  }
  settingsWindow = null;
  settingsReady = false;
  pendingState = null;
  pendingShow = false;
}
