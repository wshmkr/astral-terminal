import type { PersistedSettings } from "../../shared/settings-types";
import type {
  AppState,
  PaneNode,
  PersistedWorkspaces,
  Surface,
} from "../../shared/types";

export interface LoadedState {
  settings: PersistedSettings | null;
  workspaces: PersistedWorkspaces | null;
}

// `status` is a runtime-only pane tag; drop it so it never reaches disk.
function stripSurfaceRuntime(s: Surface): Surface {
  if (s.type === "terminal" && s.status !== undefined) {
    return { id: s.id, name: s.name, type: "terminal", cwd: s.cwd };
  }
  return s;
}

function stripLayoutRuntime(node: PaneNode): PaneNode {
  if (node.kind === "split") {
    return { ...node, children: node.children.map(stripLayoutRuntime) };
  }
  return { ...node, surfaces: node.surfaces.map(stripSurfaceRuntime) };
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
