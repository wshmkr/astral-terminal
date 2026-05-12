import { readUserDataJson, writeUserDataJsonSync } from "./user-data-json";

const FILE_NAME = "update-prefs.json";

export interface UpdatePrefs {
  autoUpdatesEnabled: boolean;
}

const DEFAULTS: UpdatePrefs = {
  autoUpdatesEnabled: true,
};

function isValidPrefs(v: unknown): v is UpdatePrefs {
  if (typeof v !== "object" || v === null) return false;
  const p = v as Record<string, unknown>;
  return typeof p.autoUpdatesEnabled === "boolean";
}

export function loadUpdatePrefs(): UpdatePrefs {
  return readUserDataJson(FILE_NAME, isValidPrefs) ?? DEFAULTS;
}

export function saveUpdatePrefs(prefs: UpdatePrefs): void {
  writeUserDataJsonSync(FILE_NAME, prefs);
}
