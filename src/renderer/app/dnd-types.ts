import type { Active, Over } from "@dnd-kit/core";

export type DragData =
  | { type: "workspace" }
  | { type: "tab"; paneId: string }
  | { type: "tab-end"; paneId: string; lastSurfaceId: string };

export function getDragData(
  node: Active | Over | null | undefined,
): DragData | null {
  const data = node?.data.current;
  if (!data) return null;
  if (data.type === "workspace") return { type: "workspace" };
  if (data.type === "tab" && typeof data.paneId === "string") {
    return { type: "tab", paneId: data.paneId };
  }
  if (
    data.type === "tab-end" &&
    typeof data.paneId === "string" &&
    typeof data.lastSurfaceId === "string"
  ) {
    return {
      type: "tab-end",
      paneId: data.paneId,
      lastSurfaceId: data.lastSurfaceId,
    };
  }
  return null;
}
