import type { PersistedSettings } from "../../shared/settings-types";
import type { AppState, PersistedWorkspaces } from "../../shared/types";

export interface LoadedState {
  settings: PersistedSettings | null;
  workspaces: PersistedWorkspaces | null;
}

// Skip writes whose payload hasn't changed since the last successful send, so
// e.g. a terminal title change doesn't also rewrite settings.json.
let lastSettingsJson: string | null = null;
let lastWorkspacesJson: string | null = null;

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
      layout: w.layout,
    })),
    activeWorkspaceId: state.activeWorkspaceId,
    sidebarWidth: state.sidebarWidth,
  };
  const settingsJson = JSON.stringify(settings);
  if (settingsJson !== lastSettingsJson) {
    lastSettingsJson = settingsJson;
    window.app.writeSettings(settings).catch((err) => {
      lastSettingsJson = null;
      console.error("Failed to save settings:", err);
    });
  }
  const workspacesJson = JSON.stringify(workspaces);
  if (workspacesJson !== lastWorkspacesJson) {
    lastWorkspacesJson = workspacesJson;
    window.app.writeWorkspaces(workspaces).catch((err) => {
      lastWorkspacesJson = null;
      console.error("Failed to save workspaces:", err);
    });
  }
}

export async function loadState(): Promise<LoadedState> {
  const [settings, workspaces] = await Promise.all([
    window.app.readSettings(),
    window.app.readWorkspaces(),
  ]);
  return { settings, workspaces };
}
