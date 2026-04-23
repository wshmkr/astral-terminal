import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import {
  getActiveWorkspace,
  getState,
  moveSurfaceToPane,
  reorderSurfacesInPane,
  reorderWorkspaces,
} from "../../store";
import { findLeafPane } from "../Layout/pane-tree";

export type DragItemData =
  | { type: "workspace" }
  | { type: "tab"; paneId: string }
  | { type: "tab-bar"; paneId: string };

function onDragEnd(event: DragEndEvent): void {
  const { active, over } = event;
  if (!over) return;
  const activeData = active.data.current as DragItemData | undefined;
  const overData = over.data.current as DragItemData | undefined;
  if (!activeData) return;

  if (activeData.type === "workspace") {
    if (active.id === over.id) return;
    const ws = getState().workspaces;
    const from = ws.findIndex((w) => w.id === active.id);
    const to = ws.findIndex((w) => w.id === over.id);
    if (from < 0 || to < 0) return;
    reorderWorkspaces(from, to);
    return;
  }

  if (activeData.type !== "tab") return;

  const sourcePaneId = activeData.paneId;
  const targetPaneId =
    overData?.type === "tab" || overData?.type === "tab-bar"
      ? overData.paneId
      : undefined;
  if (!targetPaneId) return;

  if (sourcePaneId === targetPaneId) {
    if (overData?.type !== "tab") return;
    if (active.id === over.id) return;
    const ws = getActiveWorkspace();
    if (!ws) return;
    const leaf = findLeafPane(ws.layout, sourcePaneId);
    if (!leaf) return;
    const from = leaf.surfaces.findIndex((s) => s.id === active.id);
    const to = leaf.surfaces.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    reorderSurfacesInPane(sourcePaneId, from, to);
    return;
  }

  moveSurfaceToPane(sourcePaneId, String(active.id), targetPaneId);
}

interface Props {
  children: ReactNode;
}

export function AppDndContext({ children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      {children}
    </DndContext>
  );
}
