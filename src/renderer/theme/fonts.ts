import type { FontFamilyId } from "../../shared/settings-types";

export interface FontOption {
  id: FontFamilyId;
  label: string;
  stack: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    stack: "'JetBrains Mono', 'Cascadia Mono', 'Consolas', monospace",
  },
  {
    id: "cascadia-code",
    label: "Cascadia Code",
    stack: "'Cascadia Code', 'Cascadia Mono', 'Consolas', monospace",
  },
  {
    id: "consolas",
    label: "Consolas",
    stack: "'Consolas', 'Menlo', monospace",
  },
  {
    id: "system-monospace",
    label: "System Monospace",
    stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
];

export const FONT_BY_ID = Object.fromEntries(
  FONT_OPTIONS.map((o) => [o.id, o]),
) as Record<FontFamilyId, FontOption>;

export const MONO_FONT_STACK = FONT_BY_ID["jetbrains-mono"].stack;

export const DEFAULT_FONT_SIZE = 16;

export interface UiScaleOption {
  value: number;
  label: string;
}

export const UI_SCALE_OPTIONS: UiScaleOption[] = [
  { value: 0.8, label: "80%" },
  { value: 0.9, label: "90%" },
  { value: 1.0, label: "100%" },
  { value: 1.1, label: "110%" },
  { value: 1.25, label: "125%" },
  { value: 1.5, label: "150%" },
];

export const DEFAULT_UI_SCALE = 1.0;

export interface LineHeightOption {
  value: number;
  label: string;
}

export const LINE_HEIGHT_OPTIONS: LineHeightOption[] = [
  { value: 1.0, label: "1.0" },
  { value: 1.2, label: "1.2" },
  { value: 1.5, label: "1.5" },
];

// 1.0 keeps block glyphs (▀▄█, QR codes, ASCII art) seamless
export const DEFAULT_LINE_HEIGHT = 1.0;
