import type { TerminalTheme, TerminalThemeId } from "../../shared/types";

export const ONE_DARK: TerminalTheme = {
  background: "#282c34",
  foreground: "#dcdfe4",
  cursor: "#dcdfe4",
  cursorAccent: "#282c34",
  selectionBackground: "#264f78",
  selectionForeground: "#ffffff",
  black: "#282c34",
  red: "#e06c75",
  green: "#98c379",
  yellow: "#e5c07b",
  blue: "#61afef",
  magenta: "#c678dd",
  cyan: "#56b6c2",
  white: "#dcdfe4",
  brightBlack: "#5a6374",
  brightRed: "#e06c75",
  brightGreen: "#98c379",
  brightYellow: "#e5c07b",
  brightBlue: "#61afef",
  brightMagenta: "#c678dd",
  brightCyan: "#56b6c2",
  brightWhite: "#dcdfe4",
  searchHighlight: "#e5c07b",
};

export const ONE_LIGHT: TerminalTheme = {
  background: "#fafafa",
  foreground: "#383a42",
  cursor: "#383a42",
  cursorAccent: "#fafafa",
  selectionBackground: "#b3d4fc",
  selectionForeground: "#000000",
  black: "#383a42",
  red: "#e45649",
  green: "#50a14f",
  yellow: "#c18401",
  blue: "#0184bc",
  magenta: "#a626a4",
  cyan: "#0997b3",
  white: "#fafafa",
  brightBlack: "#a0a1a7",
  brightRed: "#e45649",
  brightGreen: "#50a14f",
  brightYellow: "#c18401",
  brightBlue: "#0184bc",
  brightMagenta: "#a626a4",
  brightCyan: "#0997b3",
  brightWhite: "#fafafa",
  searchHighlight: "#c18401",
};

export const TERMINAL_THEMES: Record<TerminalThemeId, TerminalTheme> = {
  "one-dark": ONE_DARK,
  "one-light": ONE_LIGHT,
};

export const TERMINAL_THEME_OPTIONS: Array<{
  id: TerminalThemeId;
  label: string;
}> = [
  { id: "one-dark", label: "One Dark" },
  { id: "one-light", label: "One Light" },
];
