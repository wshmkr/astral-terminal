import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type Modifier,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToHorizontalAxis,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import type { ReactNode } from "react";
import { reorderSurfaces, reorderWorkspaces } from "../store";

const restrictToActiveAxis: Modifier = (args) => {
  const type = args.active?.data.current?.type;
  if (type === "workspace") return restrictToVerticalAxis(args);
  if (type === "tab") return restrictToHorizontalAxis(args);
  return args.transform;
};

const modifiers = [restrictToActiveAxis, restrictToFirstScrollableAncestor];

const collisionDetection: CollisionDetection = (args) => {
  const type = args.active?.data.current?.type;
  if (type === "tab") return pointerWithin(args);
  return closestCenter(args);
};

function handleDragEnd(event: DragEndEvent): void {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const type = active.data.current?.type;
  if (type === "workspace") {
    reorderWorkspaces(String(active.id), String(over.id));
  } else if (type === "tab") {
    const paneId = active.data.current?.paneId;
    if (typeof paneId !== "string") return;
    if (over.data.current?.paneId !== paneId) return;
    reorderSurfaces(paneId, String(active.id), String(over.id));
  }
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
      collisionDetection={collisionDetection}
      modifiers={modifiers}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
