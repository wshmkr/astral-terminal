import { useSyncExternalStore } from "react";
import type { AgentName } from "../../shared/agent-hooks";
import type {
  AccentColorId,
  AppThemeId,
  ConfigureAgentHooksResult,
  FontFamilyId,
  NotificationSettings,
  SettingsAction,
  SettingsState,
  TerminalThemeId,
  UninstallAgentHooksResult,
  UpdateSettings,
} from "../../shared/types";

let state: SettingsState | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => {
    fn();
  });
}

function subscribeStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSettingsStoreState(next: SettingsState): void {
  state = next;
  notify();
}

export function useSettingsStore<T>(selector: (s: SettingsState) => T): T {
  return useSyncExternalStore(subscribeStore, () => {
    if (!state) {
      throw new Error(
        "Settings store not hydrated — render gated on initial state",
      );
    }
    return selector(state);
  });
}

function dispatch(action: SettingsAction): void {
  window.app.sendSettingsAction(action);
}

export function setAppTheme(id: AppThemeId): void {
  dispatch({ kind: "setAppTheme", id });
}

export function setTerminalTheme(id: TerminalThemeId): void {
  dispatch({ kind: "setTerminalTheme", id });
}

export function setAccentColor(id: AccentColorId): void {
  dispatch({ kind: "setAccentColor", id });
}

export function setFontFamily(id: FontFamilyId): void {
  dispatch({ kind: "setFontFamily", id });
}

export function setFontSize(n: number): void {
  dispatch({ kind: "setFontSize", n });
}

export function setUiScale(n: number): void {
  dispatch({ kind: "setUiScale", n });
}

export function updateNotificationSettings(
  patch: Partial<NotificationSettings>,
): void {
  dispatch({ kind: "updateNotificationSettings", patch });
}

export function updateUpdateSettings(patch: Partial<UpdateSettings>): void {
  dispatch({ kind: "updateUpdateSettings", patch });
}

export async function setAgentHook(
  providerName: AgentName,
  enabled: boolean,
): Promise<ConfigureAgentHooksResult | UninstallAgentHooksResult> {
  return window.app.invokeSettingsAgentHook({ providerName, enabled });
}
