import type { AgentHookStatus, AgentName } from "../../shared/agent-hooks";
import type {
  NotificationSettings,
  TerminalSettings,
  UpdateSettings,
} from "../../shared/settings-types";
import type {
  ConfigureAgentHooksResult,
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
};

export const DEFAULT_UPDATE_SETTINGS: UpdateSettings = {
  autoEnabled: true,
};

export const DEFAULT_TERMINAL_SETTINGS: TerminalSettings = {
  wslDistro: null,
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

export function setWslDistro(distro: string | null): void {
  const s = getState();
  if (s.terminalSettings.wslDistro === distro) return;
  setState({
    ...s,
    terminalSettings: { ...s.terminalSettings, wslDistro: distro },
  });
  commit();
}

export function updateUpdateSettings(settings: Partial<UpdateSettings>): void {
  const s = getState();
  const current = s.updateSettings;
  const changed = (Object.keys(settings) as (keyof UpdateSettings)[]).some(
    (k) => settings[k] !== current[k],
  );
  if (!changed) return;
  setState({
    ...s,
    updateSettings: { ...current, ...settings },
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
  setAgentHookStatuses({ [providerName]: enabled ? "installed" : "missing" });
  return result;
}

export function setAgentHookStatuses(
  statuses: Partial<Record<AgentName, AgentHookStatus>>,
): void {
  const s = getState();
  const entries = Object.entries(statuses) as [AgentName, AgentHookStatus][];
  const changed = entries.some(([k, v]) => s.agentHookStatuses[k] !== v);
  if (!changed) return;
  setState({
    ...s,
    agentHookStatuses: { ...s.agentHookStatuses, ...statuses },
  });
  notify();
}

export function setWindowFocused(focused: boolean): void {
  const s = getState();
  if (s.windowFocused === focused) return;
  setState({ ...s, windowFocused: focused });
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
