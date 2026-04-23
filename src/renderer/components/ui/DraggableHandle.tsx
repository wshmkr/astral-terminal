import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { type CSSProperties, forwardRef, type MouseEventHandler } from "react";

interface Props {
  orientation: "vertical" | "horizontal";
  onMouseDown: MouseEventHandler<HTMLDivElement>;
  style: CSSProperties;
}

const WRAPPER_SX = {
  position: "absolute",
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  "& > div": { backgroundColor: "custom.resizeHandleIdle" },
  "&:hover > div": { backgroundColor: "custom.resizeHandleHover" },
} as const;

export const DraggableHandle = forwardRef<HTMLDivElement, Props>(
  function DraggableHandle({ orientation, onMouseDown, style }, ref) {
    const isVertical = orientation === "vertical";
    return (
      <Box
        ref={ref}
        onMouseDown={onMouseDown}
        style={style}
        sx={
          [
            WRAPPER_SX,
            { cursor: isVertical ? "col-resize" : "row-resize" },
          ] as SxProps<Theme>
        }
      >
        <div
          style={{
            [isVertical ? "width" : "height"]: 1,
            [isVertical ? "height" : "width"]: "100%",
            transition: "background-color 0.15s",
          }}
        />
      </Box>
    );
  },
);
