import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VscBell } from "react-icons/vsc";
import { unreadCount, useWorkspaceStore } from "../../store";

const BELL_BUTTON_SX = { color: "text.disabled" } as const;

const BADGE_SX = {
  "& .MuiBadge-badge": {
    height: 16,
    minWidth: 16,
    fontSize: "0.625rem",
    padding: 0,
  },
} as const;

export function NotificationPanel() {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const wasOpenAtMouseDownRef = useRef(false);
  const [open, setOpen] = useState(false);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const totalUnread = useMemo(
    () => workspaces.reduce((n, w) => n + unreadCount(w), 0),
    [workspaces],
  );

  useEffect(
    () =>
      window.app.onNotificationPanelClosed(() => {
        setOpen(false);
      }),
    [],
  );

  const handleMouseDown = useCallback(() => {
    wasOpenAtMouseDownRef.current = open;
  }, [open]);

  const handleClick = useCallback(() => {
    if (wasOpenAtMouseDownRef.current) {
      wasOpenAtMouseDownRef.current = false;
      return;
    }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setOpen(true);
    window.app.openNotificationPanel({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  return (
    <Tooltip title={open ? "" : "Notifications"}>
      <IconButton
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        sx={BELL_BUTTON_SX}
      >
        <Badge badgeContent={totalUnread} color="primary" sx={BADGE_SX}>
          <VscBell size={16} />
        </Badge>
      </IconButton>
    </Tooltip>
  );
}
