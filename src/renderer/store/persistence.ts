import type { PersistedSettings } from "../../shared/settings-types";
import type { AppState, PersistedWorkspaces } from "../../shared/types";

export interface LoadedState {
  settings: PersistedSettings | null;
  workspaces: PersistedWorkspaces | null;
}

// Skip writes whose payload hasn't changed since the last successful send, so
// e.g. a terminal title change doesn't also rewrite settings.json. On write
// failure the cache resets so the next save retries.
function makeDedupedWriter<T>(
  label: string,
  write: (value: T) => Promise<void>,
): (value: T) => void {
  let lastJson: string | null = null;
  return (value) => {
    const json = JSON.stringify(value);
    if (json === lastJson) return;
    lastJson = json;
    write(value).catch((err) => {
      lastJson = null;
      console.error(`Failed to save ${label}:`, err);
    });
  };
}

const writeSettings = makeDedupedWriter<PersistedSettings>("settings", (v) =>
  window.app.writeSettings(v),
);
const writeWorkspaces = makeDedupedWriter<PersistedWorkspaces>(
  "workspaces",
  (v) => window.app.writeWorkspaces(v),
);

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
  writeSettings(settings);
  writeWorkspaces(workspaces);
}

export async function loadState(): Promise<LoadedState> {
  const [settings, workspaces] = await Promise.all([
    window.app.readSettings(),
    window.app.readWorkspaces(),
  ]);
  return { settings, workspaces };
}
