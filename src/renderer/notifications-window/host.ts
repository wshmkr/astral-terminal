import type {
  AppState,
  Notification,
  NotificationPanelAction,
  NotificationPanelActionMap,
  NotificationPanelItem,
  NotificationPanelState,
  Workspace,
} from "../../shared/types";
import {
  clearNotifications,
  dismissNotification,
  formatNotificationDisplay,
  getState,
  markNotificationRead,
  setActiveSurface,
  setActiveWorkspace,
  subscribeWorkspaceStore,
} from "../store";

function toPanelItem(n: Notification): NotificationPanelItem {
  const { title, body } = formatNotificationDisplay(n);
  return {
    id: n.id,
    workspaceId: n.workspaceId,
    paneId: n.paneId,
    surfaceId: n.surfaceId,
    read: n.read,
    timestamp: n.timestamp,
    title,
    body,
  };
}

function buildItems(workspaces: Workspace[]): NotificationPanelItem[] {
  return workspaces
    .flatMap((w) => w.notifications)
    .sort((a, b) => b.timestamp - a.timestamp)
    .map(toPanelItem);
}

function deriveNotificationPanelState(s: AppState): NotificationPanelState {
  return {
    appearance: s.appearance,
    items: buildItems(s.workspaces),
  };
}

const HANDLERS: NotificationPanelActionMap = {
  select: (workspaceId, paneId, surfaceId, notifId) => {
    markNotificationRead(workspaceId, notifId);
    setActiveWorkspace(workspaceId);
    setActiveSurface(paneId, surfaceId);
    window.app.closeNotificationPanel();
  },
  dismiss: (workspaceId, notifId) => {
    dismissNotification(workspaceId, notifId);
  },
  clearAll: () => {
    getState().workspaces.forEach((w) => {
      clearNotifications(w.id);
    });
    window.app.closeNotificationPanel();
  },
};

function applyAction(action: NotificationPanelAction): void {
  (HANDLERS[action.kind] as (...args: unknown[]) => void)(...action.args);
}

export function startNotificationsHost(): void {
  let lastAppearance = getState().appearance;
  let lastWorkspaces = getState().workspaces;
  window.app.publishNotificationPanelState(
    deriveNotificationPanelState(getState()),
  );

  subscribeWorkspaceStore(() => {
    const s = getState();
    if (s.appearance === lastAppearance && s.workspaces === lastWorkspaces) {
      return;
    }
    lastAppearance = s.appearance;
    lastWorkspaces = s.workspaces;
    window.app.publishNotificationPanelState(deriveNotificationPanelState(s));
  });

  window.app.onNotificationPanelAction((action) => {
    applyAction(action);
  });
}
