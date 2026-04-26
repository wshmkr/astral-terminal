import {
  isTerminalSurface,
  type Notification,
  type Workspace,
} from "../../shared/types";
import { findLeafPane, forEachLeaf } from "../components/Layout/pane-tree";
import { getState, getWorkspace, notify, setState } from "./core";
import { generateId } from "./factories";

export interface NotificationDisplay {
  title: string;
  body: string;
}

export function formatNotificationDisplay(
  notif: Notification,
): NotificationDisplay {
  const ws = getWorkspace(notif.workspaceId);
  const title = ws ? `${ws.name} · ${notif.title}` : notif.title;

  let surfaceName: string | undefined;
  if (ws) {
    forEachLeaf(ws.layout, (leaf) => {
      const s = leaf.surfaces.find((x) => x.id === notif.surfaceId);
      if (s && isTerminalSurface(s)) surfaceName = s.name;
    });
  }

  const lines: string[] = [];
  if (surfaceName) lines.push(surfaceName);
  if (notif.body) lines.push(notif.body);
  const body = lines.join("\n");

  return { title, body };
}

const NOTIF_DEDUP_WINDOW_MS = 5000;
const MAX_NOTIFICATIONS_PER_WORKSPACE = 50;

const notificationListeners = new Set<(notif: Notification) => void>();

export function onNotificationAdded(
  fn: (notif: Notification) => void,
): () => void {
  notificationListeners.add(fn);
  return () => {
    notificationListeners.delete(fn);
  };
}

function writeNotifications(
  workspaceId: string,
  fn: (notifs: Notification[]) => Notification[],
): boolean {
  const ws = getWorkspace(workspaceId);
  if (!ws) return false;
  const notifications = fn(ws.notifications);
  if (notifications === ws.notifications) return false;
  const s = getState();
  setState({
    ...s,
    workspaces: s.workspaces.map((w) =>
      w.id === workspaceId ? { ...w, notifications } : w,
    ),
  });
  return true;
}

export function unreadCount(ws: Workspace): number {
  return ws.notifications.filter((n) => !n.read).length;
}

export function unreadSurfaceIds(
  notifications: Notification[] | null | undefined,
): Set<string> {
  const set = new Set<string>();
  notifications?.forEach((n) => {
    if (!n.read) set.add(n.surfaceId);
  });
  return set;
}

function isUserActivelyViewing(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
): boolean {
  const s = getState();
  if (s.activeWorkspaceId !== workspaceId) return false;
  if (s.focusedPaneId !== paneId) return false;
  const ws = s.workspaces.find((w) => w.id === workspaceId);
  if (!ws) return false;
  const leaf = findLeafPane(ws.layout, paneId);
  return leaf?.activeSurfaceId === surfaceId;
}

export function addNotification(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
  title: string,
  body?: string,
): Notification | null {
  if (isUserActivelyViewing(workspaceId, paneId, surfaceId)) return null;
  const now = Date.now();
  let notif: Notification | null = null;
  const changed = writeNotifications(workspaceId, (notifs) => {
    const isDuplicate = notifs.some(
      (n) =>
        n.surfaceId === surfaceId &&
        n.title === title &&
        n.body === body &&
        now - n.timestamp < NOTIF_DEDUP_WINDOW_MS,
    );
    if (isDuplicate) return notifs;
    notif = {
      id: generateId(),
      workspaceId,
      paneId,
      surfaceId,
      title,
      body,
      timestamp: now,
      read: false,
    };
    return [notif, ...notifs].slice(0, MAX_NOTIFICATIONS_PER_WORKSPACE);
  });
  if (!changed || !notif) return null;
  const added = notif;
  notify();
  notificationListeners.forEach((fn) => {
    fn(added);
  });
  return added;
}

export function markNotificationRead(
  workspaceId: string,
  notifId: string,
): void {
  const changed = writeNotifications(workspaceId, (notifs) => {
    const target = notifs.find((n) => n.id === notifId);
    if (!target || target.read) return notifs;
    return notifs.map((n) => (n.id === notifId ? { ...n, read: true } : n));
  });
  if (changed) notify();
}

export function markSurfaceNotificationsRead(
  workspaceId: string,
  surfaceId: string,
): boolean {
  return writeNotifications(workspaceId, (notifs) => {
    if (!notifs.some((n) => n.surfaceId === surfaceId && !n.read))
      return notifs;
    return notifs.map((n) =>
      n.surfaceId === surfaceId && !n.read ? { ...n, read: true } : n,
    );
  });
}

export function dismissNotification(
  workspaceId: string,
  notifId: string,
): void {
  const changed = writeNotifications(workspaceId, (notifs) =>
    notifs.some((n) => n.id === notifId)
      ? notifs.filter((n) => n.id !== notifId)
      : notifs,
  );
  if (changed) notify();
}

export function clearNotifications(workspaceId: string): void {
  const changed = writeNotifications(workspaceId, (notifs) =>
    notifs.length === 0 ? notifs : [],
  );
  if (changed) notify();
}
