import type { BrowserWindow } from "electron";
import {
  IPC,
  type NotificationPanelItem,
  type ScreenRect,
} from "../shared/types";
import { createChildPanelWindow } from "./child-panel-window";

const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 400;

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
  const zoom = parent.webContents.getZoomFactor();
  const x = Math.round(parentBounds.x + anchor.x * zoom);
  const y = Math.round(parentBounds.y + (anchor.y + anchor.height) * zoom);
  const width = Math.round(PANEL_WIDTH * zoom);
  const height = Math.round(PANEL_HEIGHT * zoom);
  notifWindow.webContents.setZoomFactor(zoom);
  notifWindow.setBounds({ x, y, width, height });
  notifWindow.show();
  notifWindow.focus();
}

function createNotificationWindow(parent: BrowserWindow): BrowserWindow {
  const win = createChildPanelWindow({
    parent,
    hash: "notifications",
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
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

export function initNotificationWindow(parent: BrowserWindow): void {
  if (notifWindow && !notifWindow.isDestroyed()) return;
  notifWindow = createNotificationWindow(parent);
}

export function openNotificationPanel(
  parent: BrowserWindow,
  anchor: ScreenRect,
): void {
  notifWindow ??= createNotificationWindow(parent);
  if (!notifReady) {
    pendingShow = { parent, anchor };
    return;
  }
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
