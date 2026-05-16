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
  flex: "0 0 auto",
} as const;

import { alpha } from "@mui/material/styles";

export const navButtonSx = (fg: string) =>
  ({
    width: 28,
    height: 28,
    borderRadius: 1,
    color: fg,
    "&:hover": { bgcolor: alpha(fg, 0.12) },
    "&.Mui-disabled": { color: fg, opacity: 0.4 },
  }) as const;

export const urlInputSx = (fg: string) =>
  ({
    flex: 1,
    bgcolor: alpha(fg, 0.1),
    borderRadius: 1.5,
    px: 1.25,
    py: 0.25,
    fontSize: 13,
    color: fg,
    "& input": {
      p: 0,
      height: 24,
    },
    "&:focus-within": { bgcolor: alpha(fg, 0.16) },
  }) as const;

export const ANCHOR_SX = {
  flex: 1,
  minHeight: 0,
} as const;
