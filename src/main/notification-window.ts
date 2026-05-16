import path from "node:path";
import { BrowserWindow } from "electron";
import {
  encodeAppModeArg,
  IPC,
  type NotificationPanelItem,
  type ScreenRect,
} from "../shared/types";
import { APP_MODE, IS_DEV } from "./env";

const DEV_URL = IS_DEV ? process.env.VITE_DEV_SERVER_URL : undefined;

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 400;
const PANEL_GAP = 4;

let notifWindow: BrowserWindow | null = null;
let notifReady = false;
let pendingItems: NotificationPanelItem[] = [];
let pendingShow: { parent: BrowserWindow; anchor: ScreenRect } | null = null;

function pushItems(): void {
  if (!notifReady || !notifWindow || notifWindow.isDestroyed()) return;
  notifWindow.webContents.send(
    IPC.notification.panelItemsChanged,
    pendingItems,
  );
}

function placeAndShow(parent: BrowserWindow, anchor: ScreenRect): void {
  if (!notifWindow || notifWindow.isDestroyed()) return;
  const parentBounds = parent.getContentBounds();
  const x = Math.round(parentBounds.x + anchor.x);
  const y = Math.round(parentBounds.y + anchor.y + anchor.height + PANEL_GAP);
  notifWindow.setBounds({ x, y, width: PANEL_WIDTH, height: PANEL_HEIGHT });
  notifWindow.show();
  notifWindow.focus();
}

function createNotificationWindow(parent: BrowserWindow): BrowserWindow {
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
    win.loadURL(`${DEV_URL}#notifications`);
  } else {
    win.loadFile(path.join(__dirname, "../index.html"), {
      hash: "notifications",
    });
  }

  win.webContents.on("page-title-updated", (event) => {
    event.preventDefault();
  });

  win.once("ready-to-show", () => {
    notifReady = true;
    pushItems();
    if (pendingShow) {
      placeAndShow(pendingShow.parent, pendingShow.anchor);
      pendingShow = null;
    }
  });

  win.on("blur", () => {
    hideNotificationPanel();
  });

  win.on("closed", () => {
    if (notifWindow === win) {
      notifWindow = null;
      notifReady = false;
      pendingShow = null;
    }
  });

  return win;
}

export function openNotificationPanel(
  parent: BrowserWindow,
  anchor: ScreenRect,
  items: NotificationPanelItem[],
): void {
  pendingItems = items;
  notifWindow ??= createNotificationWindow(parent);
  if (!notifReady) {
    pendingShow = { parent, anchor };
    return;
  }
  pushItems();
  placeAndShow(parent, anchor);
}

export function setNotificationPanelItems(
  items: NotificationPanelItem[],
): void {
  pendingItems = items;
  pushItems();
}

export function hideNotificationPanel(): void {
  if (!notifWindow || notifWindow.isDestroyed()) return;
  if (!notifWindow.isVisible()) return;
  notifWindow.hide();
  notifWindow.getParentWindow()?.webContents.send(IPC.notification.panelClosed);
}

export function destroyNotificationWindow(): void {
  if (notifWindow && !notifWindow.isDestroyed()) {
    notifWindow.destroy();
  }
  notifWindow = null;
  notifReady = false;
  pendingItems = [];
  pendingShow = null;
}
