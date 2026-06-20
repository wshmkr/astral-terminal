export const ROOT_SX = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  border: 0,
  position: "relative",
} as const;

const PANE_OVERLAY_BASE = {
  content: '""',
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  zIndex: 1,
} as const;

export const ATTENTION_OUTLINE_SX = {
  "&::after": {
    ...PANE_OVERLAY_BASE,
    border: "1px solid",
    borderColor: "primary.main",
  },
} as const;

export const DROP_TARGET_OVERLAY_SX = {
  "&::after": {
    ...PANE_OVERLAY_BASE,
    bgcolor: "primary.main",
    opacity: 0.1,
  },
} as const;

export const SPLIT_ZONES_CONTAINER_SX = {
  position: "absolute",
  inset: 0,
  zIndex: 10,
  pointerEvents: "none",
} as const;

const SPLIT_ZONE_PREVIEW_BASE = {
  position: "absolute",
  bgcolor: "primary.main",
  opacity: 0.25,
  border: "1px solid",
  borderColor: "primary.main",
  pointerEvents: "none",
} as const;

// Edge bands are the drop targets; previews show the half the new pane will
// occupy. Each band spans its full edge (33% deep), so they overlap in the
// bottom-right corner. That overlap is resolved by the pointerWithin collision
// detection in AppDndContext, which picks the band whose center is nearer —
// i.e. the nearer edge — splitting the corner along the diagonal.
export const SPLIT_ZONE_GEOMETRY = {
  right: {
    band: { position: "absolute", top: 0, right: 0, bottom: 0, width: "33%" },
    preview: {
      ...SPLIT_ZONE_PREVIEW_BASE,
      top: 0,
      right: 0,
      bottom: 0,
      width: "50%",
    },
  },
  bottom: {
    band: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "33%",
    },
    preview: {
      ...SPLIT_ZONE_PREVIEW_BASE,
      left: 0,
      right: 0,
      bottom: 0,
      height: "50%",
    },
  },
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
  flex: "0 1 auto",
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

export const TAB_END_DROPZONE_SX = {
  display: "flex",
  flex: "1 0 auto",
  alignItems: "center",
  alignSelf: "stretch",
  justifyContent: "flex-end",
} as const;

export const TAB_OVERLAY_SX = {
  boxShadow: 4,
  cursor: "grabbing",
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
  "&.Mui-focusVisible": {
    opacity: 1,
    bgcolor: "error.main",
    color: "common.white",
  },
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

export const TAB_ICON_SX = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  height: 14,
  flexShrink: 0,
  color: "text.secondary",
} as const;

export const TAB_ICON_IMG_SX = {
  display: "block",
  width: 14,
  height: 14,
  objectFit: "contain",
  flexShrink: 0,
} as const;
