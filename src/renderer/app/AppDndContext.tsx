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
import { TabDragOverlay } from "../components/Layout/TabbedPane";
import { moveSurfaceToEnd, reorderSurfaces, reorderWorkspaces } from "../store";

const restrictToActiveAxis: Modifier = (args) => {
  const type = args.active?.data.current?.type;
  if (type === "workspace") return restrictToVerticalAxis(args);
  if (type === "tab") return restrictToHorizontalAxis(args);
  return args.transform;
};

const modifiers = [restrictToActiveAxis, restrictToFirstScrollableAncestor];

const collisionDetection: CollisionDetection = (args) => {
  const type = args.active?.data.current?.type;
  if (type !== "tab") return closestCenter(args);
  const paneId = args.active?.data.current?.paneId;
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
    const data = event.active.data.current;
    if (data?.type === "tab" && typeof data.paneId === "string") {
      setActiveTab({ paneId: data.paneId, surfaceId: String(event.active.id) });
    }
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveTab(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const type = active.data.current?.type;
    if (type === "workspace") {
      reorderWorkspaces(String(active.id), String(over.id));
    } else if (type === "tab") {
      const paneId = active.data.current?.paneId;
      if (typeof paneId !== "string") return;
      if (over.data.current?.paneId !== paneId) return;
      if (over.data.current?.type === "tab-end") {
        moveSurfaceToEnd(paneId, String(active.id));
        return;
      }
      reorderSurfaces(paneId, String(active.id), String(over.id));
    }
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
