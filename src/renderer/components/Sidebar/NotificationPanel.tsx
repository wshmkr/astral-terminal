import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useMemo, useState } from "react";
import { VscBell } from "react-icons/vsc";
import {
  clearNotifications,
  dismissNotification,
  markNotificationRead,
  setActiveSurface,
  setActiveWorkspace,
  unreadCount,
  useWorkspaceStore,
} from "../../store";
import { CUSTOM_SCROLLBAR_SX } from "../../theme/scrollbar";
import { NotificationRow } from "./NotificationRow";

const BELL_BUTTON_SX = { color: "text.disabled" } as const;

const BADGE_SX = {
  "& .MuiBadge-badge": {
    height: 16,
    minWidth: 16,
    fontSize: "0.625rem",
    padding: 0,
  },
} as const;

const POPOVER_PAPER_SX = {
  width: 320,
  maxHeight: 400,
  bgcolor: "background.paper",
  backgroundImage: "none",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
} as const;

const POPOVER_SLOT_PROPS = { paper: { sx: POPOVER_PAPER_SX } } as const;

const HEADER_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  pl: 1.5,
  pr: 1,
  py: 1,
  borderBottom: "1px solid",
  borderColor: "custom.subtleDivider",
  flexShrink: 0,
} as const;

const CLEAR_ALL_SX = {
  color: "text.disabled",
  fontSize: "0.75rem",
  textTransform: "none",
  minWidth: "auto",
  p: "2px 6px",
  "&:hover": { color: "text.primary", bgcolor: "action.hover" },
} as const;

const LIST_SX = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  ...CUSTOM_SCROLLBAR_SX,
} as const;

const EMPTY_SX = { textAlign: "center", py: 4 } as const;

export function NotificationPanel() {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  const open = Boolean(anchorEl);

  const totalUnread = useMemo(
    () => workspaces.reduce((n, w) => n + unreadCount(w), 0),
    [workspaces],
  );
  const notifications = useMemo(
    () =>
      open
        ? workspaces
            .flatMap((w) => w.notifications)
            .sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [workspaces, open],
  );

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={BELL_BUTTON_SX}
        >
          <Badge badgeContent={totalUnread} color="error" sx={BADGE_SX}>
            <VscBell size={16} />
          </Badge>
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={POPOVER_SLOT_PROPS}
      >
        <Box sx={HEADER_SX}>
          <Typography variant="subtitle2" color="text.primary">
            Notifications
          </Typography>
          {notifications.length > 0 && (
            <Button
              size="small"
              onClick={() =>
                workspaces.forEach((w) => {
                  clearNotifications(w.id);
                })
              }
              sx={CLEAR_ALL_SX}
            >
              Clear All
            </Button>
          )}
        </Box>
        <Box sx={LIST_SX}>
          {notifications.length === 0 ? (
            <Typography variant="body2" color="text.disabled" sx={EMPTY_SX}>
              No Notifications
            </Typography>
          ) : (
            notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onSelect={(notif) => {
                  markNotificationRead(notif.workspaceId, notif.id);
                  setActiveWorkspace(notif.workspaceId);
                  setActiveSurface(notif.paneId, notif.surfaceId);
                  setAnchorEl(null);
                }}
                onDismiss={(notif) => {
                  dismissNotification(notif.workspaceId, notif.id);
                }}
              />
            ))
          )}
        </Box>
      </Popover>
    </>
  );
}
