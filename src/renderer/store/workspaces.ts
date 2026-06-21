import { arrayMove } from "@dnd-kit/sortable";
import {
  isTerminalSurface,
  type LeafPane,
  type PaneNode,
  type SplitDirection,
  type SurfaceKind,
  type TerminalSurface,
  type Workspace,
} from "../../shared/types";
import {
  findFirstLeaf,
  findLeafPane,
  forEachLeaf,
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
  createBrowserSurface,
  createDefaultWorkspace,
  createLeafPane,
  createTerminalSurface,
  generateId,
  nextWorkspaceName,
} from "./factories";
import { markSurfaceNotificationsRead } from "./notifications";

// New browser tabs flag themselves here so BrowserPane can focus the URL bar on
// mount; restored and link-opened tabs are never flagged
const browserUrlFocusPending = new Set<string>();

export function consumeBrowserUrlFocus(surfaceId: string): boolean {
  return browserUrlFocusPending.delete(surfaceId);
}

// Remembers each workspace's last-focused pane so switching back restores it
const lastFocusedPaneByWorkspace = new Map<string, string>();

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

function removeSurfaceFromLeaf(leaf: LeafPane, surfaceId: string): LeafPane {
  if (leaf.surfaces.length <= 1) return leaf;
  const removedIndex = leaf.surfaces.findIndex((s) => s.id === surfaceId);
  if (removedIndex < 0) return leaf;
  const remaining = leaf.surfaces.filter((s) => s.id !== surfaceId);
  const nextActive = remaining[removedIndex - 1] ?? remaining[0];
  if (!nextActive) return leaf;
  return {
    ...leaf,
    surfaces: remaining,
    activeSurfaceId:
      leaf.activeSurfaceId === surfaceId ? nextActive.id : leaf.activeSurfaceId,
  };
}

function removeSurfaceFromLayout(
  layout: PaneNode,
  paneId: string,
  surfaceId: string,
): PaneNode | null {
  const leaf = findLeafPane(layout, paneId);
  if (!leaf?.surfaces.some((s) => s.id === surfaceId)) return layout;
  if (leaf.surfaces.length === 1) return pruneNode(layout, paneId);
  return updateLeafInLayout(layout, paneId, (l) =>
    removeSurfaceFromLeaf(l, surfaceId),
  );
}

function removeWorkspace(wsId: string) {
  const s = getState();
  const closedIndex = s.workspaces.findIndex((w) => w.id === wsId);
  if (closedIndex < 0) return;
  lastFocusedPaneByWorkspace.delete(wsId);
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
  if (s.activeWorkspaceId && s.focusedPaneId) {
    lastFocusedPaneByWorkspace.set(s.activeWorkspaceId, s.focusedPaneId);
  }
  const target = getWorkspace(id);
  const remembered = lastFocusedPaneByWorkspace.get(id);
  const focusedPaneId = target
    ? remembered && findLeafPane(target.layout, remembered)
      ? remembered
      : findFirstLeaf(target.layout)
    : null;
  setState({ ...s, activeWorkspaceId: id, focusedPaneId });
  commit();
}

function wrapLeafInSplit(
  layout: PaneNode,
  targetPaneId: string,
  direction: SplitDirection,
  newLeaf: LeafPane,
): PaneNode {
  return mapNode(layout, targetPaneId, (node) => ({
    kind: "split" as const,
    id: generateId(),
    direction,
    children: [node, newLeaf],
  }));
}

export function splitPane(
  targetPaneId: string,
  direction: SplitDirection,
): void {
  const ws = getActiveWorkspace();
  if (!ws) return;

  const targetLeaf = findLeafPane(ws.layout, targetPaneId);
  const activeSurface = targetLeaf ? getActiveSurface(targetLeaf) : undefined;
  const cwd =
    activeSurface && isTerminalSurface(activeSurface)
      ? activeSurface.cwd
      : undefined;
  const newLeaf = createLeafPane(cwd);
  const newLayout = wrapLeafInSplit(
    ws.layout,
    targetPaneId,
    direction,
    newLeaf,
  );
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
  const ws = getActiveWorkspace();
  const surfaceId = ws && findLeafPane(ws.layout, id)?.activeSurfaceId;
  const notifsChanged =
    ws && surfaceId ? markSurfaceNotificationsRead(ws.id, surfaceId) : false;
  const paneChanged = getState().focusedPaneId !== id;
  if (paneChanged) setState({ ...getState(), focusedPaneId: id });
  if (paneChanged || notifsChanged) notify();
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

export function setBrowserSurfaceUrl(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
  url: string,
): void {
  const changed = updateLeaf(workspaceId, paneId, (leaf) => {
    const existing = leaf.surfaces.find((s) => s.id === surfaceId);
    if (!existing || existing.type !== "browser" || existing.url === url) {
      return leaf;
    }
    return {
      ...leaf,
      surfaces: leaf.surfaces.map((s) =>
        s.id === surfaceId && s.type === "browser" ? { ...s, url } : s,
      ),
    };
  });
  if (changed) scheduleSave();
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

export function addSurface(
  paneId: string,
  kind: SurfaceKind = "terminal",
  options?: { url?: string; activate?: boolean },
): string | null {
  const ws = getActiveWorkspace();
  if (!ws) return null;
  const activate = options?.activate ?? true;
  const browserUrl =
    kind === "browser"
      ? (options?.url ??
        (getState().browserSettings.homepage.trim() || undefined))
      : undefined;
  let newSurfaceId: string | null = null;
  const changed = updateLeaf(ws.id, paneId, (leaf) => {
    const active = getActiveSurface(leaf);
    // fall back to nearest left terminal's cwd if active tab is non-terminal
    let cwd = active && isTerminalSurface(active) ? active.cwd : undefined;
    if (cwd === undefined && active) {
      const activeIndex = leaf.surfaces.findIndex((s) => s.id === active.id);
      for (let i = activeIndex - 1; i >= 0; i--) {
        const surface = leaf.surfaces[i];
        if (surface && isTerminalSurface(surface)) {
          cwd = surface.cwd;
          break;
        }
      }
    }
    const surface =
      kind === "browser"
        ? createBrowserSurface(browserUrl)
        : createTerminalSurface(cwd);
    newSurfaceId = surface.id;
    return {
      ...leaf,
      surfaces: [...leaf.surfaces, surface],
      activeSurfaceId: activate ? surface.id : leaf.activeSurfaceId,
    };
  });
  if (changed) commit();
  if (newSurfaceId && kind === "browser" && activate && !options?.url) {
    browserUrlFocusPending.add(newSurfaceId);
  }
  return newSurfaceId;
}

export function findPaneBySurfaceId(
  surfaceId: string,
): { workspaceId: string; paneId: string } | null {
  for (const ws of getState().workspaces) {
    let match: { workspaceId: string; paneId: string } | null = null;
    forEachLeaf(ws.layout, (leaf) => {
      if (match) return;
      if (leaf.surfaces.some((s) => s.id === surfaceId)) {
        match = { workspaceId: ws.id, paneId: leaf.id };
      }
    });
    if (match) return match;
  }
  return null;
}

export function closeSurface(paneId: string, surfaceId: string): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const newLayout = removeSurfaceFromLayout(ws.layout, paneId, surfaceId);
  if (newLayout === ws.layout) return;
  if (newLayout === null) {
    removeWorkspace(ws.id);
    commit();
    return;
  }
  setWorkspaceLayout(ws.id, newLayout);
  const s = getState();
  if (s.focusedPaneId === paneId) {
    setState({ ...s, focusedPaneId: findFirstLeaf(newLayout) });
  }
  commit();
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

// Re-resolves the surface's current pane, as the captured ids may be stale.
export function navigateToSurface(
  workspaceId: string,
  paneId: string,
  surfaceId: string,
): void {
  const located = findPaneBySurfaceId(surfaceId);
  setActiveWorkspace(located?.workspaceId ?? workspaceId);
  setActiveSurface(located?.paneId ?? paneId, surfaceId);
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
  const surface = sourceLeaf?.surfaces.find((s) => s.id === surfaceId);
  if (!surface) return;

  const afterAdd = updateLeafInLayout(ws.layout, targetPaneId, (leaf) => ({
    ...leaf,
    surfaces: [...leaf.surfaces, surface],
    activeSurfaceId: surface.id,
  }));
  if (afterAdd === ws.layout) return;

  const nextLayout = removeSurfaceFromLayout(afterAdd, sourcePaneId, surfaceId);
  if (!nextLayout) return;

  setWorkspaceLayout(ws.id, nextLayout);
  const s = getState();
  if (s.focusedPaneId !== targetPaneId)
    setState({ ...s, focusedPaneId: targetPaneId });
  commit();
}

export function splitPaneWithSurface(
  sourcePaneId: string,
  surfaceId: string,
  targetPaneId: string,
  direction: SplitDirection,
): void {
  const ws = getActiveWorkspace();
  if (!ws) return;
  const sourceLeaf = findLeafPane(ws.layout, sourcePaneId);
  const surface = sourceLeaf?.surfaces.find((s) => s.id === surfaceId);
  if (!sourceLeaf || !surface) return;

  const newLeaf: LeafPane = {
    kind: "leaf",
    id: generateId(),
    surfaces: [surface],
    activeSurfaceId: surface.id,
  };
  const afterSplit = wrapLeafInSplit(
    ws.layout,
    targetPaneId,
    direction,
    newLeaf,
  );
  if (afterSplit === ws.layout) return;

  // Leave a fresh terminal behind, or the emptied source prunes and the split collapses
  const isSoleSelfSplit =
    sourcePaneId === targetPaneId && sourceLeaf.surfaces.length === 1;
  const nextLayout = isSoleSelfSplit
    ? updateLeafInLayout(afterSplit, sourcePaneId, (leaf) => {
        const cwd = isTerminalSurface(surface) ? surface.cwd : undefined;
        const replacement = createTerminalSurface(cwd);
        return {
          ...leaf,
          surfaces: [replacement],
          activeSurfaceId: replacement.id,
        };
      })
    : removeSurfaceFromLayout(afterSplit, sourcePaneId, surfaceId);
  if (!nextLayout) return;

  setWorkspaceLayout(ws.id, nextLayout);
  setState({ ...getState(), focusedPaneId: newLeaf.id });
  commit();
}
