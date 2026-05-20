import type { PaneNode, PersistedSettings, Surface } from "../shared/types";
import { readUserDataJson, writeUserDataJsonAtomic } from "./user-data-json";

const FILE_NAME = "settings.json";

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidSurface(v: unknown): v is Surface {
  if (!isObject(v)) return false;
  if (typeof v.id !== "string" || typeof v.name !== "string") return false;
  if (v.type === "terminal") return typeof v.cwd === "string";
  if (v.type === "browser") return typeof v.url === "string";
  return false;
}

function isValidPaneNode(v: unknown): v is PaneNode {
  if (!isObject(v) || typeof v.id !== "string") return false;
  if (v.kind === "leaf") {
    if (!Array.isArray(v.surfaces) || v.surfaces.length === 0) return false;
    if (!v.surfaces.every(isValidSurface)) return false;
    if (typeof v.activeSurfaceId !== "string") return false;
    return true;
  }
  if (v.kind === "split") {
    if (v.direction !== "horizontal" && v.direction !== "vertical")
      return false;
    if (!Array.isArray(v.children) || v.children.length === 0) return false;
    if (!v.children.every(isValidPaneNode)) return false;
    if (
      v.sizes !== undefined &&
      !(Array.isArray(v.sizes) && v.sizes.every((n) => typeof n === "number"))
    )
      return false;
    return true;
  }
  return false;
}

function isValidPersisted(v: unknown): v is PersistedSettings {
  if (!isObject(v)) return false;
  if (!Array.isArray(v.workspaces)) return false;
  for (const w of v.workspaces) {
    if (!isObject(w)) return false;
    if (typeof w.id !== "string" || typeof w.name !== "string") return false;
    if (!isValidPaneNode(w.layout)) return false;
  }
  if (v.activeWorkspaceId !== null && typeof v.activeWorkspaceId !== "string")
    return false;
  if (v.sidebarWidth !== undefined && typeof v.sidebarWidth !== "number")
    return false;
  if (v.appearance !== undefined && !isObject(v.appearance)) return false;
  if (v.notificationSettings !== undefined && !isObject(v.notificationSettings))
    return false;
  if (v.updateSettings !== undefined && !isObject(v.updateSettings))
    return false;
  if (v.terminalSettings !== undefined && !isObject(v.terminalSettings))
    return false;
  return true;
}

export function loadSettings(): PersistedSettings | null {
  return readUserDataJson(FILE_NAME, isValidPersisted);
}

export function saveSettings(settings: PersistedSettings): Promise<void> {
  return writeUserDataJsonAtomic(FILE_NAME, settings);
}
