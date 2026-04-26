import type {
  AppearanceSettings,
  AppThemeId,
  FontFamilyId,
  TerminalThemeId,
} from "../../shared/types";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_UI_SCALE,
  MAX_FONT_SIZE,
  MAX_UI_SCALE,
  MIN_FONT_SIZE,
  MIN_UI_SCALE,
  UI_SCALE_OPTIONS,
} from "../theme/fonts";
import { TERMINAL_THEMES } from "../theme/terminal-themes";
import { commit, getState, setState } from "./core";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  appThemeId: "dark",
  terminalThemeId: "one-half-dark",
  fontFamily: "jetbrains-mono",
  fontSize: DEFAULT_FONT_SIZE,
  uiScale: DEFAULT_UI_SCALE,
};

function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(n)));
}

function clampUiScale(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_UI_SCALE;
  return Math.max(MIN_UI_SCALE, Math.min(MAX_UI_SCALE, n));
}

export function normalizeAppearance(
  loaded: Partial<AppearanceSettings> | undefined,
): AppearanceSettings {
  const merged = { ...DEFAULT_APPEARANCE, ...(loaded ?? {}) };
  if (!(merged.terminalThemeId in TERMINAL_THEMES)) {
    merged.terminalThemeId = DEFAULT_APPEARANCE.terminalThemeId;
  }
  return merged;
}

function update(patch: Partial<AppearanceSettings>): void {
  const s = getState();
  setState({ ...s, appearance: { ...s.appearance, ...patch } });
  commit();
}

export function setAppTheme(id: AppThemeId): void {
  if (getState().appearance.appThemeId === id) return;
  update({ appThemeId: id });
}

export function setTerminalTheme(id: TerminalThemeId): void {
  if (getState().appearance.terminalThemeId === id) return;
  update({ terminalThemeId: id });
}

export function setFontFamily(id: FontFamilyId): void {
  if (getState().appearance.fontFamily === id) return;
  update({ fontFamily: id });
}

export function setFontSize(size: number): void {
  const clamped = clampFontSize(size);
  if (getState().appearance.fontSize === clamped) return;
  update({ fontSize: clamped });
}

export function setUiScale(scale: number): void {
  const clamped = clampUiScale(scale);
  if (getState().appearance.uiScale === clamped) return;
  update({ uiScale: clamped });
}

export function stepUiScale(direction: 1 | -1): void {
  const current = getState().appearance.uiScale;
  const values = UI_SCALE_OPTIONS.map((o) => o.value);
  // Find the next discrete step in the requested direction
  const next =
    direction > 0
      ? values.find((v) => v > current)
      : [...values].reverse().find((v) => v < current);
  if (next !== undefined) setUiScale(next);
}
