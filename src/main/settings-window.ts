import type { BrowserWindow } from "electron";
import { IPC, type SettingsState } from "../shared/types";
import { createChildPanelWindow } from "./child-panel-window";

const PANEL_WIDTH = 760;
const PANEL_HEIGHT = 520;
const PARENT_PADDING_X = 48;
const PARENT_PADDING_Y = 80;
const FADE_MS = 200;

type VisibilityListener = (visible: boolean) => void;

let settingsWindow: BrowserWindow | null = null;
let settingsReady = false;
let pendingState: SettingsState | null = null;
let pendingShow = false;
let fadeToken = 0;
const visibilityListeners = new Set<VisibilityListener>();

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function fadeOpacity(win: BrowserWindow, from: number, to: number): void {
  const myToken = ++fadeToken;
  const start = Date.now();
  win.setOpacity(from);
  const tick = () => {
    if (myToken !== fadeToken || win.isDestroyed()) return;
    const t = Math.min(1, (Date.now() - start) / FADE_MS);
    win.setOpacity(from + (to - from) * easeOutCubic(t));
    if (t < 1) setTimeout(tick, 16);
  };
  tick();
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
  applyZoom(parent, parent.webContents.getZoomFactor());
  settingsWindow.setOpacity(0);
  settingsWindow.show();
  settingsWindow.focus();
  pushState();
  emitVisibility(true);
  fadeOpacity(settingsWindow, 0, 1);
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
    hash: "settings",
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
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
  const win = settingsWindow;
  emitVisibility(false);
  fadeOpacity(win, win.getOpacity(), 0);
  const myToken = fadeToken;
  setTimeout(() => {
    if (myToken !== fadeToken || win.isDestroyed()) return;
    win.hide();
    win.setOpacity(1);
  }, FADE_MS);
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
