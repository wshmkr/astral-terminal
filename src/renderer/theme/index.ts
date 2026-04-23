import { createTheme, type PaletteOptions } from "@mui/material/styles";
import {
  type AppPalette,
  type AppPaletteCustom,
  DARK_PALETTE,
} from "./palettes";

declare module "@mui/material/styles" {
  interface Palette {
    custom: AppPaletteCustom;
  }
  interface PaletteOptions {
    custom?: Partial<AppPaletteCustom>;
  }
}

export function buildAppTheme(schemes: Record<string, AppPalette>) {
  const colorSchemes = Object.fromEntries(
    Object.entries(schemes).map(([name, p]) => [
      name,
      { palette: paletteFromApp(p) },
    ]),
  );
  return createTheme({
    cssVariables: true,
    defaultColorScheme: "dark",
    colorSchemes,
    typography: {
      fontFamily: "'Segoe UI Variable', 'Segoe UI', system-ui, sans-serif",
    },
    components: {
      MuiIconButton: {
        styleOverrides: {
          root: { borderRadius: 4 },
        },
      },
    },
  });
}

function paletteFromApp(p: AppPalette): PaletteOptions {
  return {
    background: { default: p.bgDefault, paper: p.bgPaper },
    text: {
      primary: p.textPrimary,
      secondary: p.textSecondary,
      disabled: p.textDisabled,
    },
    divider: p.divider,
    primary: { main: p.primary },
    error: { main: p.error },
    action: { hover: p.actionHover, selected: p.actionSelected },
    custom: p.custom,
  };
}

export const theme = buildAppTheme({ dark: DARK_PALETTE });
