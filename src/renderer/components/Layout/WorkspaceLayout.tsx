import { memo, useCallback, useMemo, useRef } from "react";
import type { PaneNode } from "../../../shared/types";
import { resizeSplit } from "../../store";
import { MIN_PANE_SIZE_PX } from "./layout-constants";
import { computeLayout, resizeSiblings } from "./layout-math";
import { mapNode } from "./pane-tree";
import { ResizeHandle } from "./ResizeHandle";
import { TabbedPane } from "./TabbedPane";

interface Props {
  layout: PaneNode;
  containerSize: { width: number; height: number };
}

interface DragState {
  splitNodeId: string;
  childIndex: number;
  originalSizes: number[];
  currentSizes: number[];
  availableSpace: number;
}

function WorkspaceLayoutImpl({ layout, containerSize }: Props) {
  const leafRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const handleRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dragRef = useRef<DragState | null>(null);

  const bounds = useMemo(
    () => ({
      left: 0,
      top: 0,
      width: containerSize.width,
      height: containerSize.height,
    }),
    [containerSize.width, containerSize.height],
  );
  const { leaves, handles, splits } = computeLayout(layout, bounds);

  const onDragStart = useCallback(
    (splitNodeId: string, childIndex: number) => {
      const info = splits.get(splitNodeId);
      if (!info) return;
      dragRef.current = {
        splitNodeId,
        childIndex,
        originalSizes: [...info.sizes],
        currentSizes: [...info.sizes],
        availableSpace: info.availableSpace,
      };
    },
    [splits],
  );

  const onDragMove = useCallback(
    (splitNodeId: string, childIndex: number, totalDeltaPx: number) => {
      const drag = dragRef.current;
      if (
        !drag ||
        drag.splitNodeId !== splitNodeId ||
        drag.childIndex !== childIndex
      )
        return;

      const newSizes = resizeSiblings(
        drag.originalSizes,
        childIndex,
        totalDeltaPx / drag.availableSpace,
        MIN_PANE_SIZE_PX / drag.availableSpace,
      );
      drag.currentSizes = newSizes;

      const patched = mapNode(layout, splitNodeId, (node) => {
        if (node.kind !== "split") return node;
        return { ...node, sizes: newSizes };
      });

      const { leaves, handles } = computeLayout(patched, bounds);

      for (const { pane, rect } of leaves) {
        const el = leafRefs.current.get(pane.id);
        if (!el) continue;
        el.style.left = `${rect.left}px`;
        el.style.top = `${rect.top}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${rect.height}px`;
      }
      for (const handle of handles) {
        const el = handleRefs.current.get(handle.id);
        if (!el) continue;
        el.style.left = `${handle.hitRect.left}px`;
        el.style.top = `${handle.hitRect.top}px`;
        el.style.width = `${handle.hitRect.width}px`;
        el.style.height = `${handle.hitRect.height}px`;
      }
    },
    [layout, bounds],
  );

  const onDragEnd = useCallback(() => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    const changed = drag.currentSizes.some(
      (s, i) => s !== drag.originalSizes[i],
    );
    if (changed) {
      resizeSplit(drag.splitNodeId, drag.currentSizes);
    }
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {leaves.map(({ pane, rect }) => (
        <div
          key={pane.id}
          ref={(el) => {
            if (el) leafRefs.current.set(pane.id, el);
            else leafRefs.current.delete(pane.id);
          }}
          style={{
            position: "absolute",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            overflow: "hidden",
          }}
        >
          <TabbedPane pane={pane} />
        </div>
      ))}
      {handles.map((handle) => (
        <ResizeHandle
          key={handle.id}
          ref={(el) => {
            if (el) handleRefs.current.set(handle.id, el);
            else handleRefs.current.delete(handle.id);
          }}
          splitNodeId={handle.splitNodeId}
          childIndex={handle.childIndex}
          direction={handle.direction}
          hitRect={handle.hitRect}
          onDragStart={onDragStart}
          onDragMove={onDragMove}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

// Inactive workspaces stay mounted to preserve xterm state
// Memo stops unrelated store emissions from re-rendering them
export const WorkspaceLayout = memo(
  WorkspaceLayoutImpl,
  (prev, next) =>
    prev.layout === next.layout &&
    prev.containerSize.width === next.containerSize.width &&
    prev.containerSize.height === next.containerSize.height,
);
