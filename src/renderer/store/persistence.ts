import type { PersistedSettings } from "../../shared/settings-types";
import type { AppState, PersistedWorkspaces } from "../../shared/types";

export interface LoadedState {
  settings: PersistedSettings | null;
  workspaces: PersistedWorkspaces | null;
}

export function saveState(state: AppState): void {
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
      layout: w.layout,
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
