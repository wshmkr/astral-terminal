import Box from "@mui/material/Box";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useDrag } from "../../hooks/useDrag";

interface Props {
  scrollRef: React.RefObject<HTMLElement | null>;
}

const MIN_THUMB = 30;
const TRACK_WIDTH = 10;

const TRACK_SX = {
  position: "absolute",
  top: 0,
  right: 0,
  width: TRACK_WIDTH,
  height: "100%",
  zIndex: 5,
  pointerEvents: "none",
} as const;

export function OverlayScrollbar({ scrollRef }: Props) {
  const [metrics, setMetrics] = useState({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
  });
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      setMetrics({
        scrollTop: el.scrollTop,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
      });
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const mo = new MutationObserver(measure);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
      mo.disconnect();
    };
  }, [scrollRef]);

  const { scrollTop, scrollHeight, clientHeight } = metrics;
  const overflowing = scrollHeight > clientHeight + 0.5;

  const thumbHeight = overflowing
    ? Math.max(MIN_THUMB, (clientHeight / scrollHeight) * clientHeight)
    : 0;
  const maxThumbTop = clientHeight - thumbHeight;
  const maxScroll = scrollHeight - clientHeight;
  const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;

  const dragStateRef = useRef<{
    startY: number;
    startScrollTop: number;
  } | null>(null);

  const onThumbMouseDown = useDrag({
    cursor: "default",
    onDragStart: (e) => {
      e.stopPropagation();
      const el = scrollRef.current;
      if (!el) return;
      dragStateRef.current = {
        startY: e.clientY,
        startScrollTop: el.scrollTop,
      };
      setDragging(true);
    },
    onDrag: (e) => {
      const el = scrollRef.current;
      const state = dragStateRef.current;
      if (!el || !state) return;
      const localMax = el.clientHeight - thumbHeight;
      if (localMax <= 0) return;
      const deltaPx = e.clientY - state.startY;
      const deltaScroll =
        (deltaPx / localMax) * (el.scrollHeight - el.clientHeight);
      el.scrollTop = state.startScrollTop + deltaScroll;
    },
    onDragEnd: () => {
      dragStateRef.current = null;
      setDragging(false);
    },
  });

  if (!overflowing) return null;

  return (
    <Box data-scrollbar-visible sx={TRACK_SX}>
      <Box
        onMouseDown={onThumbMouseDown}
        sx={{
          position: "absolute",
          right: 0,
          width: TRACK_WIDTH,
          top: `${thumbTop}px`,
          height: `${thumbHeight}px`,
          backgroundColor: dragging
            ? "custom.scrollbarThumbHover"
            : "transparent",
          pointerEvents: "auto",
          cursor: "default",
          transition: "background-color 0.15s",
        }}
      />
    </Box>
  );
}
