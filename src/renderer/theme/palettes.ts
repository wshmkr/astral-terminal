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
  bgDefault: "#262624",
  bgPaper: "#1f1e1d",
  textPrimary: "#faf9f5",
  textSecondary: "#d4d2c9",
  textDisabled: "#9d9b91",
  divider: "#3a3937",
  primary: "#0078d4",
  error: "#c42b1c",
  actionHover: "rgba(250,249,245,0.06)",
  actionSelected: "rgba(250,249,245,0.10)",
  custom: {
    subtleDivider: "rgba(250,249,245,0.10)",
    resizeHandleIdle: "rgba(250,249,245,0.05)",
    resizeHandleHover: "rgba(250,249,245,0.15)",
    scrollbarThumb: "rgb(96,94,89)",
    scrollbarThumbHover: "rgb(120,117,110)",
    titlebarFocused: "#1a1918",
    titlebarButtonHover: "rgba(250,249,245,0.06)",
  },
};

export const LIGHT_PALETTE: AppPalette = {
  bgDefault: "#ffffff",
  bgPaper: "#f7f6f1",
  textPrimary: "#1f1e1d",
  textSecondary: "#3d3c37",
  textDisabled: "#807e76",
  divider: "#ececea",
  primary: "#0078d4",
  error: "#c42b1c",
  actionHover: "rgba(31,30,29,0.04)",
  actionSelected: "rgba(31,30,29,0.08)",
  custom: {
    subtleDivider: "rgba(31,30,29,0.08)",
    resizeHandleIdle: "rgba(31,30,29,0.04)",
    resizeHandleHover: "rgba(31,30,29,0.14)",
    scrollbarThumb: "rgb(198,195,188)",
    scrollbarThumbHover: "rgb(170,166,158)",
    titlebarFocused: "#f7f6f1",
    titlebarButtonHover: "rgba(31,30,29,0.04)",
  },
};

export const BLACK_PALETTE: AppPalette = {
  bgDefault: "#000000",
  bgPaper: "#0a0a0a",
  textPrimary: "#f2f2f2",
  textSecondary: "#cccccc",
  textDisabled: "#9a9a9a",
  divider: "#1a1a1a",
  primary: "#0078d4",
  error: "#c42b1c",
  actionHover: "rgba(255,255,255,0.06)",
  actionSelected: "rgba(255,255,255,0.10)",
  custom: {
    subtleDivider: "rgba(255,255,255,0.08)",
    resizeHandleIdle: "rgba(255,255,255,0.04)",
    resizeHandleHover: "rgba(255,255,255,0.18)",
    scrollbarThumb: "rgb(60,60,60)",
    scrollbarThumbHover: "rgb(90,90,90)",
    titlebarFocused: "#000000",
    titlebarButtonHover: "rgba(255,255,255,0.08)",
  },
};

export const APP_PALETTES: Record<AppThemeId, AppPalette> = {
  dark: DARK_PALETTE,
  light: LIGHT_PALETTE,
  black: BLACK_PALETTE,
};

export function withAccent(palette: AppPalette, accentHex: string): AppPalette {
  return { ...palette, primary: accentHex };
}

export const APP_THEME_OPTIONS: Array<{ value: AppThemeId; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "black", label: "Black" },
];
