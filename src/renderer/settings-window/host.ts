import type {
  AppState,
  SettingsAction,
  SettingsState,
} from "../../shared/types";
import {
  getState,
  setAccentColor,
  setAgentHookStatuses,
  setAppTheme,
  setFontFamily,
  setFontSize,
  setTerminalTheme,
  setUiScale,
  subscribeWorkspaceStore,
  updateNotificationSettings,
  updateUpdateSettings,
} from "../store";

function deriveSettingsState(s: AppState): SettingsState {
  return {
    appearance: s.appearance,
    notificationSettings: s.notificationSettings,
    updateSettings: s.updateSettings,
    agentHookStatuses: s.agentHookStatuses,
  };
}

function applyAction(action: SettingsAction): void {
  switch (action.kind) {
    case "setAppTheme":
      setAppTheme(action.id);
      return;
    case "setTerminalTheme":
      setTerminalTheme(action.id);
      return;
    case "setAccentColor":
      setAccentColor(action.id);
      return;
    case "setFontFamily":
      setFontFamily(action.id);
      return;
    case "setFontSize":
      setFontSize(action.n);
      return;
    case "setUiScale":
      setUiScale(action.n);
      return;
    case "updateNotificationSettings":
      updateNotificationSettings(action.patch);
      return;
    case "updateUpdateSettings":
      updateUpdateSettings(action.patch);
      return;
    case "setAgentHookStatus":
      setAgentHookStatuses({ [action.name]: action.status });
      return;
  }
}

export function startSettingsHost(): void {
  let last = deriveSettingsState(getState());
  window.app.publishSettingsState(last);

  subscribeWorkspaceStore(() => {
    const next = deriveSettingsState(getState());
    if (
      next.appearance === last.appearance &&
      next.notificationSettings === last.notificationSettings &&
      next.updateSettings === last.updateSettings &&
      next.agentHookStatuses === last.agentHookStatuses
    ) {
      return;
    }
    last = next;
    window.app.publishSettingsState(next);
  });

  window.app.onSettingsActionApply((action) => {
    applyAction(action);
  });
}
