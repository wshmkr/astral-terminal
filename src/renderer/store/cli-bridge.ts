import type { ActiveRef } from "../../shared/types";
import { findLeafPane } from "../components/Layout/pane-tree";
import { getActiveWorkspace, getState, subscribeWorkspaceStore } from "./core";

function readActiveRef(): ActiveRef {
  const s = getState();
  const ws = getActiveWorkspace();
  const paneId = s.focusedPaneId;
  const leaf = ws && paneId ? findLeafPane(ws.layout, paneId) : null;
  return {
    workspaceId: ws?.id ?? null,
    paneId: leaf?.id ?? null,
    surfaceId: leaf?.activeSurfaceId ?? null,
  };
}

function sameRef(a: ActiveRef, b: ActiveRef): boolean {
  return (
    a.workspaceId === b.workspaceId &&
    a.paneId === b.paneId &&
    a.surfaceId === b.surfaceId
  );
}

let started = false;

export function startCliActiveRefBridge(): void {
  if (started) return;
  if (typeof window === "undefined" || !window.app?.sendCliActiveRef) return;
  started = true;
  let last = readActiveRef();
  window.app.sendCliActiveRef(last);
  subscribeWorkspaceStore(() => {
    const next = readActiveRef();
    if (sameRef(last, next)) return;
    last = next;
    window.app.sendCliActiveRef(next);
  });
}
