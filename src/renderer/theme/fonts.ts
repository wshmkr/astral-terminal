import type { FontFamilyId } from "../../shared/types";

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

export const FONT_BY_ID: Record<FontFamilyId, FontOption> = FONT_OPTIONS.reduce(
  (acc, opt) => {
    acc[opt.id] = opt;
    return acc;
  },
  {} as Record<FontFamilyId, FontOption>,
);

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;
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
export const MIN_UI_SCALE = 0.8;
export const MAX_UI_SCALE = 1.5;
