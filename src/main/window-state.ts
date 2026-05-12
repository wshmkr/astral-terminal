import { type BrowserWindow, screen } from "electron";
import { readUserDataJson, writeUserDataJsonSync } from "./user-data-json";

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
  const parsed = readUserDataJson(FILE_NAME, isValidState);
  if (!parsed) return DEFAULTS;
  if (!isOnVisibleDisplay(parsed)) {
    return { ...parsed, x: undefined, y: undefined };
  }
  return parsed;
}

function saveWindowState(state: WindowState): void {
  writeUserDataJsonSync(FILE_NAME, state);
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
