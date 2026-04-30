import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DroppableContainer,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { type ReactNode, useState } from "react";
import { reorderWorkspaces } from "../../store";

export type DragItemData = { type: "workspace" };

type Collision = ReturnType<CollisionDetection>[number] & {
  data: { droppableContainer: DroppableContainer; value: number };
};

const workspaceYCollision: CollisionDetection = (args) => {
  const pointer = args.pointerCoordinates;
  if (!pointer) return [];
  let nearest: Collision | null = null;
  for (const container of args.droppableContainers) {
    const rect = args.droppableRects.get(container.id);
    if (!rect) continue;
    if (pointer.y >= rect.top && pointer.y <= rect.bottom) {
      return [
        { id: container.id, data: { droppableContainer: container, value: 0 } },
      ];
    }
    const distance = Math.abs((rect.top + rect.bottom) / 2 - pointer.y);
    if (!nearest || distance < nearest.data.value) {
      nearest = {
        id: container.id,
        data: { droppableContainer: container, value: distance },
      };
    }
  }
  return nearest ? [nearest] : [];
};

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
  const [dragging, setDragging] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={workspaceYCollision}
      modifiers={modifiers}
      autoScroll={!dragging}
      onDragStart={() => setDragging(true)}
      onDragEnd={(e) => {
        setDragging(false);
        handleDragEnd(e);
      }}
      onDragCancel={() => setDragging(false)}
    >
      {children}
    </DndContext>
  );
}
