import type { AgentName } from "../../shared/agent-hooks";
import type {
  ConfigureAgentHooksResult,
  NotificationSettings,
  UninstallAgentHooksResult,
} from "../../shared/types";
import {
  SIDEBAR_MAX_WIDTH_PX,
  SIDEBAR_MIN_WIDTH_PX,
} from "../components/Layout/layout-constants";
import { commit, getState, notify, setState } from "./core";

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: false,
  osNotificationsEnabled: false,
  agentHooks: {},
};

export function clampSidebarWidth(
  width: number,
  viewportWidth: number,
): number {
  const maxWidth = Math.min(
    SIDEBAR_MAX_WIDTH_PX,
    Math.floor(viewportWidth / 2),
  );
  return Math.max(SIDEBAR_MIN_WIDTH_PX, Math.min(width, maxWidth));
}

export function setSidebarWidth(width: number): void {
  const s = getState();
  const next = clampSidebarWidth(width, window.innerWidth);
  if (s.sidebarWidth === next) return;
  setState({ ...s, sidebarWidth: next });
  commit();
}

export function updateNotificationSettings(
  settings: Partial<NotificationSettings>,
): void {
  const s = getState();
  const current = s.notificationSettings;
  const changed = (
    Object.keys(settings) as (keyof NotificationSettings)[]
  ).some((k) => settings[k] !== current[k]);
  if (!changed) return;
  setState({
    ...s,
    notificationSettings: { ...current, ...settings },
  });
  commit();
}

export async function setAgentHook(
  providerName: AgentName,
  enabled: boolean,
): Promise<ConfigureAgentHooksResult | UninstallAgentHooksResult> {
  const result = enabled
    ? await window.app.configureAgentHooks({ providerName })
    : await window.app.uninstallAgentHooks({ providerName });
  if (result.status === "error") return result;
  const s = getState();
  if (s.notificationSettings.agentHooks[providerName] === enabled)
    return result;
  setState({
    ...s,
    notificationSettings: {
      ...s.notificationSettings,
      agentHooks: {
        ...s.notificationSettings.agentHooks,
        [providerName]: enabled,
      },
    },
  });
  commit();
  return result;
}

export function setWindowFocused(focused: boolean): void {
  const s = getState();
  if (s.windowFocused === focused) return;
  setState({ ...s, windowFocused: focused });
  notify();
}

export function setSettingsOpen(open: boolean): void {
  const s = getState();
  if (s.settingsOpen === open) return;
  setState({ ...s, settingsOpen: open });
  notify();
}

export function setWelcomeOpen(open: boolean): void {
  const s = getState();
  if (s.welcomeOpen === open) return;
  setState({ ...s, welcomeOpen: open });
  notify();
}

export function dismissWelcome(): void {
  const s = getState();
  if (!s.welcomeOpen) return;
  setState({ ...s, welcomeOpen: false });
  commit();
}
