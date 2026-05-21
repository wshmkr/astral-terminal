import type { Workspace } from "./types";

export type AppThemeId = "dark" | "light" | "black";
export type TerminalThemeId =
  | "one-half-dark"
  | "one-half-light"
  | "dracula"
  | "alucard"
  | "github-dark"
  | "github-light";
export type FontFamilyId =
  | "jetbrains-mono"
  | "cascadia-code"
  | "consolas"
  | "system-monospace";
export type AccentColorId =
  | "blue"
  | "purple"
  | "pink"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "teal";

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 1.5;

export interface AppearanceSettings {
  appThemeId: AppThemeId;
  terminalThemeId: TerminalThemeId;
  fontFamily: FontFamilyId;
  fontSize: number;
  uiScale: number;
  accentColorId: AccentColorId;
}

export interface NotificationSettings {
  soundEnabled: boolean;
  osNotificationsEnabled: boolean;
}

export interface UpdateSettings {
  autoEnabled: boolean;
}

export interface TerminalSettings {
  wslDistro: string | null;
}

export interface PersistedSettings {
  workspaces: Array<Omit<Workspace, "notifications">>;
  activeWorkspaceId: string | null;
  sidebarWidth?: number;
  appearance?: Partial<AppearanceSettings>;
  notificationSettings?: Partial<NotificationSettings>;
  updateSettings?: Partial<UpdateSettings>;
  terminalSettings?: Partial<TerminalSettings>;
}
