import { useDndMonitor } from "@dnd-kit/core";
import { useEffect, useRef } from "react";
import {
  isBrowserSurface,
  type ScreenRect,
  SPLIT_PREVIEW_COLOR,
} from "../../shared/types";
import { findLeafPane, getActiveSurface } from "../components/Layout/pane-tree";
import { getActiveWorkspace, getState } from "../store/core";
import { getDragData, getDragPaneId, type SplitEdge } from "./dnd-types";
import { useSurfaceBodyGetter } from "./SurfaceBodyRegistry";

// Native browser views occlude the DOM drop hints, so mirror them in a native overlay
function paneRect(el: HTMLElement, zoom: number): ScreenRect {
  const r = el.getBoundingClientRect();
  return {
    x: Math.round(r.left * zoom),
    y: Math.round(r.top * zoom),
    width: Math.round(r.width * zoom),
    height: Math.round(r.height * zoom),
  };
}

export function SplitPreviewBridge() {
  const color = SPLIT_PREVIEW_COLOR;
  const getSurfaceBody = useSurfaceBodyGetter();
  const lastKey = useRef<string>("");

  function send(
    rect: ScreenRect | null,
    edge: SplitEdge | null,
    merge: boolean,
  ): void {
    const key = rect
      ? `${rect.x},${rect.y},${rect.width},${rect.height}|${edge ?? ""}|${merge}`
      : "";
    if (key === lastKey.current) return;
    lastKey.current = key;
    window.app.setBrowserSplitPreview(rect, edge, merge, color);
  }

  // A workspace switch mid-drag unmounts us before onDragEnd, so clear on unmount too
  useEffect(
    () => () => window.app.setBrowserSplitPreview(null, null, false, ""),
    [],
  );

  useDndMonitor({
    onDragOver(event) {
      const active = getDragData(event.active);
      if (active?.type !== "tab") return send(null, null, false);
      const over = getDragData(event.over);
      const targetPaneId = getDragPaneId(over);
      if (!targetPaneId) return send(null, null, false);

      const ws = getActiveWorkspace();
      const leaf = ws ? findLeafPane(ws.layout, targetPaneId) : undefined;
      const surface = leaf ? getActiveSurface(leaf) : undefined;
      const el = getSurfaceBody(targetPaneId);
      if (!surface || !isBrowserSurface(surface) || !el) {
        return send(null, null, false);
      }

      const edge = over?.type === "pane-split" ? over.edge : null;
      const merge = active.paneId !== targetPaneId;
      if (!edge && !merge) return send(null, null, false);
      send(paneRect(el, getState().appearance.uiScale), edge, merge);
    },
    onDragEnd: () => send(null, null, false),
    onDragCancel: () => send(null, null, false),
  });

  return null;
}
