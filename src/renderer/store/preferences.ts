import type { NotificationSettings } from "../../shared/types";
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
  setState({
    ...s,
    notificationSettings: { ...s.notificationSettings, ...settings },
  });
  commit();
}

export function setAgentHookEnabled(
  providerName: string,
  enabled: boolean,
): void {
  const s = getState();
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
