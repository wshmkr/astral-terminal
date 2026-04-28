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
    const locked =
      transform && axis === "x"
        ? { ...transform, y: 0 }
        : transform && axis === "y"
          ? { ...transform, x: 0 }
          : transform;
    return {
      transform: CSS.Transform.toString(locked),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : undefined,
    };
  }, [transform, transition, isDragging, axis]);
}
