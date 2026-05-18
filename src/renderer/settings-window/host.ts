import type {
  AppState,
  SettingsAction,
  SettingsActionMap,
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

const HANDLERS: SettingsActionMap = {
  setAppTheme,
  setTerminalTheme,
  setAccentColor,
  setFontFamily,
  setFontSize,
  setUiScale,
  updateNotificationSettings,
  updateUpdateSettings,
  setAgentHookStatus: (name, status) =>
    setAgentHookStatuses({ [name]: status }),
};

function applyAction(action: SettingsAction): void {
  (HANDLERS[action.kind] as (...args: unknown[]) => void)(...action.args);
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
