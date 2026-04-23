import { forwardRef, useRef } from "react";
import type { SplitDirection } from "../../../shared/types";
import { useDrag } from "../../hooks/useDrag";
import { DraggableHandle } from "../ui/DraggableHandle";
import type { Rect } from "./layout-math";

interface Props {
  splitNodeId: string;
  childIndex: number;
  direction: SplitDirection;
  hitRect: Rect;
  onDragStart: (splitNodeId: string, childIndex: number) => void;
  onDragMove: (
    splitNodeId: string,
    childIndex: number,
    totalDeltaPx: number,
  ) => void;
  onDragEnd: () => void;
}

export const ResizeHandle = forwardRef<HTMLDivElement, Props>(
  function ResizeHandle(
    {
      splitNodeId,
      childIndex,
      direction,
      hitRect,
      onDragStart,
      onDragMove,
      onDragEnd,
    },
    ref,
  ) {
    const isVertical = direction === "vertical";
    const startPos = useRef(0);

    const onMouseDown = useDrag({
      cursor: isVertical ? "col-resize" : "row-resize",
      onDragStart: (e) => {
        startPos.current = isVertical ? e.clientX : e.clientY;
        onDragStart(splitNodeId, childIndex);
      },
      onDrag: (ev) => {
        const pos = isVertical ? ev.clientX : ev.clientY;
        onDragMove(splitNodeId, childIndex, pos - startPos.current);
      },
      onDragEnd,
    });

    return (
      <DraggableHandle
        ref={ref}
        orientation={isVertical ? "vertical" : "horizontal"}
        onMouseDown={onMouseDown}
        style={{
          left: hitRect.left,
          top: hitRect.top,
          width: hitRect.width,
          height: hitRect.height,
        }}
      />
    );
  },
);
