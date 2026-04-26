import { createTheme, type PaletteOptions } from "@mui/material/styles";
import {
  APP_PALETTES,
  type AppPalette,
  type AppPaletteCustom,
} from "./palettes";

declare module "@mui/material/styles" {
  interface Palette {
    custom: AppPaletteCustom;
  }
  interface PaletteOptions {
    custom?: Partial<AppPaletteCustom>;
  }
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

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data-mui-color-scheme" },
  defaultColorScheme: "dark",
  colorSchemes: {
    dark: { palette: paletteFromApp(APP_PALETTES.dark) },
    light: { palette: paletteFromApp(APP_PALETTES.light) },
  },
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
