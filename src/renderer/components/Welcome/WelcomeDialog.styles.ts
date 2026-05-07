import { MONO_FONT_STACK } from "../../theme/fonts";
import { DARK_PALETTE } from "../../theme/palettes";
import { TITLE_BAR_HEIGHT } from "../ui/TitleBar";

export const DIALOG_SX = {
  top: TITLE_BAR_HEIGHT,
} as const;

export const BACKDROP_SX = {
  top: TITLE_BAR_HEIGHT,
} as const;

export const PAPER_SX = {
  alignItems: "center",
  justifyContent: "center",
  userSelect: "none",
  overflow: "auto",
  bgcolor: DARK_PALETTE.bgPaper,
  backgroundImage: "none",
  p: 4,
} as const;

export const CONTENT_STACK_SX = {
  width: "100%",
  maxWidth: 900,
  flexShrink: 0,
} as const;

export const HEADER_TITLE_SX = {
  mb: 0.5,
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "-0.02em",
} as const;

export const HEADER_BRAND_SX = { color: "primary.main" } as const;
export const SUBTITLE_SX = { color: "text.secondary" } as const;

const SUBHEAD_BASE_SX = {
  fontFamily: MONO_FONT_STACK,
  fontWeight: 700,
  letterSpacing: "0.08em",
  fontSize: 13,
} as const;
export const SUBHEAD_LABEL_SX = {
  ...SUBHEAD_BASE_SX,
  textTransform: "uppercase",
  color: "text.primary",
} as const;
export const SUBHEAD_INDEX_SX = {
  ...SUBHEAD_BASE_SX,
  color: "primary.main",
} as const;
export const SUBHEAD_HELP_ICON_SX = {
  display: "inline-flex",
  alignSelf: "center",
  color: "text.disabled",
  cursor: "help",
} as const;
export const SECTION_BODY_SX = { pl: 3.25 } as const;

export const PREVIEW_COL_SX = {
  flex: "0 0 480px",
  aspectRatio: "4 / 3",
  alignSelf: "center",
} as const;

export const CHECKBOX_SX = { p: 0.5 } as const;

export const ALERT_SX = {
  py: 0,
  textWrap: "balance",
  alignItems: "center",
  "& .MuiAlert-message": { py: 0.5, fontSize: 12, lineHeight: 1.4 },
  "& .MuiAlert-icon": { mr: 1, py: 0.5 },
} as const;

export const BUTTON_SX = {
  py: 1.5,
  fontSize: 16,
  fontFamily: MONO_FONT_STACK,
  letterSpacing: "0.05em",
} as const;
