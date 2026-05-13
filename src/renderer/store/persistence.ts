import type { AppState, PersistedSettings } from "../../shared/types";

export function saveState(state: AppState): void {
  const persisted: PersistedSettings = {
    workspaces: state.workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      layout: w.layout,
    })),
    activeWorkspaceId: state.activeWorkspaceId,
    sidebarWidth: state.sidebarWidth,
    appearance: state.appearance,
    notificationSettings: state.notificationSettings,
    updateSettings: state.updateSettings,
  };
  window.app.writeSettings(persisted).catch((err) => {
    console.error("Failed to save settings:", err);
  });
}

export function loadState(): Promise<PersistedSettings | null> {
  return window.app.readSettings();
}
