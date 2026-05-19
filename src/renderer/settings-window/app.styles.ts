import { TITLE_BAR_HEIGHT } from "../components/ui/TitleBarButton";
import { CUSTOM_SCROLLBAR_SX } from "../theme/scrollbar";

export const ROOT_SX = {
  width: "100vw",
  height: "100vh",
  bgcolor: "background.paper",
  backgroundImage: "none",
  border: "1px solid",
  borderColor: "divider",
  borderRadius: 2,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  userSelect: "none",
  "& input, & textarea": { userSelect: "auto" },
} as const;

export const HEADER_SX = {
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  height: TITLE_BAR_HEIGHT,
  bgcolor: "custom.titlebarFocused",
  borderBottom: 1,
  borderColor: "divider",
  userSelect: "none",
  flexShrink: 0,
} as const;

export const HEADER_TITLE_SX = {
  position: "absolute",
  left: 0,
  right: 0,
  textAlign: "center",
  fontSize: "11pt",
  fontWeight: 600,
  color: "text.secondary",
  pointerEvents: "none",
} as const;

export const BODY_SX = {
  display: "flex",
  flex: 1,
  minHeight: 0,
} as const;

export const NAV_SX = {
  width: 180,
  flexShrink: 0,
  borderRight: "1px solid",
  borderColor: "custom.subtleDivider",
  display: "flex",
  flexDirection: "column",
} as const;

export const NAV_LIST_SX = {
  flex: 1,
  minHeight: 0,
} as const;

export const VERSION_SX = {
  px: 2,
  py: 1,
  display: "flex",
  alignItems: "center",
  gap: 0.75,
} as const;

export const VERSION_TEXT_SX = {
  fontSize: "10px",
  cursor: "pointer",
} as const;

export const UPDATE_BADGE_SX = {
  height: "auto",
  bgcolor: "primary.main",
  color: "primary.contrastText",
  borderRadius: 0.5,
  "& .MuiChip-label": {
    px: 0.625,
    py: 0.125,
    fontSize: "9px",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  "&.MuiChip-clickable:hover": { bgcolor: "primary.dark" },
} as const;

export const NAV_ITEM_SX = {
  py: 1,
  px: 2.5,
  borderRadius: 0,
  "&.Mui-selected": {
    bgcolor: "action.selected",
    "& .MuiListItemText-primary": { fontWeight: 600 },
    "&:hover": { bgcolor: "action.selected" },
  },
} as const;

export const CONTENT_SX = {
  flex: 1,
  p: 2,
  overflowY: "auto",
  ...CUSTOM_SCROLLBAR_SX,
} as const;
