import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { VscClose } from "react-icons/vsc";
import type { NotificationPanelItem } from "../../../shared/types";
import { CUSTOM_SCROLLBAR_SX } from "../../theme/scrollbar";
import { CloseButton } from "../ui/CloseButton";

const ROOT_SX = {
  width: "100%",
  height: "100%",
  bgcolor: "background.paper",
  backgroundImage: "none",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: 8,
} as const;

const HEADER_SX = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  pl: 2,
  pr: 1,
  py: 1,
  borderBottom: "1px solid",
  borderColor: "divider",
  flexShrink: 0,
  userSelect: "none",
} as const;

const HEADER_ACTIONS_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
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

const EMPTY_SX = { textAlign: "center", py: 4, userSelect: "none" } as const;

const ROW_SX = {
  display: "flex",
  alignItems: "flex-start",
  gap: 1,
  p: "12px 16px",
  cursor: "pointer",
  userSelect: "none",
  "&:not(:last-child)": {
    borderBottom: "1px solid",
    borderColor: "divider",
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

const TITLE_SX = { fontWeight: 500, color: "text.primary" } as const;
const BODY_SX = { display: "block", whiteSpace: "pre-line" } as const;
const TIME_SX = { display: "block", mt: 0.25, fontSize: "0.675rem" } as const;
const DISMISS_SX = {
  opacity: 0,
  p: "2px",
  alignSelf: "center",
  flexShrink: 0,
} as const;

interface Props {
  items: NotificationPanelItem[];
  onSelect: (item: NotificationPanelItem) => void;
  onDismiss: (item: NotificationPanelItem) => void;
  onClearAll: () => void;
  onClose: () => void;
}

export function NotificationPanelBody({
  items,
  onSelect,
  onDismiss,
  onClearAll,
  onClose,
}: Props) {
  return (
    <Box sx={ROOT_SX}>
      <Box sx={HEADER_SX}>
        <Typography variant="subtitle2" color="text.primary">
          Notifications
        </Typography>
        <Box sx={HEADER_ACTIONS_SX}>
          {items.length > 0 && (
            <Button size="small" onClick={onClearAll} sx={CLEAR_ALL_SX}>
              Clear All
            </Button>
          )}
          <CloseButton size="small" onClick={onClose}>
            <VscClose size={18} />
          </CloseButton>
        </Box>
      </Box>
      <Box sx={LIST_SX}>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={EMPTY_SX}>
            No notifications.
          </Typography>
        ) : (
          items.map((n) => (
            <Box key={n.id} onClick={() => onSelect(n)} sx={ROW_SX}>
              <Box sx={{ flex: 1, minWidth: 0, opacity: n.read ? 0.5 : 1 }}>
                <Box sx={TITLE_ROW_SX}>
                  {!n.read && <Box sx={UNREAD_DOT_SX} />}
                  <Typography variant="body2" noWrap sx={TITLE_SX}>
                    {n.title}
                  </Typography>
                </Box>
                {n.body && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={BODY_SX}
                  >
                    {n.body}
                  </Typography>
                )}
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={TIME_SX}
                >
                  {formatTime(n.timestamp)}
                </Typography>
              </Box>
              <CloseButton
                className="notif-dismiss"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(n);
                }}
                sx={DISMISS_SX}
              >
                <VscClose size={18} />
              </CloseButton>
            </Box>
          ))
        )}
      </Box>
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
