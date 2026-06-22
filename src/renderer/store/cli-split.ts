import type {
  CliSplitDirection,
  CliSplitRequest,
  CliSplitResult,
  SplitDirection,
} from "../../shared/types";
import { findLeafPane, forEachLeaf } from "../components/Layout/pane-tree";
import { getActiveWorkspace, getState } from "./core";
import { splitPane } from "./workspaces";

// "right" grows side by side (vertical divider); "down" stacks (horizontal divider).
const DIRECTION_MAP: Record<CliSplitDirection, SplitDirection> = {
  right: "vertical",
  down: "horizontal",
};

// Resolve the pane to split within the active workspace. An explicit pane wins, then the pane
// holding the requested surface (e.g. the shell that ran `astral split`), else the focused pane.
function resolveTargetPaneId(request: CliSplitRequest): string | null {
  const ws = getActiveWorkspace();
  if (!ws) return null;

  if (request.paneId && findLeafPane(ws.layout, request.paneId)) {
    return request.paneId;
  }
  if (request.surfaceId) {
    let match: string | null = null;
    forEachLeaf(ws.layout, (leaf) => {
      if (leaf.surfaces.some((s) => s.id === request.surfaceId))
        match = leaf.id;
    });
    if (match) return match;
  }
  return getState().focusedPaneId;
}

function handleSplit(request: CliSplitRequest): CliSplitResult {
  const ws = getActiveWorkspace();
  if (!ws) return { ok: false, reason: "no active workspace" };

  const targetPaneId = resolveTargetPaneId(request);
  if (!targetPaneId) return { ok: false, reason: "no pane to split" };

  splitPane(targetPaneId, DIRECTION_MAP[request.direction]);

  // splitPane focuses the new leaf, so read it back to report the created pane/surface.
  const after = getActiveWorkspace();
  const newPaneId = getState().focusedPaneId;
  const leaf =
    after && newPaneId ? findLeafPane(after.layout, newPaneId) : null;
  if (!leaf) return { ok: false, reason: "split did not produce a pane" };

  return {
    ok: true,
    workspaceId: after?.id ?? null,
    paneId: leaf.id,
    surfaceId: leaf.activeSurfaceId,
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
