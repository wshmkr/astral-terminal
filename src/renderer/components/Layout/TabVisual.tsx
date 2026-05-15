import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { VscClose } from "react-icons/vsc";
import type { Surface } from "../../../shared/types";
import {
  TAB_CLOSE_SX,
  TAB_TITLE_SX,
  TAB_UNREAD_DOT_SX,
} from "./TabbedPane.styles";

interface TabItemSxProps {
  isActive: boolean;
  showDivider: boolean;
  activeBg: string;
  activeFg: string;
}

export function tabItemSx({
  isActive,
  showDivider,
  activeBg,
  activeFg,
}: TabItemSxProps) {
  return {
    display: "flex",
    alignItems: "center",
    minWidth: 80,
    maxWidth: 200,
    gap: 0.75,
    px: 1.25,
    py: 0.75,
    cursor: "pointer",
    borderRadius: "8px 8px 0 0",
    position: "relative",
    "&::after": showDivider
      ? {
          content: '""',
          position: "absolute",
          right: 0,
          top: "25%",
          height: "50%",
          width: "1px",
          backgroundColor: "custom.subtleDivider",
          transition: "opacity 0.15s",
        }
      : {},
    bgcolor: isActive ? activeBg : "transparent",
    color: isActive ? activeFg : "text.secondary",
    userSelect: "none",
    "&:hover": { bgcolor: isActive ? activeBg : "action.hover" },
    "&:hover .tab-close": { opacity: 1 },
    "&:hover::after": { opacity: 0 },
    "&:has(+ .tab-item:hover)::after": { opacity: 0 },
  } as const;
}

interface TabContentProps {
  surface: Surface;
  isActive: boolean;
  hasUnread: boolean;
  onClose?: (e: React.MouseEvent) => void;
}

export function TabContent({
  surface,
  isActive,
  hasUnread,
  onClose,
}: TabContentProps) {
  return (
    <>
      {hasUnread && <Box sx={TAB_UNREAD_DOT_SX} />}
      <Typography variant="body2" noWrap sx={TAB_TITLE_SX}>
        {surface.name}
      </Typography>
      {onClose && (
        <Box
          component="span"
          className="tab-close"
          onClick={onClose}
          sx={[TAB_CLOSE_SX, { opacity: isActive ? 1 : 0 }]}
        >
          <VscClose size={16} />
        </Box>
      )}
    </>
  );
}
