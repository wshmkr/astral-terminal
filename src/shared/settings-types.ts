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

export type SearchEngineId = "google" | "bing" | "duckduckgo" | "custom";

export interface BrowserSettings {
  searchEngineId: SearchEngineId;
  // template with %s placeholder; empty/no-%s falls back to Google
  customSearchUrl: string;
  adBlockEnabled: boolean;
}

export const DEFAULT_BROWSER_SETTINGS: BrowserSettings = {
  searchEngineId: "google",
  customSearchUrl: "",
  adBlockEnabled: true,
};

export const SEARCH_ENGINE_TEMPLATES: Record<
  Exclude<SearchEngineId, "custom">,
  string
> = {
  google: "https://www.google.com/search?q=%s",
  bing: "https://www.bing.com/search?q=%s",
  duckduckgo: "https://duckduckgo.com/?q=%s",
};

export type CustomTemplateIssue = "missing-scheme" | "missing-placeholder";

export function checkCustomTemplate(tpl: string): CustomTemplateIssue | null {
  const trimmed = tpl.trim();
  if (!/^https?:\/\/.+/i.test(trimmed)) return "missing-scheme";
  if (!trimmed.includes("%s")) return "missing-placeholder";
  return null;
}

export function buildSearchUrl(
  query: string,
  settings: BrowserSettings,
): string {
  const encoded = encodeURIComponent(query);
  if (settings.searchEngineId === "custom") {
    const tpl = settings.customSearchUrl;
    if (checkCustomTemplate(tpl) === null) {
      return tpl.replaceAll("%s", encoded);
    }
    return SEARCH_ENGINE_TEMPLATES.google.replaceAll("%s", encoded);
  }
  return SEARCH_ENGINE_TEMPLATES[settings.searchEngineId].replaceAll(
    "%s",
    encoded,
  );
}

export interface PersistedSettings {
  appearance?: Partial<AppearanceSettings>;
  notificationSettings?: Partial<NotificationSettings>;
  updateSettings?: Partial<UpdateSettings>;
  terminalSettings?: Partial<TerminalSettings>;
  browserSettings?: Partial<BrowserSettings>;
}
