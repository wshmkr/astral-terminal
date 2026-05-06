import { arrayMove } from "@dnd-kit/sortable";
import {
  isTerminalSurface,
  type LeafPane,
  type PaneNode,
  type SplitDirection,
  type TerminalSurface,
  type Workspace,
} from "../../shared/types";
import {
  findFirstLeaf,
  findLeafPane,
  getActiveSurface,
  mapNode,
  pruneNode,
  updateLeafInLayout,
} from "../components/Layout/pane-tree";
import {
  commit,
  getActiveWorkspace,
  getState,
  getWorkspace,
  notify,
  scheduleSave,
  setState,
} from "./core";
import {
  createDefaultWorkspace,
  createLeafPane,
  createTerminalSurface,
  generateId,
  nextWorkspaceName,
} from "./factories";
import { markSurfaceNotificationsRead } from "./notifications";

function mapWorkspaceById(
  id: string,
  fn: (w: Workspace) => Workspace,
): Workspace[] {
  return getState().workspaces.map((w) => (w.id === id ? fn(w) : w));
}

function setWorkspaceLayout(workspaceId: string, newLayout: PaneNode) {
  setState({
    ...getState(),
    workspaces: mapWorkspaceById(workspaceId, (w) => ({
      ...w,
      layout: newLayout,
    })),
  });
}

function updateLeaf(
  workspaceId: string,
  paneId: string,
  updater: (leaf: LeafPane) => LeafPane,
): boolean {
  const ws = getWorkspace(workspaceId);
  if (!ws) return false;
  const newLayout = updateLeafInLayout(ws.layout, paneId, updater);
  if (newLayout === ws.layout) return false;
  setWorkspaceLayout(workspaceId, newLayout);
  return true;
}

// Caller must guarantee leaf has more than one surface; the empty-leaf case
// belongs to a pane-prune path, not a per-leaf update
function removeSurfaceFromLeaf(leaf: LeafPane, surfaceId: string): LeafPane {
  const removedIndex = leaf.surfaces.findIndex((s) => s.id === surfaceId);
  if (removedIndex < 0) return leaf;
  const remaining = leaf.surfaces.filter((s) => s.id !== surfaceId);
  const fallback = remaining[0];
  if (!fallback) return leaf;
  const nextActive = remaining[removedIndex - 1] ?? fallback;
  return {
    ...leaf,
    surfaces: remaining,
    activeSurfaceId:
      leaf.activeSurfaceId === surfaceId ? nextActive.id : leaf.activeSurfaceId,
  };
}

function removeWorkspace(wsId: string) {
  const s = getState();
  const closedIndex = s.workspaces.findIndex((w) => w.id === wsId);
  if (closedIndex < 0) return;
  const remaining = s.workspaces.filter((w) => w.id !== wsId);
  const wasActive = s.activeWorkspaceId === wsId;
  if (!wasActive) {
    setState({ ...s, workspaces: remaining });
    return;
  }
  const nextActive = remaining[closedIndex - 1] ?? remaining[0];
  setState({
    ...s,
    workspaces: remaining,
    activeWorkspaceId: nextActive?.id ?? null,
    focusedPaneId: nextActive ? findFirstLeaf(nextActive.layout) : null,
  });
}

function closeLeafInActiveWorkspace(ws: Workspace, paneId: string) {
  const newLayout = pruneNode(ws.layout, paneId);
  if (!newLayout) {
    removeWorkspace(ws.id);
    return;
  }
  setWorkspaceLayout(ws.id, newLayout);
  const s = getState();
  if (s.focusedPaneId === paneId) {
    setState({ ...s, focusedPaneId: findFirstLeaf(newLayout) });
  }
}

export function updateTerminalSurface(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
  patch: Partial<Pick<TerminalSurface, "cwd">>,
) {
  const changed = updateLeaf(workspaceId, paneId, (leaf) => {
    const current = leaf.surfaces.find((s) => s.id === surfaceId);
    if (!current || !isTerminalSurface(current)) return leaf;
    return {
      ...leaf,
      surfaces: leaf.surfaces.map((s) =>
        s.id === surfaceId ? { ...s, ...patch } : s,
      ),
    };
  });
  if (changed) scheduleSave();
}

export function createWorkspace(name?: string): Workspace {
  const s = getState();
  const ws = createDefaultWorkspace(name ?? nextWorkspaceName(s.workspaces));
  setState({
    ...s,
    workspaces: [...s.workspaces, ws],
    activeWorkspaceId: ws.id,
    focusedPaneId: ws.layout.id,
  });
  commit();
  return ws;
}

export function setActiveWorkspace(id: string): void {
  const s = getState();
  if (s.activeWorkspaceId === id) return;
  setState({ ...s, activeWorkspaceId: id });
  commit();
}

export function splitPane(
  targetPaneId: string,
  direction: SplitDirection,
): void {
  const ws = getActiveWorkspace();
  if (!ws) return;

  const targetLeaf = findLeafPane(ws.layout, targetPaneId);
  const activeSurface = targetLeaf ? getActiveSurface(targetLeaf) : undefined;
  const newLeaf = createLeafPane(activeSurface?.cwd);
  const newLayout = mapNode(ws.layout, targetPaneId, (node) => ({
    kind: "split" as const,
    id: generateId(),
    direction,
    children: [node, newLeaf],
  }));
  if (newLayout === ws.layout) return;
  setWorkspaceLayout(ws.id, newLayout);
  setState({ ...getState(), focusedPaneId: newLeaf.id });
  commit();
}

export function closePane(paneId: string): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  closeLeafInActiveWorkspace(ws, paneId);
  commit();
}

export function setFocusedPane(id: string): void {
  const s = getState();
  if (s.focusedPaneId === id) return;
  setState({ ...s, focusedPaneId: id });
  notify();
}

export function renameSurface(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
  name: string,
): void {
  const changed = updateLeaf(workspaceId, paneId, (leaf) => {
    const existing = leaf.surfaces.find((s) => s.id === surfaceId);
    if (!existing || existing.name === name) return leaf;
    return {
      ...leaf,
      surfaces: leaf.surfaces.map((s) =>
        s.id === surfaceId ? { ...s, name } : s,
      ),
    };
  });
  if (changed) commit();
}

export function closeWorkspace(id: string): void {
  removeWorkspace(id);
  commit();
}

export function renameWorkspace(id: string, name: string): void {
  const ws = getWorkspace(id);
  if (!ws || ws.name === name) return;
  setState({
    ...getState(),
    workspaces: mapWorkspaceById(id, (w) => ({ ...w, name })),
  });
  commit();
}

export function addSurface(paneId: string): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const changed = updateLeaf(ws.id, paneId, (leaf) => {
    const surface = createTerminalSurface(getActiveSurface(leaf)?.cwd);
    return {
      ...leaf,
      surfaces: [...leaf.surfaces, surface],
      activeSurfaceId: surface.id,
    };
  });
  if (changed) commit();
}

export function closeSurface(paneId: string, surfaceId: string): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const leaf = findLeafPane(ws.layout, paneId);
  if (!leaf) return;

  if (leaf.surfaces.length === 1) {
    closeLeafInActiveWorkspace(ws, paneId);
    commit();
    return;
  }

  const changed = updateLeaf(ws.id, paneId, (l) =>
    removeSurfaceFromLeaf(l, surfaceId),
  );
  if (changed) commit();
}

export function setActiveSurface(paneId: string, surfaceId: string): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const leafChanged = updateLeaf(ws.id, paneId, (l) =>
    l.activeSurfaceId === surfaceId ? l : { ...l, activeSurfaceId: surfaceId },
  );
  const notifsChanged = markSurfaceNotificationsRead(ws.id, surfaceId);
  const s = getState();
  const paneChanged = s.focusedPaneId !== paneId;
  if (paneChanged) setState({ ...s, focusedPaneId: paneId });
  if (leafChanged || paneChanged) commit();
  else if (notifsChanged) notify();
}

export function resizeSplit(splitNodeId: string, sizes: number[]): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const newLayout = mapNode(ws.layout, splitNodeId, (node) => {
    if (node.kind !== "split") return node;
    return { ...node, sizes };
  });
  if (newLayout === ws.layout) return;
  setWorkspaceLayout(ws.id, newLayout);
  commit();
}

export function reorderWorkspaces(activeId: string, overId: string): void {
  const s = getState();
  const from = s.workspaces.findIndex((w) => w.id === activeId);
  const to = s.workspaces.findIndex((w) => w.id === overId);
  if (from < 0 || to < 0) return;
  setState({ ...s, workspaces: arrayMove(s.workspaces, from, to) });
  commit();
}

export function reorderSurfaces(
  paneId: string,
  activeId: string,
  overId: string,
): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const changed = updateLeaf(ws.id, paneId, (leaf) => {
    const from = leaf.surfaces.findIndex((s) => s.id === activeId);
    const to = leaf.surfaces.findIndex((s) => s.id === overId);
    if (from < 0 || to < 0 || from === to) return leaf;
    return { ...leaf, surfaces: arrayMove(leaf.surfaces, from, to) };
  });
  if (changed) commit();
}

export function moveSurfaceToPane(
  sourcePaneId: string,
  surfaceId: string,
  targetPaneId: string,
): void {
  if (sourcePaneId === targetPaneId) return;
  const ws = getActiveWorkspace();
  if (!ws) return;
  const sourceLeaf = findLeafPane(ws.layout, sourcePaneId);
  if (!sourceLeaf || !findLeafPane(ws.layout, targetPaneId)) return;
  const surface = sourceLeaf.surfaces.find((s) => s.id === surfaceId);
  if (!surface) return;

  const afterAdd = updateLeafInLayout(ws.layout, targetPaneId, (leaf) => ({
    ...leaf,
    surfaces: [...leaf.surfaces, surface],
    activeSurfaceId: surface.id,
  }));

  let nextLayout: PaneNode;
  if (sourceLeaf.surfaces.length === 1) {
    const pruned = pruneNode(afterAdd, sourcePaneId);
    if (!pruned) return;
    nextLayout = pruned;
  } else {
    nextLayout = updateLeafInLayout(afterAdd, sourcePaneId, (leaf) =>
      removeSurfaceFromLeaf(leaf, surfaceId),
    );
  }

  setWorkspaceLayout(ws.id, nextLayout);
  const s = getState();
  if (s.focusedPaneId !== targetPaneId)
    setState({ ...s, focusedPaneId: targetPaneId });
  commit();
}
