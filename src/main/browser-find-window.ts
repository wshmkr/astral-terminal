import path from "node:path";
import { BrowserWindow } from "electron";
import {
  type BrowserFindResult,
  encodeAppModeArg,
  IPC,
  type ScreenRect,
} from "../shared/types";
import { APP_MODE, IS_DEV } from "./env";

const DEV_URL = IS_DEV ? process.env.VITE_DEV_SERVER_URL : undefined;

const PANEL_WIDTH = 460;
const PANEL_HEIGHT = 44;
const RIGHT_INSET = 16;
const TOP_INSET = 8;

let findWindow: BrowserWindow | null = null;
let ready = false;
let currentSurfaceId: string | null = null;
let pendingShow: {
  parent: BrowserWindow;
  anchor: ScreenRect;
  surfaceId: string;
} | null = null;

function placeAndShow(
  parent: BrowserWindow,
  anchor: ScreenRect,
  surfaceId: string,
): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  const parentBounds = parent.getContentBounds();
  const zoom = parent.webContents.getZoomFactor();
  const width = Math.round(PANEL_WIDTH * zoom);
  const height = Math.round(PANEL_HEIGHT * zoom);
  const right = Math.round((anchor.x + anchor.width - RIGHT_INSET) * zoom);
  const x = Math.round(parentBounds.x + right - width);
  const y = Math.round(parentBounds.y + (anchor.y + TOP_INSET) * zoom);
  findWindow.webContents.setZoomFactor(zoom);
  findWindow.setBounds({ x, y, width, height });
  const targetChanged = currentSurfaceId !== surfaceId;
  currentSurfaceId = surfaceId;
  findWindow.show();
  findWindow.focus();
  if (targetChanged) {
    findWindow.webContents.send(IPC.browser.findTargetChanged, { surfaceId });
  }
}

function createFindWindow(parent: BrowserWindow): BrowserWindow {
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
    win.loadURL(`${DEV_URL}#browser-find`);
  } else {
    win.loadFile(path.join(__dirname, "../index.html"), {
      hash: "browser-find",
    });
  }

  win.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  win.once("ready-to-show", () => {
    ready = true;
    if (pendingShow) {
      placeAndShow(
        pendingShow.parent,
        pendingShow.anchor,
        pendingShow.surfaceId,
      );
      pendingShow = null;
    }
  });

  win.on("closed", () => {
    if (findWindow === win) {
      findWindow = null;
      ready = false;
      currentSurfaceId = null;
      pendingShow = null;
    }
  });

  return win;
}

export function initBrowserFindWindow(parent: BrowserWindow): void {
  if (findWindow && !findWindow.isDestroyed()) return;
  findWindow = createFindWindow(parent);
}

export function openBrowserFindWindow(
  parent: BrowserWindow,
  anchor: ScreenRect,
  surfaceId: string,
): void {
  findWindow ??= createFindWindow(parent);
  if (!ready) {
    pendingShow = { parent, anchor, surfaceId };
    return;
  }
  placeAndShow(parent, anchor, surfaceId);
}

export function sendBrowserFindResult(
  surfaceId: string,
  result: BrowserFindResult,
): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  if (currentSurfaceId !== surfaceId) return;
  findWindow.webContents.send(IPC.browser.findResultChanged, result);
}

export function hideBrowserFindWindow(): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  currentSurfaceId = null;
  if (findWindow.isVisible()) findWindow.hide();
}

export function isBrowserFindWindowTargeting(surfaceId: string): boolean {
  return currentSurfaceId === surfaceId;
}

export function destroyBrowserFindWindow(): void {
  if (findWindow && !findWindow.isDestroyed()) {
    findWindow.destroy();
  }
  findWindow = null;
  ready = false;
  currentSurfaceId = null;
  pendingShow = null;
}
