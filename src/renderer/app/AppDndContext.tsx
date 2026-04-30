import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import type { ReactNode } from "react";
import { reorderWorkspaces } from "../store";

const modifiers = [restrictToVerticalAxis, restrictToFirstScrollableAncestor];

function handleDragEnd(event: DragEndEvent): void {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  reorderWorkspaces(String(active.id), String(over.id));
}

interface Props {
  children: ReactNode;
}

export function AppDndContext({ children }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
