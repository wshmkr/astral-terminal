import type { TerminalTheme, TerminalThemeId } from "../../shared/types";

export const ONE_HALF_DARK: TerminalTheme = {
  background: "#282c34",
  foreground: "#dcdfe4",
  cursor: "#a3b8ef",
  cursorAccent: "#282c34",
  selectionBackground: "#474e5c",
  selectionForeground: "#dcdfe4",
  black: "#282c34",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#dcdfe4",
  brightBlack: "#282c34",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#dcdfe4",
  searchHighlight: "#e5c07b",
};

export const ONE_HALF_LIGHT: TerminalTheme = {
  background: "#fafafa",
  foreground: "#383c47",
  cursor: "#bfd7ff",
  cursorAccent: "#fafafa",
  selectionBackground: "#bfceea",
  selectionForeground: "#383c47",
  black: "#383c47",
  red: "#e45649",
  green: "#50a14f",
  yellow: "#c18401",
  blue: "#0184bc",
  magenta: "#a626a4",
  cyan: "#0997b3",
  white: "#fafafa",
  brightBlack: "#4f525d",
  brightRed: "#df6c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#ffffff",
  searchHighlight: "#c18401",
};

export const TERMINAL_THEMES: Record<TerminalThemeId, TerminalTheme> = {
  "one-half-dark": ONE_HALF_DARK,
  "one-half-light": ONE_HALF_LIGHT,
};

export const TERMINAL_THEME_OPTIONS: Array<{
  id: TerminalThemeId;
  label: string;
}> = [
  { id: "one-half-dark", label: "One Half Dark" },
  { id: "one-half-light", label: "One Half Light" },
];
