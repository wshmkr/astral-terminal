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
} from "../theme/fonts";
import { commit, getState, setState } from "./core";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  appThemeId: "dark",
  terminalThemeId: "one-dark",
  fontFamily: "jetbrains-mono",
  fontSize: DEFAULT_FONT_SIZE,
  uiScale: DEFAULT_UI_SCALE,
};

export function clampFontSize(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_FONT_SIZE;
  return Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, Math.round(n)));
}

export function clampUiScale(n: number): number {
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
