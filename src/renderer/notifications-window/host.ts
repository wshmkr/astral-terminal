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

let itemsCacheKey: Workspace[] | null = null;
let itemsCache: NotificationPanelItem[] = [];

function deriveNotificationPanelState(s: AppState): NotificationPanelState {
  if (itemsCacheKey !== s.workspaces) {
    itemsCacheKey = s.workspaces;
    itemsCache = buildItems(s.workspaces);
  }
  return {
    appearance: s.appearance,
    items: itemsCache,
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
  let last = deriveNotificationPanelState(getState());
  let isOpen = false;

  function publish(): void {
    last = deriveNotificationPanelState(getState());
    window.app.publishNotificationPanelState(last);
  }

  window.app.onNotificationPanelOpened(() => {
    isOpen = true;
    publish();
  });

  window.app.onNotificationPanelClosed(() => {
    isOpen = false;
  });

  subscribeWorkspaceStore(() => {
    if (!isOpen) return;
    const next = deriveNotificationPanelState(getState());
    if (next.appearance === last.appearance && next.items === last.items) {
      return;
    }
    last = next;
    window.app.publishNotificationPanelState(next);
  });

  window.app.onNotificationPanelAction((action) => {
    applyAction(action);
  });
}
