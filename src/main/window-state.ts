import fs from "node:fs";
import path from "node:path";
import { app, type BrowserWindow, screen } from "electron";

const FILE_NAME = "window-state.json";

export const MIN_WINDOW_WIDTH = 600;
export const MIN_WINDOW_HEIGHT = 400;

export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

const DEFAULTS: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false,
};

function statePath(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

function isValidState(v: unknown): v is WindowState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  if (!Number.isFinite(s.width) || !Number.isFinite(s.height)) return false;
  if (
    (s.width as number) < MIN_WINDOW_WIDTH ||
    (s.height as number) < MIN_WINDOW_HEIGHT
  )
    return false;
  if (s.x !== undefined && !Number.isFinite(s.x)) return false;
  if (s.y !== undefined && !Number.isFinite(s.y)) return false;
  if (typeof s.isMaximized !== "boolean") return false;
  return true;
}

function isOnVisibleDisplay(state: WindowState): boolean {
  const { x, y, width, height } = state;
  if (x === undefined || y === undefined) return true;
  return screen.getAllDisplays().some(({ workArea }) => {
    return (
      x < workArea.x + workArea.width &&
      y < workArea.y + workArea.height &&
      x + width > workArea.x &&
      y + height > workArea.y
    );
  });
}

export function loadWindowState(): WindowState {
  let raw: string;
  try {
    raw = fs.readFileSync(statePath(), "utf-8");
  } catch {
    return DEFAULTS;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULTS;
  }
  if (!isValidState(parsed)) return DEFAULTS;
  if (!isOnVisibleDisplay(parsed)) return DEFAULTS;
  return parsed;
}

function saveWindowState(state: WindowState): void {
  try {
    fs.writeFileSync(statePath(), JSON.stringify(state));
  } catch (err) {
    console.error("Failed to save window state:", err);
  }
}

export function trackWindowState(win: BrowserWindow): void {
  win.on("close", () => {
    const isMaximized = win.isMaximized();
    const bounds = isMaximized ? win.getNormalBounds() : win.getBounds();
    saveWindowState({
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized,
    });
  });
}
