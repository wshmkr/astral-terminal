import { useSyncExternalStore } from "react";
import type { AgentName } from "../../shared/agent-hooks";
import type {
  ConfigureAgentHooksResult,
  SettingsAction,
  SettingsActionMap,
  SettingsState,
  UninstallAgentHooksResult,
  UpdateStatus,
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

function getStateOrNull(): SettingsState | null {
  return state;
}

export function setSettingsStoreState(next: SettingsState): void {
  state = next;
  notify();
}

// DEV-only escape hatch for window.setUpdateState(...)
export function patchLocalUpdateStatus(updateStatus: UpdateStatus): void {
  if (!state) return;
  state = { ...state, updateStatus };
  notify();
}

export function useSettingsState(): SettingsState | null {
  return useSyncExternalStore(subscribeStore, getStateOrNull);
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

function dispatch<K extends SettingsAction["kind"]>(
  kind: K,
  ...args: Parameters<SettingsActionMap[K]>
): void {
  window.app.sendSettingsAction({ kind, args } as SettingsAction);
}

export const setAppTheme: SettingsActionMap["setAppTheme"] = (id) =>
  dispatch("setAppTheme", id);
export const setTerminalTheme: SettingsActionMap["setTerminalTheme"] = (id) =>
  dispatch("setTerminalTheme", id);
export const setAccentColor: SettingsActionMap["setAccentColor"] = (id) =>
  dispatch("setAccentColor", id);
export const setFontFamily: SettingsActionMap["setFontFamily"] = (id) =>
  dispatch("setFontFamily", id);
export const setFontSize: SettingsActionMap["setFontSize"] = (n) =>
  dispatch("setFontSize", n);
export const setTerminalLineHeight: SettingsActionMap["setTerminalLineHeight"] =
  (n) => dispatch("setTerminalLineHeight", n);
export const setUiScale: SettingsActionMap["setUiScale"] = (n) =>
  dispatch("setUiScale", n);
export const updateNotificationSettings: SettingsActionMap["updateNotificationSettings"] =
  (patch) => dispatch("updateNotificationSettings", patch);
export const updateUpdateSettings: SettingsActionMap["updateUpdateSettings"] = (
  patch,
) => dispatch("updateUpdateSettings", patch);
export const setWslDistro: SettingsActionMap["setWslDistro"] = (distro) =>
  dispatch("setWslDistro", distro);
export const updateBrowserSettings: SettingsActionMap["updateBrowserSettings"] =
  (patch) => dispatch("updateBrowserSettings", patch);

export async function setAgentHook(
  providerName: AgentName,
  enabled: boolean,
): Promise<ConfigureAgentHooksResult | UninstallAgentHooksResult> {
  return window.app.invokeSettingsAgentHook({ providerName, enabled });
}
