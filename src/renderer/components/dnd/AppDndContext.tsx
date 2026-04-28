import {
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
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
  | { type: "pane"; paneId: string };

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
    overData?.type === "tab" || overData?.type === "pane"
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

// Inactive workspaces stay mounted with visibility:hidden to preserve xterm
// state, so their pane droppables sit at the same coordinates as the active
// workspace's. Drop those from the candidate list, otherwise dnd-kit may
// pick a hidden pane and `moveSurfaceToPane` silently no-ops.
function isVisibleNode(node: HTMLElement | null): boolean {
  if (!node) return false;
  if (typeof node.checkVisibility === "function") {
    return node.checkVisibility({ visibilityProperty: true });
  }
  let cur: HTMLElement | null = node;
  while (cur) {
    if (window.getComputedStyle(cur).visibility === "hidden") return false;
    cur = cur.parentElement;
  }
  return true;
}

function filterVisible<T extends { data?: { droppableContainer?: unknown } }>(
  collisions: T[],
): T[] {
  return collisions.filter((c) => {
    const dc = c.data?.droppableContainer as
      | { node: { current: HTMLElement | null } }
      | undefined;
    if (!dc) return true;
    return isVisibleNode(dc.node.current);
  });
}

// pointerWithin matches what the user sees under the cursor (so the empty
// stretch of a tab strip resolves to its pane droppable, not whichever
// sibling tab happens to overlap the active rect most). rectIntersection
// is kept as a fallback for keyboard drags where pointerCoordinates is null.
const collisionDetection: CollisionDetection = (args) => {
  const pointer = filterVisible(pointerWithin(args));
  if (pointer.length > 0) return pointer;
  return filterVisible(rectIntersection(args));
};

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
      collisionDetection={collisionDetection}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  );
}
