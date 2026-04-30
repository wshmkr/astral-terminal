import type { Transform } from "@dnd-kit/utilities";
import { CSS } from "@dnd-kit/utilities";
import { type CSSProperties, useMemo } from "react";

interface SortableDragState {
  transform: Transform | null;
  transition: string | undefined;
  isDragging: boolean;
}

export function useSortableDragStyle({
  transform,
  transition,
  isDragging,
}: SortableDragState): CSSProperties {
  return useMemo(
    () => ({
      transform: CSS.Translate.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 1 : undefined,
    }),
    [transform, transition, isDragging],
  );
}
