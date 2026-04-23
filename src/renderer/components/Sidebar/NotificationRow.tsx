import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { VscClose } from "react-icons/vsc";
import type { Notification } from "../../../shared/types";
import { formatNotificationDisplay } from "../../store";
import { CloseButton } from "../ui/CloseButton";

const ROW_SX = {
  display: "flex",
  alignItems: "flex-start",
  gap: 1,
  p: "12px 16px",
  cursor: "pointer",
  userSelect: "none",
  borderColor: "custom.subtleDivider",
  "&:not(:last-child)": {
    borderBottom: "1px solid",
  },
  "&:hover": { bgcolor: "action.hover" },
  "&:hover .notif-dismiss": { opacity: 1 },
} as const;

const UNREAD_DOT_SX = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  bgcolor: "primary.main",
  flexShrink: 0,
} as const;

const TITLE_ROW_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.75,
} as const;

const NOTIF_TITLE_SX = { fontWeight: 500, color: "text.primary" } as const;
const NOTIF_BODY_SX = { display: "block", whiteSpace: "pre-line" } as const;
const NOTIF_TIME_SX = {
  display: "block",
  mt: 0.25,
  fontSize: "0.675rem",
} as const;
const DISMISS_SX = {
  opacity: 0,
  p: "2px",
  alignSelf: "center",
  flexShrink: 0,
} as const;

interface Props {
  notification: Notification;
  onSelect: (n: Notification) => void;
  onDismiss: (n: Notification) => void;
}

export function NotificationRow({ notification, onSelect, onDismiss }: Props) {
  const display = formatNotificationDisplay(notification);
  return (
    <Box onClick={() => onSelect(notification)} sx={ROW_SX}>
      <Box sx={{ flex: 1, minWidth: 0, opacity: notification.read ? 0.5 : 1 }}>
        <Box sx={TITLE_ROW_SX}>
          {!notification.read && <Box sx={UNREAD_DOT_SX} />}
          <Typography variant="body2" noWrap sx={NOTIF_TITLE_SX}>
            {display.title}
          </Typography>
        </Box>
        {display.body && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={NOTIF_BODY_SX}
          >
            {display.body}
          </Typography>
        )}
        <Typography variant="caption" color="text.disabled" sx={NOTIF_TIME_SX}>
          {formatTime(notification.timestamp)}
        </Typography>
      </Box>
      <CloseButton
        className="notif-dismiss"
        size="small"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification);
        }}
        sx={DISMISS_SX}
      >
        <VscClose size={18} />
      </CloseButton>
    </Box>
  );
}

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
}
