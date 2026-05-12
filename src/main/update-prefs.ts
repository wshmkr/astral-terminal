import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const FILE_NAME = "update-prefs.json";

export interface UpdatePrefs {
  autoUpdatesEnabled: boolean;
}

const DEFAULTS: UpdatePrefs = {
  autoUpdatesEnabled: true,
};

function prefsPath(): string {
  return path.join(app.getPath("userData"), FILE_NAME);
}

function isValidPrefs(v: unknown): v is UpdatePrefs {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.autoUpdatesEnabled === "boolean";
}

export function loadUpdatePrefs(): UpdatePrefs {
  let raw: string;
  try {
    raw = fs.readFileSync(prefsPath(), "utf-8");
  } catch {
    return DEFAULTS;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULTS;
  }
  if (!isValidPrefs(parsed)) return DEFAULTS;
  return parsed;
}

export function saveUpdatePrefs(prefs: UpdatePrefs): void {
  try {
    fs.writeFileSync(prefsPath(), JSON.stringify(prefs));
  } catch (err) {
    console.error("Failed to save update prefs:", err);
  }
}
