import type {
  CliSplitDirection,
  CliSplitRequest,
  CliSplitResult,
  SplitDirection,
} from "../../shared/types";
import { getState } from "./core";
import {
  findPaneById,
  findPaneBySurfaceId,
  getWorkspaceFocusedPaneId,
  splitPane,
} from "./workspaces";

// "right" grows side by side (vertical divider); "down" stacks (horizontal divider).
const DIRECTION_MAP: Record<CliSplitDirection, SplitDirection> = {
  right: "vertical",
  down: "horizontal",
};

interface SplitTarget {
  workspaceId: string;
  paneId: string;
}

type Resolution = { target: SplitTarget } | { error: string };

function resolveTarget(request: CliSplitRequest): Resolution {
  const { paneId, surfaceId } = request;
  if (paneId === undefined && surfaceId === undefined) {
    const s = getState();
    if (s.activeWorkspaceId && s.focusedPaneId) {
      return {
        target: { workspaceId: s.activeWorkspaceId, paneId: s.focusedPaneId },
      };
    }
    return { error: "no pane to split" };
  }

  const byPane = paneId !== undefined ? findPaneById(paneId) : null;
  if (paneId !== undefined && !byPane) {
    return { error: `split target not found: pane ${paneId}` };
  }
  const bySurface =
    surfaceId !== undefined ? findPaneBySurfaceId(surfaceId) : null;
  if (surfaceId !== undefined && !bySurface) {
    return { error: `split target not found: surface ${surfaceId}` };
  }
  if (
    byPane &&
    bySurface &&
    (byPane.workspaceId !== bySurface.workspaceId ||
      byPane.paneId !== bySurface.paneId)
  ) {
    return {
      error:
        "split target mismatch: paneId and surfaceId resolve to different panes",
    };
  }
  return { target: (byPane ?? bySurface) as SplitTarget };
}

function handleSplit(request: CliSplitRequest): CliSplitResult {
  const resolved = resolveTarget(request);
  if ("error" in resolved) {
    return { ok: false, reason: resolved.error, invalidParams: true };
  }

  const { workspaceId, paneId } = resolved.target;
  const focusNew = paneId === getWorkspaceFocusedPaneId(workspaceId);
  const created = splitPane(paneId, DIRECTION_MAP[request.direction], {
    workspaceId,
    focusNew,
  });
  if (!created) return { ok: false, reason: "split did not produce a pane" };

  return {
    ok: true,
    workspaceId,
    paneId: created.paneId,
    surfaceId: created.surfaceId,
  };
}

let started = false;

export function startCliSplitBridge(): void {
  if (started) return;
  if (typeof window === "undefined" || !window.app?.onCliSplit) return;
  started = true;
  window.app.onCliSplit((request) => {
    if (Date.now() >= request.deadline) {
      window.app.sendCliSplitResult({
        requestId: request.requestId,
        result: {
          ok: false,
          reason: "split request expired before the renderer handled it",
        },
      });
      return;
    }
    const result = handleSplit(request);
    window.app.sendCliSplitResult({ requestId: request.requestId, result });
  });
}
