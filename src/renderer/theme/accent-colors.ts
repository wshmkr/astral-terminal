import type { AccentColorId } from "../../shared/types";

export type { AccentColorId };

export interface AccentColorOption {
  id: AccentColorId;
  label: string;
  hex: string;
}

export const ACCENT_COLORS: Record<AccentColorId, AccentColorOption> = {
  blue: { id: "blue", label: "Blue", hex: "#0078d4" },
  purple: { id: "purple", label: "Purple", hex: "#8b5cf6" },
  pink: { id: "pink", label: "Pink", hex: "#ec4899" },
  red: { id: "red", label: "Red", hex: "#ef4444" },
  orange: { id: "orange", label: "Orange", hex: "#f97316" },
  green: { id: "green", label: "Green", hex: "#22c55e" },
  teal: { id: "teal", label: "Teal", hex: "#14b8a6" },
};

export const ACCENT_COLOR_OPTIONS: ReadonlyArray<AccentColorOption> = [
  ACCENT_COLORS.blue,
  ACCENT_COLORS.purple,
  ACCENT_COLORS.pink,
  ACCENT_COLORS.red,
  ACCENT_COLORS.orange,
  ACCENT_COLORS.green,
  ACCENT_COLORS.teal,
];

export const DEFAULT_ACCENT_COLOR_ID: AccentColorId = "blue";

export function resolveAccentHex(id: AccentColorId): string {
  return (ACCENT_COLORS[id] ?? ACCENT_COLORS[DEFAULT_ACCENT_COLOR_ID]).hex;
}
