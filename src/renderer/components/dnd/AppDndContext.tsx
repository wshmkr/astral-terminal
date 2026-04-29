import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import { reorderSurfacesInPane, reorderWorkspaces } from "../../store";

export type DragItemData =
  | { type: "workspace" }
  | { type: "tab"; paneId: string };

type WorkspaceDragData = Extract<DragItemData, { type: "workspace" }>;
type TabDragData = Extract<DragItemData, { type: "tab" }>;

export function isWorkspaceDrag(data: unknown): data is WorkspaceDragData {
  return (data as DragItemData | undefined)?.type === "workspace";
}

export function isTabDrag(data: unknown): data is TabDragData {
  return (data as DragItemData | undefined)?.type === "tab";
}

function onDragEnd(event: DragEndEvent): void {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const activeData = active.data.current;
  const overData = over.data.current;
  const activeId = String(active.id);
  const overId = String(over.id);

  if (isWorkspaceDrag(activeData)) {
    reorderWorkspaces(activeId, overId);
    return;
  }

  if (!isTabDrag(activeData) || !isTabDrag(overData)) return;
  if (activeData.paneId !== overData.paneId) return;
  reorderSurfacesInPane(activeData.paneId, activeId, overId);
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
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  );
}
