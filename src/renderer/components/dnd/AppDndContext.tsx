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

function onDragEnd(event: DragEndEvent): void {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const activeData = active.data.current as DragItemData | undefined;
  const overData = over.data.current as DragItemData | undefined;
  if (!activeData) return;
  const activeId = String(active.id);
  const overId = String(over.id);

  if (activeData.type === "workspace") {
    reorderWorkspaces(activeId, overId);
    return;
  }

  if (activeData.type !== "tab" || overData?.type !== "tab") return;
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
