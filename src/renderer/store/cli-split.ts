import type {
  CliSplitDirection,
  CliSplitRequest,
  CliSplitResult,
  SplitDirection,
} from "../../shared/types";
import { findLeafPane } from "../components/Layout/pane-tree";
import { getState } from "./core";
import { findPaneBySurfaceId, splitPane } from "./workspaces";

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

// Locate the workspace + pane to split. An explicit paneId/surfaceId is resolved across all
// workspaces; only when neither is supplied do we fall back to the active workspace's focused
// pane. Crucially, an explicit-but-unresolvable target is an error — never a silent fallback to
// whatever pane the user happens to be looking at.
function resolveTarget(request: CliSplitRequest): Resolution {
  if (request.paneId !== undefined || request.surfaceId !== undefined) {
    if (request.paneId !== undefined) {
      for (const ws of getState().workspaces) {
        if (findLeafPane(ws.layout, request.paneId)) {
          return { target: { workspaceId: ws.id, paneId: request.paneId } };
        }
      }
    }
    if (request.surfaceId !== undefined) {
      const found = findPaneBySurfaceId(request.surfaceId);
      if (found) return { target: found };
    }
    const requested = [
      request.paneId !== undefined ? `pane ${request.paneId}` : null,
      request.surfaceId !== undefined ? `surface ${request.surfaceId}` : null,
    ]
      .filter(Boolean)
      .join(" / ");
    return { error: `split target not found: ${requested}` };
  }

  const s = getState();
  if (s.activeWorkspaceId && s.focusedPaneId) {
    return {
      target: { workspaceId: s.activeWorkspaceId, paneId: s.focusedPaneId },
    };
  }
  return { error: "no pane to split" };
}

function handleSplit(request: CliSplitRequest): CliSplitResult {
  const resolved = resolveTarget(request);
  if ("error" in resolved) return { ok: false, reason: resolved.error };

  const { workspaceId, paneId } = resolved.target;
  // Move focus only when splitting the pane the user is actually in; otherwise leave their
  // focus (and keystrokes) untouched.
  const focusNew =
    workspaceId === getState().activeWorkspaceId &&
    paneId === getState().focusedPaneId;
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
    // The main process stops waiting at request.deadline. If we only unblocked after it, applying
    // the split would strand a pane the CLI never sees — and a retry would double-split — so no-op.
    if (Date.now() > request.deadline) {
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
