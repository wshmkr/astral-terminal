import {
  type AccentColorId,
  type AppearanceSettings,
  type AppThemeId,
  type FontFamilyId,
  MAX_FONT_SIZE,
  MAX_LINE_HEIGHT,
  MAX_UI_SCALE,
  MIN_FONT_SIZE,
  MIN_LINE_HEIGHT,
  MIN_UI_SCALE,
  type TerminalThemeId,
} from "../../shared/settings-types";
import { DEFAULT_ACCENT_COLOR_ID } from "../theme/accent-colors";
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_LINE_HEIGHT,
  DEFAULT_UI_SCALE,
  UI_SCALE_OPTIONS,
} from "../theme/fonts";
import { commit, getState, setState } from "./core";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  appThemeId: "dark",
  terminalThemeId: "one-half-dark",
  fontFamily: "jetbrains-mono",
  fontSize: DEFAULT_FONT_SIZE,
  terminalLineHeight: DEFAULT_LINE_HEIGHT,
  uiScale: DEFAULT_UI_SCALE,
  accentColorId: DEFAULT_ACCENT_COLOR_ID,
};

function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(n)));
}

function clampLineHeight(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_LINE_HEIGHT;
  return Math.max(MIN_LINE_HEIGHT, Math.min(MAX_LINE_HEIGHT, n));
}

function clampUiScale(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_UI_SCALE;
  return Math.max(MIN_UI_SCALE, Math.min(MAX_UI_SCALE, n));
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

export function setAccentColor(id: AccentColorId): void {
  if (getState().appearance.accentColorId === id) return;
  update({ accentColorId: id });
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

export function setTerminalLineHeight(lineHeight: number): void {
  const clamped = clampLineHeight(lineHeight);
  if (getState().appearance.terminalLineHeight === clamped) return;
  update({ terminalLineHeight: clamped });
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
