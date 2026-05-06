import type { Active, Over } from "@dnd-kit/core";

export type DragData =
  | { type: "workspace" }
  | { type: "tab"; paneId: string }
  | { type: "tab-end"; paneId: string; lastSurfaceId: string }
  | { type: "pane"; paneId: string };

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
  if (data.type === "pane" && typeof data.paneId === "string") {
    return { type: "pane", paneId: data.paneId };
  }
  return null;
}

export function getDragPaneId(data: DragData | null): string | null {
  if (!data) return null;
  if (data.type === "tab" || data.type === "tab-end" || data.type === "pane") {
    return data.paneId;
  }
  return null;
}
