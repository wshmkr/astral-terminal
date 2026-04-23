import type {
  AppearanceSettings,
  AppState,
  NotificationSettings,
  PaneNode,
  Surface,
  Workspace,
} from "../../shared/types";

const STORAGE_KEY = "app-state";

interface PersistedState {
  workspaces: Array<Omit<Workspace, "notifications">>;
  activeWorkspaceId: string | null;
  sidebarWidth?: number;
  appearance?: AppearanceSettings;
  notificationSettings?: NotificationSettings;
}

export function saveState(state: AppState): void {
  const persisted: PersistedState = {
    workspaces: state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      layout: w.layout,
    })),
    activeWorkspaceId: state.activeWorkspaceId,
    sidebarWidth: state.sidebarWidth,
    appearance: state.appearance,
    notificationSettings: state.notificationSettings,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch (err) {
    console.error("Persistence save failed:", err);
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidSurface(v: unknown): v is Surface {
  if (!isObject(v)) return false;
  if (v.type !== "terminal") return false;
  if (typeof v.id !== "string" || typeof v.name !== "string") return false;
  if (typeof v.cwd !== "string") return false;
  return true;
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

function isValidPersisted(v: unknown): v is PersistedState {
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
  return true;
}

export function loadState(): PersistedState | null {
  const raw = (() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  })();
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.warn("Persistence load: invalid JSON, discarding:", err);
    return null;
  }

  if (!isValidPersisted(parsed)) {
    console.warn("Persistence load: malformed state shape, discarding");
    return null;
  }

  return parsed;
}
