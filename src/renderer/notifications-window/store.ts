import { useSyncExternalStore } from "react";
import type {
  NotificationPanelAction,
  NotificationPanelActionMap,
  NotificationPanelState,
} from "../../shared/types";

let state: NotificationPanelState | null = null;
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

function getStateOrNull(): NotificationPanelState | null {
  return state;
}

export function setNotificationStoreState(next: NotificationPanelState): void {
  state = next;
  notify();
}

export function useNotificationPanelState(): NotificationPanelState | null {
  return useSyncExternalStore(subscribeStore, getStateOrNull);
}

function dispatch<K extends NotificationPanelAction["kind"]>(
  kind: K,
  ...args: Parameters<NotificationPanelActionMap[K]>
): void {
  window.app.sendNotificationPanelAction({
    kind,
    args,
  } as NotificationPanelAction);
}

export const select: NotificationPanelActionMap["select"] = (
  workspaceId,
  paneId,
  surfaceId,
  notifId,
) => dispatch("select", workspaceId, paneId, surfaceId, notifId);
export const dismiss: NotificationPanelActionMap["dismiss"] = (
  workspaceId,
  notifId,
) => dispatch("dismiss", workspaceId, notifId);
export const clearAll: NotificationPanelActionMap["clearAll"] = () =>
  dispatch("clearAll");
