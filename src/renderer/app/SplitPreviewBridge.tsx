import { useDndMonitor } from "@dnd-kit/core";
import { alpha, useTheme } from "@mui/material/styles";
import { useRef } from "react";
import { isBrowserSurface, type ScreenRect } from "../../shared/types";
import { findLeafPane, getActiveSurface } from "../components/Layout/pane-tree";
import { getActiveWorkspace, getState } from "../store/core";
import { getDragData, type SplitEdge } from "./dnd-types";
import { useSurfaceBodyGetter } from "./SurfaceBodyRegistry";

// Browser surfaces are native WebContentsViews that composite above the renderer
// DOM, so the DOM split preview is occluded by them. For panes whose active
// surface is a browser, this drives a top-most native overlay (positioned to
// match the pane's surface body) so the preview shows over the page. Terminal
// panes keep using the DOM preview.
function halfRect(el: HTMLElement, edge: SplitEdge, zoom: number): ScreenRect {
  const r = el.getBoundingClientRect();
  let { left, top, width, height } = r;
  if (edge === "right") {
    left = r.left + r.width / 2;
    width = r.width / 2;
  } else {
    top = r.top + r.height / 2;
    height = r.height / 2;
  }
  return {
    x: Math.round(left * zoom),
    y: Math.round(top * zoom),
    width: Math.round(width * zoom),
    height: Math.round(height * zoom),
  };
}

export function SplitPreviewBridge() {
  const theme = useTheme();
  const fill = alpha(theme.palette.primary.main, 0.25);
  const stroke = theme.palette.primary.main;
  const getSurfaceBody = useSurfaceBodyGetter();
  const lastKey = useRef<string>("");

  function send(rect: ScreenRect | null): void {
    const key = rect ? `${rect.x},${rect.y},${rect.width},${rect.height}` : "";
    if (key === lastKey.current) return;
    lastKey.current = key;
    window.app.setBrowserSplitPreview(rect, fill, stroke);
  }

  useDndMonitor({
    onDragOver(event) {
      const over = getDragData(event.over);
      if (over?.type !== "pane-split") {
        send(null);
        return;
      }
      const ws = getActiveWorkspace();
      const leaf = ws ? findLeafPane(ws.layout, over.paneId) : undefined;
      const surface = leaf ? getActiveSurface(leaf) : undefined;
      const el = getSurfaceBody(over.paneId);
      if (!surface || !isBrowserSurface(surface) || !el) {
        send(null);
        return;
      }
      send(halfRect(el, over.edge, getState().appearance.uiScale));
    },
    onDragEnd: () => send(null),
    onDragCancel: () => send(null),
  });

  return null;
}
