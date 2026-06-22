import type {
  CliSplitDirection,
  CliSplitRequest,
  CliSplitResult,
  LeafPane,
  SplitDirection,
} from "../../shared/types";
import { findLeafPane, forEachLeaf } from "../components/Layout/pane-tree";
import { getState, getWorkspace } from "./core";
import { splitPane } from "./workspaces";

// "right" grows side by side (vertical divider); "down" stacks (horizontal divider).
const DIRECTION_MAP: Record<CliSplitDirection, SplitDirection> = {
  right: "vertical",
  down: "horizontal",
};

interface SplitTarget {
  workspaceId: string;
  paneId: string;
}

// Find the first pane (across all workspaces) whose leaf matches, so `astral split` can target the
// pane holding the calling shell even when it lives in a background workspace.
function findPaneAcrossWorkspaces(
  predicate: (leaf: LeafPane) => boolean,
): SplitTarget | null {
  for (const ws of getState().workspaces) {
    let paneId: string | null = null;
    forEachLeaf(ws.layout, (leaf) => {
      if (!paneId && predicate(leaf)) paneId = leaf.id;
    });
    if (paneId) return { workspaceId: ws.id, paneId };
  }
  return null;
}

// Resolution order: explicit pane, then the pane owning the requested surface, else the focused
// pane of the active workspace.
function resolveTarget(request: CliSplitRequest): SplitTarget | null {
  if (request.paneId) {
    const byPane = findPaneAcrossWorkspaces(
      (leaf) => leaf.id === request.paneId,
    );
    if (byPane) return byPane;
  }
  if (request.surfaceId) {
    const bySurface = findPaneAcrossWorkspaces((leaf) =>
      leaf.surfaces.some((s) => s.id === request.surfaceId),
    );
    if (bySurface) return bySurface;
  }
  const s = getState();
  if (s.activeWorkspaceId && s.focusedPaneId) {
    return { workspaceId: s.activeWorkspaceId, paneId: s.focusedPaneId };
  }
  return null;
}

function handleSplit(request: CliSplitRequest): CliSplitResult {
  const target = resolveTarget(request);
  if (!target) return { ok: false, reason: "no pane to split" };

  const newPaneId = splitPane(
    target.paneId,
    DIRECTION_MAP[request.direction],
    target.workspaceId,
  );
  if (!newPaneId) return { ok: false, reason: "split did not produce a pane" };

  const ws = getWorkspace(target.workspaceId);
  const leaf = ws ? findLeafPane(ws.layout, newPaneId) : null;
  return {
    ok: true,
    workspaceId: target.workspaceId,
    paneId: newPaneId,
    surfaceId: leaf?.activeSurfaceId ?? null,
  };
}

let started = false;

export function startCliSplitBridge(): void {
  if (started) return;
  if (typeof window === "undefined" || !window.app?.onCliSplit) return;
  started = true;
  window.app.onCliSplit((request) => {
    const result = handleSplit(request);
    window.app.sendCliSplitResult({ requestId: request.requestId, result });
  });
}
