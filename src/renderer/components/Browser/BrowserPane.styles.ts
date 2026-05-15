export const ROOT_SX = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
} as const;

export const TOOLBAR_SX = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  px: 0.75,
  py: 0.5,
  borderBottom: "1px solid",
  borderColor: "divider",
  flex: "0 0 auto",
} as const;

export const NAV_BUTTON_SX = {
  width: 28,
  height: 28,
  borderRadius: 1,
} as const;

export const URL_INPUT_SX = {
  flex: 1,
  bgcolor: "action.hover",
  borderRadius: 1.5,
  px: 1.25,
  py: 0.25,
  fontSize: 13,
  color: "text.primary",
  "& input": {
    p: 0,
    height: 24,
  },
  "&:focus-within": {
    bgcolor: "action.selected",
  },
} as const;

export const ANCHOR_SX = {
  flex: 1,
  minHeight: 0,
} as const;
