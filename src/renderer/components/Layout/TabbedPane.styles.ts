import { MIN_PANE_SIZE_PX } from "./layout-constants";

export const ROOT_SX = {
  width: "100%",
  height: "100%",
  minWidth: MIN_PANE_SIZE_PX,
  minHeight: MIN_PANE_SIZE_PX,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: 0,
} as const;

export const TAB_BAR_SX = {
  display: "flex",
  alignItems: "flex-end",
  bgcolor: "background.paper",
  minHeight: 40,
  overflow: "hidden",
} as const;

export const TAB_SCROLLER_SX = {
  display: "flex",
  flex: "1 1 0px",
  minWidth: 0,
  pl: 1,
  overflowX: "auto",
  overflowY: "hidden",
  alignItems: "flex-end",
  scrollbarWidth: "none",
  "&::-webkit-scrollbar": { display: "none" },
} as const;

export const TAB_ACTIONS_SX = {
  display: "flex",
  alignItems: "center",
  alignSelf: "stretch",
  gap: 0.25,
  px: 0.5,
  flexShrink: 0,
} as const;

export const SPLIT_BUTTON_SX = { color: "text.disabled" } as const;

export const ADD_TAB_BUTTON_SX = {
  mx: 0.5,
  flexShrink: 0,
  alignSelf: "center",
  color: "text.disabled",
} as const;

export const TAB_TITLE_SX = { flex: 1, fontSize: "13px" } as const;

export const TAB_CLOSE_SX = {
  display: "inline-flex",
  cursor: "pointer",
  borderRadius: 0.5,
  color: "inherit",
  "&:hover": { bgcolor: "error.main", color: "common.white" },
} as const;

export const SURFACE_BODY_SX = {
  flex: 1,
  overflow: "hidden",
  position: "relative",
} as const;

export const TAB_UNREAD_DOT_SX = {
  width: 6,
  height: 6,
  borderRadius: "50%",
  bgcolor: "primary.main",
  flexShrink: 0,
} as const;

const SURFACE_SLOT_BASE = { width: "100%", height: "100%" } as const;

export const SURFACE_SLOT_ACTIVE_SX = {
  ...SURFACE_SLOT_BASE,
  display: "flex",
} as const;

export const SURFACE_SLOT_HIDDEN_SX = {
  ...SURFACE_SLOT_BASE,
  display: "none",
} as const;
