import type { AppThemeId } from "../../shared/types";

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
  bgDefault: "#282c34",
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

export const LIGHT_PALETTE: AppPalette = {
  bgDefault: "#ffffff",
  bgPaper: "#f3f3f3",
  textPrimary: "#1f1f1f",
  textSecondary: "#424242",
  textDisabled: "#8e8e8e",
  divider: "#e5e5e5",
  primary: "#0078d4",
  error: "#c42b1c",
  actionHover: "rgba(0,0,0,0.04)",
  actionSelected: "rgba(0,0,0,0.08)",
  custom: {
    subtleDivider: "rgba(0,0,0,0.1)",
    resizeHandleIdle: "rgba(0,0,0,0.05)",
    resizeHandleHover: "rgba(0,0,0,0.15)",
    scrollbarThumb: "rgb(193,193,193)",
    scrollbarThumbHover: "rgb(168,168,168)",
    titlebarFocused: "#f8f8f8",
    titlebarButtonHover: "rgba(0,0,0,0.04)",
  },
};

export const APP_PALETTES: Record<AppThemeId, AppPalette> = {
  dark: DARK_PALETTE,
  light: LIGHT_PALETTE,
};

export const APP_THEME_OPTIONS: Array<{ id: AppThemeId; label: string }> = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];
