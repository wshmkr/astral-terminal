import type { PersistedSettings } from "../../shared/settings-types";
import {
  type AppState,
  isTerminalSurface,
  type PaneNode,
  type PersistedWorkspaces,
  type Surface,
} from "../../shared/types";
import { mapLeaves } from "../components/Layout/pane-tree";

export interface LoadedState {
  settings: PersistedSettings | null;
  workspaces: PersistedWorkspaces | null;
}

function stripSurfaceRuntime(s: Surface): Surface {
  if (isTerminalSurface(s) && s.status !== undefined) {
    const { status: _s, ...rest } = s;
    return rest;
  }
  return s;
}

function stripLayoutRuntime(node: PaneNode): PaneNode {
  return mapLeaves(node, (leaf) => {
    const surfaces = leaf.surfaces.map(stripSurfaceRuntime);
    return surfaces.every((s, i) => s === leaf.surfaces[i])
      ? leaf
      : { ...leaf, surfaces };
  });
}

export function saveState(state: AppState): void {
  // keep first-run signal alive until the user clicks through the welcome
  if (state.welcomeOpen) return;
  const settings: PersistedSettings = {
    appearance: state.appearance,
    notificationSettings: state.notificationSettings,
    updateSettings: state.updateSettings,
    terminalSettings: state.terminalSettings,
    browserSettings: state.browserSettings,
  };
  const workspaces: PersistedWorkspaces = {
    workspaces: state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      layout: stripLayoutRuntime(w.layout),
    })),
    activeWorkspaceId: state.activeWorkspaceId,
    sidebarWidth: state.sidebarWidth,
  };
  window.app.writeSettings(settings).catch((err) => {
    console.error("Failed to save settings:", err);
  });
  window.app.writeWorkspaces(workspaces).catch((err) => {
    console.error("Failed to save workspaces:", err);
  });
}

export async function loadState(): Promise<LoadedState> {
  const [settings, workspaces] = await Promise.all([
    window.app.readSettings(),
    window.app.readWorkspaces(),
  ]);
  return { settings, workspaces };
}
