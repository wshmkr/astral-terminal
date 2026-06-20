import {
  type CollisionDetection,
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
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
import { alpha, useTheme } from "@mui/material/styles";
import { type ReactNode, useRef, useState } from "react";
import { isBrowserSurface } from "../../shared/types";
import { findLeafPane, getActiveSurface } from "../components/Layout/pane-tree";
import { TabDragOverlay } from "../components/Layout/TabDragOverlay";
import {
  moveSurfaceToPane,
  reorderSurfaces,
  reorderWorkspaces,
  splitPaneWithSurface,
} from "../store";
import { getActiveWorkspace } from "../store/core";
import { getDragData, getDragPaneId } from "./dnd-types";

// Resolves the browser surface visible in a pane, or null if the active surface
// is not a browser (terminal panes use the renderer-DOM preview instead)
function activeBrowserSurfaceId(paneId: string): string | null {
  const ws = getActiveWorkspace();
  if (!ws) return null;
  const leaf = findLeafPane(ws.layout, paneId);
  const surface = leaf ? getActiveSurface(leaf) : undefined;
  return surface && isBrowserSurface(surface) ? surface.id : null;
}

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
  const theme = useTheme();
  const splitPreviewFill = alpha(theme.palette.primary.main, 0.25);
  const splitPreviewStroke = theme.palette.primary.main;
  // Last preview target sent to main, to skip redundant executeJavaScript calls
  const lastSplitPreview = useRef<string>("");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function sendSplitPreview(
    surfaceId: string | null,
    edge: "right" | "bottom" | null,
  ): void {
    const key = `${surfaceId ?? ""}|${edge ?? ""}`;
    if (key === lastSplitPreview.current) return;
    lastSplitPreview.current = key;
    window.app.setBrowserSplitPreview(
      surfaceId,
      edge,
      splitPreviewFill,
      splitPreviewStroke,
    );
  }

  function handleDragStart(event: DragStartEvent): void {
    const data = getDragData(event.active);
    if (data?.type === "tab") {
      setActiveTab({ paneId: data.paneId, surfaceId: String(event.active.id) });
    }
  }

  function handleDragOver(event: DragOverEvent): void {
    const over = getDragData(event.over);
    if (over?.type === "pane-split") {
      const surfaceId = activeBrowserSurfaceId(over.paneId);
      sendSplitPreview(surfaceId, surfaceId ? over.edge : null);
      return;
    }
    sendSplitPreview(null, null);
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveTab(null);
    sendSplitPreview(null, null);
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
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTab(null);
        sendSplitPreview(null, null);
      }}
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
