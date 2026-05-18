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

// Initial window size before the renderer reports the bar's measured size via
// browser:resize-find-window — generous so the bar lays out at its natural width
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 48;
const RIGHT_INSET = 16;
const TOP_INSET = 8;

let findWindow: BrowserWindow | null = null;
let ready = false;
let currentSurfaceId: string | null = null;
let currentParent: BrowserWindow | null = null;
let currentAnchor: ScreenRect | null = null;
let currentSize = { width: PANEL_WIDTH, height: PANEL_HEIGHT };
let pendingShow: {
  parent: BrowserWindow;
  anchor: ScreenRect;
  surfaceId: string;
} | null = null;

function applyBounds(): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  if (!currentParent || !currentAnchor) return;
  const parentBounds = currentParent.getContentBounds();
  const zoom = currentParent.webContents.getZoomFactor();
  const width = Math.round(currentSize.width * zoom);
  const height = Math.round(currentSize.height * zoom);
  const right = Math.round(
    (currentAnchor.x + currentAnchor.width - RIGHT_INSET) * zoom,
  );
  const x = Math.round(parentBounds.x + right - width);
  const y = Math.round(parentBounds.y + (currentAnchor.y + TOP_INSET) * zoom);
  findWindow.webContents.setZoomFactor(zoom);
  findWindow.setContentBounds({ x, y, width, height });
}

function placeAndShow(
  parent: BrowserWindow,
  anchor: ScreenRect,
  surfaceId: string,
): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  currentParent = parent;
  currentAnchor = anchor;
  applyBounds();
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

export function hideBrowserFindWindow(): string | null {
  if (!findWindow || findWindow.isDestroyed()) return null;
  const previousSurfaceId = currentSurfaceId;
  currentSurfaceId = null;
  if (findWindow.isVisible()) findWindow.hide();
  return previousSurfaceId;
}

export function resizeBrowserFindWindow(width: number, height: number): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  if (width <= 0 || height <= 0) return;
  if (currentSize.width === width && currentSize.height === height) return;
  currentSize = { width, height };
  applyBounds();
}

export function updateBrowserFindAnchor(
  surfaceId: string,
  anchor: ScreenRect,
): void {
  if (currentSurfaceId !== surfaceId) return;
  currentAnchor = anchor;
  applyBounds();
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
