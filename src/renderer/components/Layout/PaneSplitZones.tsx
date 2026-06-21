import { useDndMonitor, useDroppable } from "@dnd-kit/core";
import Box from "@mui/material/Box";
import { useState } from "react";
import { getDragData, type SplitEdge } from "../../app/dnd-types";
import {
  SPLIT_ZONE_GEOMETRY,
  SPLIT_ZONES_CONTAINER_SX,
} from "./TabbedPane.styles";

const EDGES: SplitEdge[] = ["right", "bottom"];

function SplitZone({ paneId, edge }: { paneId: string; edge: SplitEdge }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `pane-split:${edge}:${paneId}`,
    data: { type: "pane-split", paneId, edge },
  });
  const geometry = SPLIT_ZONE_GEOMETRY[edge];
  return (
    <>
      <Box ref={setNodeRef} sx={geometry.band} />
      {isOver && <Box sx={geometry.preview} />}
    </>
  );
}

export function PaneSplitZones({ paneId }: { paneId: string }) {
  const [isTabDragging, setIsTabDragging] = useState(false);
  useDndMonitor({
    onDragStart(event) {
      setIsTabDragging(getDragData(event.active)?.type === "tab");
    },
    onDragEnd: () => setIsTabDragging(false),
    onDragCancel: () => setIsTabDragging(false),
  });

  if (!isTabDragging) return null;

  return (
    <Box sx={SPLIT_ZONES_CONTAINER_SX}>
      {EDGES.map((edge) => (
        <SplitZone key={edge} paneId={paneId} edge={edge} />
      ))}
    </Box>
  );
}
