import type { AccentColorId } from "../../shared/settings-schema";

export type { AccentColorId };

export interface AccentColorOption {
  id: AccentColorId;
  label: string;
  hex: string;
}

export const ACCENT_COLOR_OPTIONS: AccentColorOption[] = [
  { id: "blue", label: "Blue", hex: "#0078d4" },
  { id: "teal", label: "Teal", hex: "#14b8a6" },
  { id: "green", label: "Green", hex: "#22c55e" },
  { id: "yellow", label: "Yellow", hex: "#eab308" },
  { id: "orange", label: "Orange", hex: "#f97316" },
  { id: "red", label: "Red", hex: "#ef4444" },
  { id: "pink", label: "Pink", hex: "#ec4899" },
  { id: "purple", label: "Purple", hex: "#8b5cf6" },
];

export const ACCENT_COLOR_BY_ID = Object.fromEntries(
  ACCENT_COLOR_OPTIONS.map((o) => [o.id, o]),
) as Record<AccentColorId, AccentColorOption>;

export const DEFAULT_ACCENT_COLOR_ID: AccentColorId = "blue";

export function resolveAccentHex(id: AccentColorId): string {
  return ACCENT_COLOR_BY_ID[id].hex;
}
