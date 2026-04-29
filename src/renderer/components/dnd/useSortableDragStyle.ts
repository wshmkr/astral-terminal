import type { Transform } from "@dnd-kit/utilities";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, useMemo } from "react";

interface SortableDragState {
  transform: Transform | null;
  transition: string | undefined;
  isDragging: boolean;
  axis?: "x" | "y";
}

export function useSortableDragStyle({
  transform,
  transition,
  isDragging,
  axis,
}: SortableDragState): CSSProperties {
  return useMemo(() => {
    let locked = transform;
    if (locked && axis === "x") locked = { ...locked, y: 0 };
    else if (locked && axis === "y") locked = { ...locked, x: 0 };
    return {
      transform: CSS.Transform.toString(locked),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : undefined,
    };
  }, [transform, transition, isDragging, axis]);
}
