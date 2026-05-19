import { type BrowserWindow, screen } from "electron";
import { z } from "zod";
import { readUserDataJson, writeUserDataJsonSync } from "./user-data-json";

const FILE_NAME = "window-state.json";

export const MIN_WINDOW_WIDTH = 600;
export const MIN_WINDOW_HEIGHT = 400;

const WindowStateSchema = z.object({
  width: z.number().finite().min(MIN_WINDOW_WIDTH),
  height: z.number().finite().min(MIN_WINDOW_HEIGHT),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  isMaximized: z.boolean(),
});

export type WindowState = z.infer<typeof WindowStateSchema>;

const DEFAULTS: WindowState = {
  width: 1200,
  height: 800,
  isMaximized: false,
};

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
  const parsed = readUserDataJson(FILE_NAME, (raw) => {
    const result = WindowStateSchema.safeParse(raw);
    return result.success ? result.data : null;
  });
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
