import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
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
import { type ReactNode, useState } from "react";
import { TabDragOverlay } from "../components/Layout/TabDragOverlay";
import { reorderSurfaces, reorderWorkspaces } from "../store";
import { getDragData } from "./dnd-types";

const restrictToActiveAxis: Modifier = (args) => {
  const data = getDragData(args.active);
  if (data?.type === "workspace") return restrictToVerticalAxis(args);
  if (data?.type === "tab") return restrictToHorizontalAxis(args);
  return args.transform;
};

const modifiers = [restrictToActiveAxis, restrictToFirstScrollableAncestor];

const collisionDetection: CollisionDetection = (args) => {
  const data = getDragData(args.active);
  if (data?.type !== "tab") return closestCenter(args);
  const { paneId } = data;
  return pointerWithin({
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (c) => c.data.current?.paneId === paneId,
    ),
  });
};

interface ActiveTabDrag {
  paneId: string;
  surfaceId: string;
}

interface Props {
  children: ReactNode;
}

export function AppDndContext({ children }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTabDrag | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleDragStart(event: DragStartEvent): void {
    const data = getDragData(event.active);
    if (data?.type === "tab") {
      setActiveTab({ paneId: data.paneId, surfaceId: String(event.active.id) });
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveTab(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = getDragData(active);
    if (activeData?.type === "workspace") {
      reorderWorkspaces(String(active.id), String(over.id));
      return;
    }
    if (activeData?.type !== "tab") return;
    const overData = getDragData(over);
    if (!overData || overData.type === "workspace") return;
    if (overData.paneId !== activeData.paneId) return;
    const overSurfaceId =
      overData.type === "tab-end" ? overData.lastSurfaceId : String(over.id);
    reorderSurfaces(activeData.paneId, String(active.id), overSurfaceId);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      modifiers={modifiers}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTab(null)}
    >
      {children}
      <DragOverlay>
        {activeTab && (
          <TabDragOverlay
            paneId={activeTab.paneId}
            surfaceId={activeTab.surfaceId}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
