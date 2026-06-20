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
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  restrictToFirstScrollableAncestor,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import { type ReactNode, useState } from "react";
import { TabDragOverlay } from "../components/Layout/TabDragOverlay";
import {
  moveSurfaceToPane,
  reorderSurfaces,
  reorderWorkspaces,
  splitPaneWithSurface,
} from "../store";
import { getDragData, getDragPaneId } from "./dnd-types";

const workspaceModifier: Modifier = (args) => {
  const data = getDragData(args.active);
  if (data?.type !== "workspace") return args.transform;
  const verticalOnly = restrictToVerticalAxis(args);
  return restrictToFirstScrollableAncestor({
    ...args,
    transform: verticalOnly,
  });
};

const modifiers = [workspaceModifier];

function visibleDroppables(args: Parameters<CollisionDetection>[0]) {
  return {
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => {
      const node = c.node.current;
      return !!node && node.checkVisibility({ visibilityProperty: true });
    }),
  };
}

const collisionDetection: CollisionDetection = (args) => {
  const data = getDragData(args.active);
  if (data?.type !== "tab") return closestCenter(args);
  const visible = visibleDroppables(args);
  const pointer = pointerWithin(visible);
  return pointer.length > 0 ? pointer : rectIntersection(visible);
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
    const targetPaneId = getDragPaneId(overData);
    if (!targetPaneId) return;

    if (overData?.type === "pane-split") {
      splitPaneWithSurface(
        activeData.paneId,
        String(active.id),
        targetPaneId,
        overData.edge === "right" ? "vertical" : "horizontal",
      );
      return;
    }

    if (targetPaneId !== activeData.paneId) {
      moveSurfaceToPane(activeData.paneId, String(active.id), targetPaneId);
      return;
    }

    if (overData?.type !== "tab" && overData?.type !== "tab-end") return;
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
