import { DEFAULT_TERMINAL_BG } from "../../shared/types";

export interface AppPaletteCustom {
  subtleDivider: string;
  resizeHandleIdle: string;
  resizeHandleHover: string;
  scrollbarThumb: string;
  scrollbarThumbHover: string;
  titlebarFocused: string;
  titlebarButtonHover: string;
}

export interface AppPalette {
  bgDefault: string;
  bgPaper: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  divider: string;
  primary: string;
  error: string;
  actionHover: string;
  actionSelected: string;
  custom: AppPaletteCustom;
}

export const DARK_PALETTE: AppPalette = {
  bgDefault: DEFAULT_TERMINAL_BG,
  bgPaper: "#2d2d2d",
  textPrimary: "#f2f2f2",
  textSecondary: "#cccccc",
  textDisabled: "#888888",
  divider: "#404040",
  primary: "#0078d4",
  error: "#c42b1c",
  actionHover: "rgba(255,255,255,0.06)",
  actionSelected: "rgba(255,255,255,0.09)",
  custom: {
    subtleDivider: "rgba(255,255,255,0.1)",
    resizeHandleIdle: "rgba(255,255,255,0.05)",
    resizeHandleHover: "rgba(255,255,255,0.15)",
    scrollbarThumb: "rgb(100,100,100)",
    scrollbarThumbHover: "rgb(121,121,121)",
    titlebarFocused: "#252525",
    titlebarButtonHover: "rgba(255,255,255,0.06)",
  },
};
