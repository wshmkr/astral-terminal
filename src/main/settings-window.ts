import type { BrowserWindow } from "electron";
import {
  IPC,
  SETTINGS_FADE_MS,
  type SettingsState,
  WINDOW_HASH,
} from "../shared/types";
import { createChildPanelWindow } from "./child-panel-window";
import { createFadeController } from "./fade-controller";

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 520;
const PARENT_PADDING_X = 48;
const PARENT_PADDING_Y = 80;

type VisibilityListener = (visible: boolean) => void;

let settingsWindow: BrowserWindow | null = null;
let settingsReady = false;
let pendingState: SettingsState | null = null;
let pendingShow = false;
const fade = createFadeController(SETTINGS_FADE_MS);
const visibilityListeners = new Set<VisibilityListener>();

function sendFade(visible: boolean): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  settingsWindow.webContents.send(IPC.settings.fade, visible);
}

export function onSettingsVisibilityChange(cb: VisibilityListener): () => void {
  visibilityListeners.add(cb);
  return () => visibilityListeners.delete(cb);
}

function emitVisibility(visible: boolean): void {
  for (const cb of visibilityListeners) cb(visible);
}

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
  fade.cancelPendingHide();
  applyZoom(parent, parent.webContents.getZoomFactor());
  settingsWindow.show();
  settingsWindow.focus();
  pushState();
  emitVisibility(true);
  sendFade(true);
}

export function applySettingsUiScale(
  parent: BrowserWindow,
  scale: number,
): void {
  if (!settingsWindow?.isVisible()) return;
  applyZoom(parent, scale);
}

function createSettingsWindow(parent: BrowserWindow): BrowserWindow {
  const win = createChildPanelWindow({
    parent,
    hash: WINDOW_HASH.settings,
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    transparent: true,
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

  const onParentFocus = () => {
    if (win.isDestroyed() || !win.isVisible()) return;
    hideSettingsWindow();
  };
  parent.on("focus", onParentFocus);

  win.on("closed", () => {
    parent.off("focus", onParentFocus);
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
  const win = settingsWindow;
  emitVisibility(false);
  sendFade(false);
  fade.scheduleHide(() => {
    if (!win.isDestroyed()) win.hide();
  });
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
