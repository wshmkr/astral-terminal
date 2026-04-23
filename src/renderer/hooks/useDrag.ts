import { useCallback, useEffect, useRef } from "react";

const DRAG_OVERLAY_Z_INDEX = 99999;

interface UseDragOptions {
  cursor: string;
  onDragStart?: (e: React.MouseEvent) => void;
  onDrag: (e: MouseEvent) => void;
  onDragEnd?: () => void;
}

export function useDrag({
  cursor,
  onDragStart,
  onDrag,
  onDragEnd,
}: UseDragOptions) {
  const onDragStartRef = useRef(onDragStart);
  const onDragRef = useRef(onDrag);
  const onDragEndRef = useRef(onDragEnd);
  onDragStartRef.current = onDragStart;
  onDragRef.current = onDrag;
  onDragEndRef.current = onDragEnd;

  const teardownRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      teardownRef.current?.();
    },
    [],
  );

  return useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      teardownRef.current?.();
      onDragStartRef.current?.(e);
      const overlay = document.createElement("div");
      overlay.style.cssText = `position:fixed;inset:0;z-index:${DRAG_OVERLAY_Z_INDEX};cursor:${cursor}`;
      document.body.appendChild(overlay);

      let pendingEvent: MouseEvent | null = null;
      let rafId: number | null = null;
      const onMouseMove = (ev: MouseEvent) => {
        pendingEvent = ev;
        if (rafId !== null) return;
        rafId = requestAnimationFrame(() => {
          rafId = null;
          if (pendingEvent) {
            const ev = pendingEvent;
            pendingEvent = null;
            onDragRef.current(ev);
          }
        });
      };
      const teardown = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        if (rafId !== null) cancelAnimationFrame(rafId);
        overlay.remove();
        teardownRef.current = null;
        onDragEndRef.current?.();
      };
      const onMouseUp = () => teardown();
      teardownRef.current = teardown;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [cursor],
  );
}
