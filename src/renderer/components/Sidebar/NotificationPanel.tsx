import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VscBell } from "react-icons/vsc";
import type {
  Notification,
  NotificationPanelItem,
  Workspace,
} from "../../../shared/types";
import {
  clearNotifications,
  dismissNotification,
  formatNotificationDisplay,
  markNotificationRead,
  setActiveSurface,
  setActiveWorkspace,
  unreadCount,
  useWorkspaceStore,
} from "../../store";

const BELL_BUTTON_SX = { color: "text.disabled" } as const;

const BADGE_SX = {
  "& .MuiBadge-badge": {
    height: 16,
    minWidth: 16,
    fontSize: "0.625rem",
    padding: 0,
  },
} as const;

const REOPEN_GUARD_MS = 200;

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

export function NotificationPanel() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const lastClosedAtRef = useRef(0);
  const [open, setOpen] = useState(false);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const totalUnread = useMemo(
    () => workspaces.reduce((n, w) => n + unreadCount(w), 0),
    [workspaces],
  );

  const items = useMemo(
    () => (open ? buildItems(workspaces) : []),
    [open, workspaces],
  );

  useEffect(() => {
    if (open) window.app.setNotificationPanelItems(items);
  }, [open, items]);

  useEffect(
    () =>
      window.app.onNotificationPanelClosed(() => {
        lastClosedAtRef.current = Date.now();
        setOpen(false);
      }),
    [],
  );

  useEffect(
    () =>
      window.app.onNotificationPanelAction((action) => {
        if (action.kind === "select") {
          markNotificationRead(action.workspaceId, action.notifId);
          setActiveWorkspace(action.workspaceId);
          setActiveSurface(action.paneId, action.surfaceId);
          window.app.closeNotificationPanel();
        } else if (action.kind === "dismiss") {
          dismissNotification(action.workspaceId, action.notifId);
        } else {
          workspaces.forEach((w) => {
            clearNotifications(w.id);
          });
          window.app.closeNotificationPanel();
        }
      }),
    [workspaces],
  );

  const handleClick = useCallback(() => {
    if (Date.now() - lastClosedAtRef.current < REOPEN_GUARD_MS) return;
    if (open) {
      window.app.closeNotificationPanel();
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setOpen(true);
    window.app.openNotificationPanel(
      {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
      buildItems(workspaces),
    );
  }, [open, workspaces]);

  return (
    <Tooltip title={open ? "" : "Notifications"}>
      <IconButton ref={buttonRef} onClick={handleClick} sx={BELL_BUTTON_SX}>
        <Badge badgeContent={totalUnread} color="primary" sx={BADGE_SX}>
          <VscBell size={16} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
