import { ipcMain } from "electron";
import { type ActiveRef, IPC } from "../../shared/types";

export interface ActiveRefSnapshot extends ActiveRef {
  updatedAt: number;
}

let cached: ActiveRefSnapshot | null = null;

export function setActiveRef(ref: ActiveRef): void {
  cached = { ...ref, updatedAt: Date.now() };
}

export function getActiveRef(): ActiveRefSnapshot | null {
  return cached;
}

export function registerActiveRefIpc(): void {
  ipcMain.on(IPC.cli.activeRefUpdate, (_event, payload: unknown) => {
    if (!isActiveRef(payload)) return;
    setActiveRef(payload);
  });
}

function isActiveRef(value: unknown): value is ActiveRef {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isNullableString(v.workspaceId) &&
    isNullableString(v.paneId) &&
    isNullableString(v.surfaceId)
  );
}

function isNullableString(v: unknown): v is string | null {
  return v === null || typeof v === "string";
}
