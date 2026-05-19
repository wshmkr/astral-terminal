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

const MAX_BAR_WIDTH = 320;
const BAR_HEIGHT = 36;
const RIGHT_INSET = 8;
const TOP_INSET = 4;
// Total horizontal buffer when contracting against a narrow anchor — matches
// the terminal overlay's `maxWidth: calc(100% - 32px)`
const HORIZONTAL_BUFFER = 32;

let findWindow: BrowserWindow | null = null;
let ready = false;
let pendingShow = false;
let currentSurfaceId: string | null = null;
let currentParent: BrowserWindow | null = null;
let currentAnchor: ScreenRect | null = null;

function applyBounds(): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  if (!currentParent || !currentAnchor) return;
  const parentBounds = currentParent.getContentBounds();
  const zoom = currentParent.webContents.getZoomFactor();
  const available = Math.max(0, currentAnchor.width - HORIZONTAL_BUFFER);
  const targetWidth = Math.min(MAX_BAR_WIDTH, available);
  const width = Math.round(targetWidth * zoom);
  const height = Math.round(BAR_HEIGHT * zoom);
  const right = Math.round(
    (currentAnchor.x + currentAnchor.width - RIGHT_INSET) * zoom,
  );
  const x = Math.round(parentBounds.x + right - width);
  const y = Math.round(parentBounds.y + (currentAnchor.y + TOP_INSET) * zoom);
  findWindow.webContents.setZoomFactor(zoom);
  findWindow.setContentBounds({ x, y, width, height });
}

function placeAndShow(): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  if (!currentSurfaceId) return;
  applyBounds();
  findWindow.show();
  findWindow.focus();
  findWindow.webContents.send(IPC.browser.findTargetChanged, {
    surfaceId: currentSurfaceId,
  });
}

function createFindWindow(parent: BrowserWindow): BrowserWindow {
  const win = new BrowserWindow({
    width: MAX_BAR_WIDTH,
    height: BAR_HEIGHT,
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
      pendingShow = false;
      placeAndShow();
    }
  });

  win.on("closed", () => {
    if (findWindow === win) {
      findWindow = null;
      ready = false;
      pendingShow = false;
      currentSurfaceId = null;
    }
  });

  return win;
}

export function initBrowserFindWindow(parent: BrowserWindow): void {
  if (findWindow && !findWindow.isDestroyed()) return;
  findWindow = createFindWindow(parent);
  parent.on("move", () => {
    if (findWindow?.isVisible()) applyBounds();
  });
}

export function openBrowserFindWindow(
  parent: BrowserWindow,
  anchor: ScreenRect,
  surfaceId: string,
): void {
  if (!findWindow || findWindow.isDestroyed()) {
    throw new Error(
      "openBrowserFindWindow called before initBrowserFindWindow",
    );
  }
  currentParent = parent;
  currentAnchor = anchor;
  currentSurfaceId = surfaceId;
  if (!ready) {
    pendingShow = true;
    return;
  }
  placeAndShow();
}

export function sendBrowserFindResult(
  surfaceId: string,
  result: BrowserFindResult,
): void {
  if (!findWindow || findWindow.isDestroyed()) return;
  if (currentSurfaceId !== surfaceId) return;
  findWindow.webContents.send(IPC.browser.findResultChanged, result);
}

export function hideBrowserFindWindow(onlyIfTargeting?: string): string | null {
  if (!findWindow || findWindow.isDestroyed()) return null;
  if (onlyIfTargeting != null && currentSurfaceId !== onlyIfTargeting) {
    return null;
  }
  const previousSurfaceId = currentSurfaceId;
  currentSurfaceId = null;
  pendingShow = false;
  if (findWindow.isVisible()) findWindow.hide();
  return previousSurfaceId;
}

export function updateBrowserFindAnchor(
  surfaceId: string,
  anchor: ScreenRect,
): void {
  if (currentSurfaceId !== surfaceId) return;
  currentAnchor = anchor;
  if (findWindow?.isVisible()) applyBounds();
}

export function destroyBrowserFindWindow(): void {
  if (findWindow && !findWindow.isDestroyed()) {
    findWindow.destroy();
  }
  findWindow = null;
  ready = false;
  pendingShow = false;
  currentSurfaceId = null;
}
